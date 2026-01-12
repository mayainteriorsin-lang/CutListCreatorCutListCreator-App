import { create } from "zustand";

// PATCH 19: Centralized UI State Store

type CabinetConfigMode = "basic" | "advanced";

interface UIState {
  // Cabinet form
  cabinetConfigMode: CabinetConfigMode;
  panelsLinked: boolean;

  // Dialogs
  showPreviewDialog: boolean;
  showManualPanelDialog: boolean;
  showClearConfirmDialog: boolean;
  showMaterialConfirmDialog: boolean;
  panelToDelete: null | {
    sheetId: string;
    panelId: string;
  };

  // Preview state
  isPreviewActive: boolean;

  // Actions
  setCabinetConfigMode: (v: CabinetConfigMode) => void;
  setPanelsLinked: (v: boolean) => void;

  openPreview: () => void;
  closePreview: () => void;

  openManualPanel: () => void;
  closeManualPanel: () => void;

  openClearConfirm: () => void;
  closeClearConfirm: () => void;

  openMaterialConfirm: () => void;
  closeMaterialConfirm: () => void;

  setPanelToDelete: (v: UIState["panelToDelete"]) => void;

  setIsPreviewActive: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Defaults
  cabinetConfigMode: "advanced",
  panelsLinked: false,

  showPreviewDialog: false,
  showManualPanelDialog: false,
  showClearConfirmDialog: false,
  showMaterialConfirmDialog: false,
  panelToDelete: null,

  isPreviewActive: false,

  // Actions
  setCabinetConfigMode: (v) => set({ cabinetConfigMode: v }),
  setPanelsLinked: (v) => set({ panelsLinked: v }),

  openPreview: () => set({ showPreviewDialog: true }),
  closePreview: () => set({ showPreviewDialog: false }),

  openManualPanel: () => set({ showManualPanelDialog: true }),
  closeManualPanel: () => set({ showManualPanelDialog: false }),

  openClearConfirm: () => set({ showClearConfirmDialog: true }),
  closeClearConfirm: () => set({ showClearConfirmDialog: false }),

  openMaterialConfirm: () => set({ showMaterialConfirmDialog: true }),
  closeMaterialConfirm: () => set({ showMaterialConfirmDialog: false }),

  setPanelToDelete: (v) => set({ panelToDelete: v }),

  setIsPreviewActive: (v) => set({ isPreviewActive: v }),
}));
