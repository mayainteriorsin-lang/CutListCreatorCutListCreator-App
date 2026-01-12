/**
 * PATCH 24: Persist Module Index
 *
 * Central export for autosave and recovery utilities.
 */

export {
  saveAutosave,
  loadAutosave,
  clearAutosave,
  hasAutosave,
  type AutosavePayload,
} from "./autosave";

export { useAutosave } from "./useAutosave";
