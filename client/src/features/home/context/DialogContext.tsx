/**
 * Dialog Context for Home Page
 * 
 * Centralizes dialog state management to eliminate prop drilling
 * and simplify home.tsx component structure.
 */

import { createContext, useContext, ReactNode } from 'react';
import { useUIStore } from '@/features/uiStore';

interface DialogState {
    // Preview dialog
    showPreviewDialog: boolean;
    isPreviewActive: boolean;

    // Manual panel dialog
    showManualPanelDialog: boolean;

    // Confirmation dialogs
    showClearConfirmDialog: boolean;
    showMaterialConfirmDialog: boolean;

    // Panel delete dialog
    panelToDelete: string | null;
}

interface DialogActions {
    // Preview actions
    openPreview: () => void;
    closePreview: () => void;
    setIsPreviewActive: (active: boolean) => void;

    // Manual panel actions
    openManualPanel: () => void;
    closeManualPanel: () => void;

    // Confirmation actions
    openClearConfirm: () => void;
    closeClearConfirm: () => void;
    openMaterialConfirm: () => void;
    closeMaterialConfirm: () => void;

    // Panel delete actions
    setPanelToDelete: (panelId: string | null) => void;
}

type DialogContextValue = DialogState & DialogActions;

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

/**
 * Dialog Provider Component
 * 
 * Wraps the home page and provides dialog state/actions to all children
 */
export function DialogProvider({ children }: { children: ReactNode }) {
    // Use existing UI store for dialog state
    const {
        showPreviewDialog,
        showManualPanelDialog,
        showClearConfirmDialog,
        showMaterialConfirmDialog,
        panelToDelete,
        isPreviewActive,
        openPreview,
        closePreview,
        openManualPanel,
        closeManualPanel,
        openClearConfirm,
        closeClearConfirm,
        openMaterialConfirm,
        closeMaterialConfirm,
        setPanelToDelete,
        setIsPreviewActive,
    } = useUIStore();

    const value: DialogContextValue = {
        // State
        showPreviewDialog,
        isPreviewActive,
        showManualPanelDialog,
        showClearConfirmDialog,
        showMaterialConfirmDialog,
        panelToDelete,

        // Actions
        openPreview,
        closePreview,
        setIsPreviewActive,
        openManualPanel,
        closeManualPanel,
        openClearConfirm,
        closeClearConfirm,
        openMaterialConfirm,
        closeMaterialConfirm,
        setPanelToDelete,
    };

    return (
        <DialogContext.Provider value={value}>
            {children}
        </DialogContext.Provider>
    );
}

/**
 * Hook to access dialog context
 * 
 * @throws Error if used outside DialogProvider
 */
export function useDialogContext() {
    const context = useContext(DialogContext);

    if (context === undefined) {
        throw new Error('useDialogContext must be used within DialogProvider');
    }

    return context;
}

/**
 * Convenience hooks for specific dialogs
 */
export function usePreviewDialog() {
    const { showPreviewDialog, isPreviewActive, openPreview, closePreview, setIsPreviewActive } = useDialogContext();
    return { showPreviewDialog, isPreviewActive, openPreview, closePreview, setIsPreviewActive };
}

export function useManualPanelDialog() {
    const { showManualPanelDialog, openManualPanel, closeManualPanel } = useDialogContext();
    return { showManualPanelDialog, openManualPanel, closeManualPanel };
}

export function useClearConfirmDialog() {
    const { showClearConfirmDialog, openClearConfirm, closeClearConfirm } = useDialogContext();
    return { showClearConfirmDialog, openClearConfirm, closeClearConfirm };
}

export function useMaterialConfirmDialog() {
    const { showMaterialConfirmDialog, openMaterialConfirm, closeMaterialConfirm } = useDialogContext();
    return { showMaterialConfirmDialog, openMaterialConfirm, closeMaterialConfirm };
}

export function usePanelDeleteDialog() {
    const { panelToDelete, setPanelToDelete } = useDialogContext();
    return { panelToDelete, setPanelToDelete };
}
