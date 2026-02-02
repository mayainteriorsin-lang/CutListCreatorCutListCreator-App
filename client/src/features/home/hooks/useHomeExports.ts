
import { useState } from 'react';
import { Cabinet, CuttingListSummary, ManualPanel } from '@shared/schema';
import { exportProjectToExcel, exportGoogleSheetsFormat } from '../utils/excelHelpers';
import { printCuttingList } from '../utils/printHelpers';
import { generatePanels } from '@/lib/panels/generatePanels';
import { generateMaterialListCSV } from '@/lib/material-list-export';
import { runOptimizerEngine } from '@/lib/optimizer';
import { runOptimizerInWorker } from '@/lib/optimizer/runOptimizerWorker';
import { generateCutlistPDFForUpload, generatePDFFilename } from '@/lib/pdf';
import { apiRequest } from '@/lib/queryClient';
import { toastError } from '@/lib/errors/toastError';

export interface HomeExportsProps {
    cabinets: Cabinet[];
    cuttingListSummary: CuttingListSummary;
    liveMaterialSummary: any; // MaterialSummary type is complex, using any for now or import it
    clientName: string;
    selectedRoom: string;
    customRoomName: string;
    sheetWidth: number;
    sheetHeight: number;
    kerf: number;
    woodGrainsPreferences: Record<string, boolean>;
    manualPanels: ManualPanel[];
    deletedPreviewSheets: Set<string>;
    pdfOrientation: 'portrait' | 'landscape';
    apiGuard: (actionName: string) => boolean;
    woodGrainsReady: boolean;
    useWorker: boolean;
    toast: any;
}

export const useHomeExports = ({
    cabinets,
    cuttingListSummary,
    liveMaterialSummary,
    clientName,
    selectedRoom,
    customRoomName,
    sheetWidth,
    sheetHeight,
    kerf,
    woodGrainsPreferences,
    manualPanels,
    deletedPreviewSheets,
    pdfOrientation,
    apiGuard,
    woodGrainsReady,
    useWorker,
    toast
}: HomeExportsProps) => {
    const [isSaving, setIsSaving] = useState(false);

    const handlePrint = () => {
        printCuttingList(cabinets, cuttingListSummary, toast);
    };

    const handleExcelExport = () => {
        exportProjectToExcel(
            cabinets,
            cuttingListSummary,
            clientName,
            selectedRoom,
            customRoomName,
            toast
        );
    };

    const handleGoogleSheetsExport = () => {
        exportGoogleSheetsFormat(cabinets, toast);
    };

    const handleSaveToClientFolder = async () => {
        // Guard against offline backend
        if (!apiGuard("Save to folder")) return;

        // Prevent saving while wood grains preferences are loading
        if (!woodGrainsReady) {
            toast({
                variant: "destructive",
                title: "Please Wait",
                description: "Wood grain preferences are still loading. Please wait a moment before saving."
            });
            return;
        }

        // Prevent concurrent saves
        if (isSaving) {
            return;
        }

        if (!clientName || clientName.trim().length === 0) {
            toast({
                title: "Client Name Required",
                description: "Please enter a client name before saving.",
                variant: "destructive",
            });
            return;
        }

        if (cabinets.length === 0) {
            toast({
                title: "No Cabinets",
                description: "Add some cabinets before saving.",
                variant: "destructive",
            });
            return;
        }

        // Perform Save
        setIsSaving(true);

        try {
            // Generate material list CSV
            const materialListText = generateMaterialListCSV(
                liveMaterialSummary,
                clientName,
                selectedRoom === 'Custom' ? customRoomName : selectedRoom
            );

            // Use worker if available, fallback to main thread
            const optimizerParams = {
                cabinets,
                manualPanels,
                sheetWidth,
                sheetHeight,
                kerf,
                woodGrainsPreferences,
                generatePanels,
            };

            // Feature flag controls worker usage
            const optimizerResult = useWorker && window.Worker
                ? await runOptimizerInWorker(optimizerParams)
                : await runOptimizerEngine(optimizerParams);

            if (optimizerResult.error) {
                throw optimizerResult.error;
            }

            const { brandResults } = optimizerResult;

            const sheet = { w: sheetWidth, h: sheetHeight, kerf: kerf };

            // Use export orchestrator for PDF generation
            const pdfFilename = generatePDFFilename(clientName);
            const { pdf } = generateCutlistPDFForUpload({
                brandResults,
                sheet,
                cabinets,
                materialSummary: liveMaterialSummary,
                deletedSheets: deletedPreviewSheets,
                orientation: pdfOrientation,
                filename: pdfFilename,
                clientName,
            });

            // Convert PDF to base64
            const pdfBlob = pdf.output('blob');
            const pdfBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string).split(',')[1] || '');
                reader.readAsDataURL(pdfBlob);
            });

            // Convert material list to base64
            const materialListBlob = new Blob([materialListText], { type: 'text/plain' });
            const materialListBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string).split(',')[1] || '');
                reader.readAsDataURL(materialListBlob);
            });

            // Send to backend
            const response = await apiRequest(
                'POST',
                `/api/clients/${clientName}/files`,
                {
                    clientName,
                    pdf: {
                        filename: pdfFilename,
                        mimeType: 'application/pdf',
                        base64: pdfBase64,
                    },
                    materialList: {
                        filename: `${clientName}-material-list.txt`,
                        mimeType: 'text/plain',
                        base64: materialListBase64,
                    },
                }
            );

            const result = await response.json() as { clientSlug: string; success: boolean };

            toast({
                title: "Files Saved Successfully",
                description: `PDF and material list saved to folder: ${result.clientSlug}`,
            });
        } catch (error) {
            console.error('Save error:', error);
            toastError(error);
        } finally {
            setIsSaving(false);
        }
    };

    return {
        isSaving,
        handlePrint,
        handleExcelExport,
        handleGoogleSheetsExport,
        handleSaveToClientFolder
    };
};
