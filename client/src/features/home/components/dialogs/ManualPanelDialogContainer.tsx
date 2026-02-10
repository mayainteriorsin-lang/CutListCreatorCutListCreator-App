/**
 * ManualPanelDialogContainer
 * 
 * Container component that connects ManualPanelDialog to stores.
 * Manages sheet context state internally.
 */

import { useState } from 'react';
import { useUIStore } from '@/features/uiStore';
import { usePreviewStore } from '@/features/preview';
import ManualPanelDialog from '@/components/cutlist-preview/ManualPanelDialog';

interface ManualPanelDialogContainerProps {
    manualPanelForm: any;
    setManualPanelForm: (form: any) => void;
    globalPlywoodBrandMemory: any[];
    laminateCodes: any[];
    woodGrainsPreferences: any;
    setManualPanels: (panels: any) => void;
}

export function ManualPanelDialogContainer({
    manualPanelForm,
    setManualPanelForm,
    globalPlywoodBrandMemory,
    laminateCodes,
    woodGrainsPreferences,
    setManualPanels,
}: ManualPanelDialogContainerProps) {
    const showManualPanelDialog = useUIStore(s => s.showManualPanelDialog);
    const openManualPanel = useUIStore(s => s.openManualPanel);
    const closeManualPanel = useUIStore(s => s.closeManualPanel);

    const selectedSheetContext = usePreviewStore(s => s.selectedSheetContext);
    const setSelectedSheetContext = usePreviewStore(s => s.setSelectedSheetContext);

    return (
        <ManualPanelDialog
            open={showManualPanelDialog}
            onOpenChange={(v: boolean) => (v ? openManualPanel() : closeManualPanel())}
            manualPanelForm={manualPanelForm}
            setManualPanelForm={setManualPanelForm}
            globalPlywoodBrandMemory={globalPlywoodBrandMemory}
            laminateCodes={laminateCodes}
            woodGrainsPreferences={woodGrainsPreferences}
            selectedSheetContext={selectedSheetContext}
            setSelectedSheetContext={setSelectedSheetContext}
            setManualPanels={setManualPanels}
        />
    );
}
