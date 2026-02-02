
import { Cabinet, CuttingListSummary } from '@shared/schema';
import * as XLSX from 'xlsx';
import { generatePanels } from '@/lib/panels/generatePanels';
import { toastError } from '@/lib/errors/toastError';

export const exportProjectToExcel = (
    cabinets: Cabinet[],
    cuttingListSummary: CuttingListSummary,
    clientName: string,
    selectedRoom: string,
    customRoomName: string,
    toast: any
) => {
    try {
        const wb = XLSX.utils.book_new();
        const allPanels = cabinets.flatMap(generatePanels);

        // Sheet 1: Detailed Panel List
        // Group panels by laminate code and dimensions for cleaner spreadsheet
        const laminateGroups = new Map<string, Map<string, { panels: string[], count: number }>>();

        allPanels.forEach(panel => {
            const laminateKey = panel.laminateCode || 'None';
            const dimensionKey = `${panel.width}x${panel.height}`;

            const thickness = 18;

            if (!laminateGroups.has(laminateKey)) {
                laminateGroups.set(laminateKey, new Map());
            }

            const dimensions = laminateGroups.get(laminateKey)!;
            if (!dimensions.has(dimensionKey)) {
                dimensions.set(dimensionKey, { panels: [], count: 0 });
            }

            const data = dimensions.get(dimensionKey)!;
            data.panels.push(`${panel.name} (${thickness}mm)`);
            data.count++;
        });

        const panelData: any[] = [];

        laminateGroups.forEach((dimensions) => {
            dimensions.forEach((data, dimensionKey) => {
                const [width, height] = dimensionKey.split('x').map(Number);

                // Check if this is a top/bottom panel that needs dimension swapping
                const isTopBottomPanel = data.panels.some(panelName =>
                    panelName.includes('- Top') || panelName.includes('- Bottom')
                );

                // Back panels should never have their dimensions swapped
                const isBackPanel = data.panels.some(panelName =>
                    panelName.includes('- Back')
                );

                // Get cabinet info for Quick Shutter entries
                const relatedCabinets = data.panels.map(panelName =>
                    cabinets.find(c => {
                        // For Quick Shutter panels, match against cabinet name without qty
                        const cabinetNameWithoutQty = c.name.replace(/ \(Qty: \d+\)/, '');
                        return panelName.startsWith(c.name) || panelName.startsWith(cabinetNameWithoutQty);
                    })
                ).filter(Boolean);

                const quickShutterCabinet = relatedCabinets.find(cabinet => cabinet?.type === 'custom');

                // Determine plywood type - check if this is a back panel first
                let plywoodType = 'Apple Ply 16mm BWP';
                if (isBackPanel && relatedCabinets.length > 0) {
                    // Use back panel plywood brand directly
                    plywoodType = relatedCabinets[0]?.backPanelPlywoodBrand || 'Apple ply 6mm BWP';
                } else if (quickShutterCabinet) {
                    // Use shutter plywood brand for Quick Shutter entries
                    plywoodType = quickShutterCabinet.shutterPlywoodBrand || 'Apple Ply 16mm BWP';
                } else if (relatedCabinets.length > 0) {
                    // For standard cabinets, use the main plywood type
                    plywoodType = relatedCabinets[0]?.plywoodType || 'Apple Ply 16mm BWP';
                }

                // Force swap width/height logic for top/bottom panels unless they are back panels
                // This ensures grain direction is correct in the cutting plan
                const displayWidth = (isTopBottomPanel && !isBackPanel) ? height : width;
                const displayHeight = (isTopBottomPanel && !isBackPanel) ? width : height;

                const firstPanelName = (data.panels[0] || '').split(' (')[0];

                // Determine "Room Name" value
                let roomNameValue = selectedRoom === 'Custom' ? customRoomName : selectedRoom;
                if (!roomNameValue || roomNameValue === 'Select Room') {
                    roomNameValue = '';
                }

                const noteValue = firstPanelName;

                panelData.push({
                    'Length': displayWidth,
                    'Width': displayHeight,
                    'Qty': data.count,
                    'Note': noteValue,
                    'Material Name': plywoodType,
                    'Label': firstPanelName,
                    'Room': roomNameValue
                });
            });
        });

        // Add Manual Panels
        const manualSheet = XLSX.utils.json_to_sheet(panelData);
        XLSX.utils.book_append_sheet(wb, manualSheet, "Panel List");

        // Sheet 2: Cutting List Summary (Area)
        const summaryData = [
            // Plywood Summary
            ['Plywood Summary'],
            ['Type', 'Total Area (sqft)', 'Approx Sheets'],
            ...Object.entries(cuttingListSummary.plywood).map(([type, stats]: [string, any]) => [
                type,
                (stats.area / 144 / 10000 * 10.764).toFixed(2), // mm² to sqft
                stats.sheets
            ]),
            [],
            // Laminate Summary
            ['Laminate Summary'],
            ['Code', 'Total Area (sqft)'],
            ...Object.entries(cuttingListSummary.laminates).map(([code, stats]: [string, any]) => [
                code,
                (stats.area / 144 / 10000 * 10.764).toFixed(2)
            ])
        ];

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

        // Generate Filename
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const sanitizedClient = (clientName || 'Project').replace(/[^a-z0-9]/gi, '_');
        const sanitizedRoom = (selectedRoom === 'Custom' ? customRoomName : selectedRoom).replace(/[^a-z0-9]/gi, '_');

        const filename = `${sanitizedClient}_${sanitizedRoom}_${date}.xlsx`;

        XLSX.writeFile(wb, filename);

        toast({
            title: "Excel Export Successful",
            description: `Project exported as ${filename}`
        });

    } catch (error: any) {
        console.error('Export error:', error);
        toast({
            title: "Export Failed",
            description: error.message || "Could not export project",
            variant: "destructive"
        });
    }
};

export const exportGoogleSheetsFormat = (
    cabinets: Cabinet[],
    toast: any
) => {
    try {
        const projectName = "Maya Interiors Kitchen Project";
        const allPanels = cabinets.flatMap(generatePanels);

        if (allPanels.length === 0) {
            toast({
                title: "No panels to export",
                description: "Add some cabinets first"
            });
            return;
        }

        // Create Google Sheets compatible format with specific column layout
        const wsData = [
            ['Plywood Type', 'Laminate Code'], // A1, B1 headers
            [], // A2, B2 (empty row)
            ['', '', 'Height', 'Width', 'Qty', 'Laminate Code', 'Panel Type', 'Room Name'], // Headers starting from C3
            ...allPanels.map((panel: any) => [
                '', '', // Empty A and B columns
                panel.height,
                panel.width,
                panel.quantity || 1,
                panel.laminateCode || 'None',
                panel.type || 'Panel',
                panel.roomName || ''
            ])
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Set column widths for better formatting
        ws['!cols'] = [
            { wch: 15 }, // A
            { wch: 15 }, // B  
            { wch: 10 }, // C - Height
            { wch: 10 }, // D - Width
            { wch: 8 },  // E - Qty
            { wch: 15 }, // F - Laminate Code
            { wch: 12 }, // G - Panel Type
            { wch: 12 }  // H - Room Name
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Cutting List");

        XLSX.writeFile(wb, `${projectName.replace(/\s+/g, '_')}_GoogleSheets.xlsx`);

        toast({
            title: "Google Sheets Format Exported",
            description: "Cutting list exported in Google Sheets compatible format with proper column layout"
        });

    } catch (error) {
        console.error('Google Sheets export error:', error);
        toastError(error);
    }
};
