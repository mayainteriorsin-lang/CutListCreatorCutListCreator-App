import { EMPTY_SPREADSHEET_SNAPSHOT, type CabinetFormMemory, type ShutterFormMemory, type SpreadsheetSnapshot } from "./homePage.contract";

const STORAGE_KEYS = {
  CABINET_FORM_MEMORY: "cabinetFormMemory_v1",
  SHUTTER_FORM_MEMORY: "shutterFormMemory_v1",
  LAMINATE_TRACKING: "userSelectedLaminates_v1",
  PROMPTED_CLIENTS: "promptedClients",
  SPREADSHEET: "cutlist_spreadsheet_v1",
} as const;

function resolveStorage(storage?: Storage | null): Storage | null {
  if (storage === null) return null;
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  try {
    const candidate = window.localStorage;
    candidate.getItem("__homePage_probe__");
    return candidate;
  } catch {
    return null;
  }
}

function readRaw(storage: Storage | null, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function writeJson(storage: Storage | null, key: string, value: unknown): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore persistence failures
  }
}

function removeKey(storage: Storage | null, key: string): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // ignore persistence failures
  }
}

export function readCabinetFormMemory(storage?: Storage | null): Record<string, unknown> | null {
  const resolved = resolveStorage(storage);
  const parsed = parseJson(readRaw(resolved, STORAGE_KEYS.CABINET_FORM_MEMORY));
  return isRecord(parsed) ? { ...parsed } : null;
}

export function writeCabinetFormMemory(values: CabinetFormMemory, storage?: Storage | null): void {
  const resolved = resolveStorage(storage);
  writeJson(resolved, STORAGE_KEYS.CABINET_FORM_MEMORY, values);
}

export function readShutterFormMemory(storage?: Storage | null): Record<string, unknown> | null {
  const resolved = resolveStorage(storage);
  const parsed = parseJson(readRaw(resolved, STORAGE_KEYS.SHUTTER_FORM_MEMORY));
  return isRecord(parsed) ? { ...parsed } : null;
}

export function writeShutterFormMemory(values: ShutterFormMemory, storage?: Storage | null): void {
  const resolved = resolveStorage(storage);
  writeJson(resolved, STORAGE_KEYS.SHUTTER_FORM_MEMORY, values);
}

export function readLaminateTracking(storage?: Storage | null): string[] {
  const resolved = resolveStorage(storage);
  const parsed = parseJson(readRaw(resolved, STORAGE_KEYS.LAMINATE_TRACKING));
  return toStringArray(parsed);
}

export function writeLaminateTracking(values: string[], storage?: Storage | null): void {
  const resolved = resolveStorage(storage);
  writeJson(resolved, STORAGE_KEYS.LAMINATE_TRACKING, values);
}

export function clearLaminateTracking(storage?: Storage | null): void {
  const resolved = resolveStorage(storage);
  removeKey(resolved, STORAGE_KEYS.LAMINATE_TRACKING);
}

export function readPromptedClients(storage?: Storage | null): string[] {
  const resolved = resolveStorage(storage);
  const parsed = parseJson(readRaw(resolved, STORAGE_KEYS.PROMPTED_CLIENTS));
  return toStringArray(parsed);
}

export function readSpreadsheetSnapshot(storage?: Storage | null): SpreadsheetSnapshot {
  const resolved = resolveStorage(storage);
  const parsed = parseJson(readRaw(resolved, STORAGE_KEYS.SPREADSHEET));
  if (!Array.isArray(parsed)) return { ...EMPTY_SPREADSHEET_SNAPSHOT };
  return {
    hasRows: parsed.length > 0,
    rowCount: parsed.length,
  };
}
