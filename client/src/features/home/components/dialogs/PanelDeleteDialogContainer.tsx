/**
 * PanelDeleteDialogContainer
 * 
 * Container component that connects PanelDeleteDialog to stores.
 * Fully self-contained - accesses all state from stores.
 */

import { useUIStore } from '@/features/uiStore';
import PanelDeleteDialog from '@/components/cutlist-preview/PanelDeleteDialog';

export function PanelDeleteDialogContainer() {
    const panelToDelete = useUIStore(s => s.panelToDelete);
    const setPanelToDelete = useUIStore(s => s.setPanelToDelete);

    return (
        <PanelDeleteDialog
            panelToDelete={panelToDelete}
            setPanelToDelete={setPanelToDelete}
        />
    );
}
