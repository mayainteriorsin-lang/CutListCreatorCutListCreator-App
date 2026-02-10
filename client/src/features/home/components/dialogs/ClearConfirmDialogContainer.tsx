/**
 * ClearConfirmDialogContainer
 * 
 * Container component that connects ClearConfirmDialog to stores.
 * Manages dialog state and clear actions internally.
 */

import { useUIStore } from '@/features/uiStore';
import ClearConfirmDialog from '@/components/cutlist-preview/ClearConfirmDialog';

interface ClearConfirmDialogContainerProps {
    form: any;
    updateCabinets: (cabinets: any[]) => void;
    setManualPanels: (panels: any) => void;
    masterPlywoodBrand: string;
    masterLaminateCode: string;
    onClearAutosave: () => void;
}

export function ClearConfirmDialogContainer({
    form,
    updateCabinets,
    setManualPanels,
    masterPlywoodBrand,
    masterLaminateCode,
    onClearAutosave,
}: ClearConfirmDialogContainerProps) {
    const showClearConfirmDialog = useUIStore(s => s.showClearConfirmDialog);
    const openClearConfirm = useUIStore(s => s.openClearConfirm);
    const closeClearConfirm = useUIStore(s => s.closeClearConfirm);
    const closePreview = useUIStore(s => s.closePreview);
    const setIsPreviewActive = useUIStore(s => s.setIsPreviewActive);

    return (
        <ClearConfirmDialog
            open={showClearConfirmDialog}
            onOpenChange={(v: boolean) => (v ? openClearConfirm() : closeClearConfirm())}
            form={form}
            updateCabinets={updateCabinets}
            setManualPanels={setManualPanels}
            closePreview={closePreview}
            setIsPreviewActive={setIsPreviewActive}
            masterPlywoodBrand={masterPlywoodBrand}
            masterLaminateCode={masterLaminateCode}
            onClearAutosave={onClearAutosave}
        />
    );
}
