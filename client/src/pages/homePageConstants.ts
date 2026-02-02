/**
 * Constants for the Home Page component
 */

/** Default plywood brand used across the application */
export const DEFAULT_PLYWOOD_BRAND = 'Apple Ply 16mm BWP';

/** Initial state for manual panel form */
export const INITIAL_MANUAL_PANEL_FORM = {
    name: 'Manual Panel',
    height: '' as number | string,
    width: '' as number | string,
    laminateCode: '',
    plywoodType: DEFAULT_PLYWOOD_BRAND,
    quantity: 1,
    grainDirection: false,
    gaddi: true
} as const;

/** Initial state for colour frame form */
export const INITIAL_COLOUR_FRAME_FORM = {
    height: 2400,
    width: 80,
    laminateCode: '',
    quantity: 1,
    note: '',
    customLaminateCode: '',
    plywoodType: DEFAULT_PLYWOOD_BRAND,
    grainDirection: false
};

/** Initial state for material summary */
export const INITIAL_MATERIAL_SUMMARY = {
    plywood: {},
    laminates: {},
    totalPlywoodSheets: 0
};
