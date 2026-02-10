/**
 * PreviewDialogContainer
 * 
 * Container component that connects PreviewDialog to stores and hooks.
 * Eliminates prop drilling by accessing data directly from stores.
 */

import { useUIStore } from '@/features/uiStore';
import { usePreviewStore } from '@/features/preview';
import { useOptimization } from '@/features/home/hooks/useOptimization';
import PreviewDialog from '@/components/cutlist-preview/PreviewDialog';
import { useToast } from '@/hooks/use-toast';
import { Cabinet } from '@shared/schema';

interface PreviewDialogContainerProps {
    cabinets: Cabinet[];
    manualPanels: any[];
    sheetWidth: number;
    sheetHeight: number;
    kerf: number;
    clientName: string;
    colourFrameEnabled: boolean;
    colourFrameForm: any;
    woodGrainsPreferences: any;
}

export function PreviewDialogContainer({
    cabinets,
    manualPanels,
    sheetWidth,
    sheetHeight,
    kerf,
    clientName,
    colourFrameEnabled,
    colourFrameForm,
    woodGrainsPreferences,
}: PreviewDialogContainerProps) {
    const { toast } = useToast();

    const showPreviewDialog = useUIStore(s => s.showPreviewDialog);
    const openPreview = useUIStore(s => s.openPreview);
    const closePreview = useUIStore(s => s.closePreview);

    const deletedPreviewSheets = usePreviewStore(s => s.deletedSheets);
    const deletedPreviewPanels = usePreviewStore(s => s.deletedPanels);

    const { previewBrandResults, liveMaterialSummary } = useOptimization({
        cabinets,
        manualPanels,
        sheetWidth,
        sheetHeight,
        kerf,
        woodGrainsPreferences,
        showPreviewDialog,
        isPreviewActive: showPreviewDialog,
        deletedPreviewSheets,
        useWorkerFeatureFlag: true,
    });

    return (
        <PreviewDialog
            open={showPreviewDialog}
            onOpenChange={(v: boolean) => (v ? openPreview() : closePreview())}
            cabinets={cabinets}
            brandResults={previewBrandResults}
            deletedPreviewSheets={deletedPreviewSheets}
            deletedPreviewPanels={deletedPreviewPanels}
            woodGrainsReady={true}
            sheetWidth={sheetWidth}
            sheetHeight={sheetHeight}
            kerf={kerf}
            pdfOrientation="portrait"
            clientName={clientName}
            liveMaterialSummary={liveMaterialSummary}
            colourFrameEnabled={colourFrameEnabled}
            colourFrameForm={colourFrameForm}
            manualPanels={manualPanels}
        />
    );
}
