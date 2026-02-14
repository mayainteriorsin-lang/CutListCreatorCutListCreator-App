/**
 * Canvas Store Slices
 *
 * Slice creators for useDesignCanvasStore.
 * Each slice manages a focused subset of state and actions.
 */

// ========================= History Slice =========================
export {
    createCanvasHistorySlice,
    initialCanvasHistoryState,
} from './canvasHistorySlice';

export type {
    CanvasHistorySliceState,
    CanvasHistoryActions,
    CanvasHistorySlice,
} from './canvasHistorySlice';

// ========================= UI Slice =========================
export {
    createCanvasUISlice,
    initialCanvasUIState,
} from './canvasUISlice';

export type {
    CanvasUISliceState,
    CanvasUIActions,
    CanvasUISlice,
} from './canvasUISlice';

// ========================= Domain Slice =========================
export {
    createCanvasDomainSlice,
    initialCanvasDomainState,
} from './canvasDomainSlice';

export type {
    CanvasDomainSliceState,
    CanvasDomainActions,
    CanvasDomainSlice,
} from './canvasDomainSlice';
