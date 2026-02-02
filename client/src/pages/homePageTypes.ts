/**
 * Type definitions for the Home Page component
 */

/** Manual panel that can be added to optimization */
export interface ManualPanel {
    id: string;
    name: string;
    height: number;
    width: number;
    laminateCode: string;
    plywoodType: string;
    quantity: number;
    grainDirection: boolean;
    gaddi: boolean;
    targetSheet?: {
        brand: string;
        laminateCode: string;
        isBackPanel: boolean;
        sheetId: string;
    };
}

/** Form state for manual panel input */
export interface ManualPanelFormState {
    name: string;
    height: number | string;
    width: number | string;
    laminateCode: string;
    plywoodType: string;
    quantity: number;
    grainDirection: boolean;
    gaddi: boolean;
}

/** Colour frame form state */
export interface ColourFrameFormState {
    height: number;
    width: number;
    laminateCode: string;
    quantity: number;
    note: string;
    customLaminateCode: string;
    plywoodType: string;
    grainDirection: boolean;
}

/** Pending material action for validation dialog */
export interface PendingMaterialAction {
    type: 'cabinet' | 'shutter';
    payload: unknown;
    onConfirm: () => void;
    missingPanels: string[];
}
