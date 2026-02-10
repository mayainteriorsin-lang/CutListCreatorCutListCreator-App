/**
 * MaterialConfirmDialogContainer
 * 
 * Container component that connects MaterialValidationDialog to stores.
 * Manages material validation dialog state.
 */

import { useUIStore } from '@/features/uiStore';
import MaterialValidationDialog from '@/components/cutlist-preview/MaterialValidationDialog';

interface MaterialConfirmDialogContainerProps {
    pendingMaterialAction: (() => void) | null;
    setPendingMaterialAction: (action: (() => void) | null) => void;
}

export function MaterialConfirmDialogContainer({
    pendingMaterialAction,
    setPendingMaterialAction,
}: MaterialConfirmDialogContainerProps) {
    const showMaterialConfirmDialog = useUIStore(s => s.showMaterialConfirmDialog);
    const openMaterialConfirm = useUIStore(s => s.openMaterialConfirm);
    const closeMaterialConfirm = useUIStore(s => s.closeMaterialConfirm);

    return (
        <MaterialValidationDialog
            open={showMaterialConfirmDialog}
            onOpenChange={(v: boolean) => (v ? openMaterialConfirm() : closeMaterialConfirm())}
            pendingMaterialAction={pendingMaterialAction}
            setPendingMaterialAction={setPendingMaterialAction}
        />
    );
}
