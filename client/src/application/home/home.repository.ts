export type VisualQuotationSnapshot = {
  clientName: string | null;
  drawnUnitsCount: number;
};

export type QuotationSnapshot = {
  total: number;
};

export type HomeStorageSnapshot = {
  visualQuotation: VisualQuotationSnapshot | null;
  quotations: QuotationSnapshot[];
  quickQuotes: QuotationSnapshot[];
};

const STORAGE_KEYS = {
  VISUAL_QUOTATION: "visual-quotation-store-v1",
  VISUAL_QUOTATION_LEGACY: "visual-quotation-store",
  QUOTATIONS: "quotations_v1",
  MAYA_CLIENTS: "mayaClients",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number") return null;
  return Number.isFinite(value) ? value : null;
}

function resolveStorage(storage?: Storage | null): Storage | null {
  if (storage === null) return null;
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  try {
    const candidate = window.localStorage;
    candidate.getItem("__home_probe__");
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

function unwrapPersistedState(raw: unknown): unknown {
  if (!isRecord(raw)) return null;
  if (isRecord(raw.state)) return raw.state;
  return raw;
}

function parseVisualQuotation(raw: unknown): VisualQuotationSnapshot | null {
  const state = unwrapPersistedState(raw);
  if (!isRecord(state)) return null;

  const client = isRecord(state.client) ? state.client : null;
  const clientName = client ? toNonEmptyString(client.name) : null;

  const drawnUnits = Array.isArray(state.drawnUnits) ? state.drawnUnits : [];

  return {
    clientName,
    drawnUnitsCount: drawnUnits.length,
  };
}

function parseQuotations(raw: unknown): QuotationSnapshot[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const total = toFiniteNumber(entry.total);
      return total === null ? null : { total };
    })
    .filter((entry): entry is QuotationSnapshot => entry !== null);
}

function parseRupeeString(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/[₹,\s]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function parseQuickQuotes(raw: unknown): QuotationSnapshot[] {
  if (!isRecord(raw) || Array.isArray(raw)) return [];

  const results: QuotationSnapshot[] = [];
  for (const value of Object.values(raw)) {
    if (!isRecord(value)) continue;
    const total = parseRupeeString(value.grandTotal);
    if (total > 0) results.push({ total });
  }
  return results;
}

function readFirstAvailableJson(storage: Storage | null, keys: string[]): unknown {
  for (const key of keys) {
    const raw = readRaw(storage, key);
    const parsed = parseJson(raw);
    if (parsed !== null) return parsed;
  }
  return null;
}

export function readHomeStorageSnapshot(storage?: Storage | null): HomeStorageSnapshot {
  const resolvedStorage = resolveStorage(storage);
  const visualQuotationRaw = readFirstAvailableJson(resolvedStorage, [
    STORAGE_KEYS.VISUAL_QUOTATION,
    STORAGE_KEYS.VISUAL_QUOTATION_LEGACY,
  ]);

  const quotationsRaw = parseJson(readRaw(resolvedStorage, STORAGE_KEYS.QUOTATIONS));
  const mayaClientsRaw = parseJson(readRaw(resolvedStorage, STORAGE_KEYS.MAYA_CLIENTS));

  return {
    visualQuotation: parseVisualQuotation(visualQuotationRaw),
    quotations: parseQuotations(quotationsRaw),
    quickQuotes: parseQuickQuotes(mayaClientsRaw),
  };
}
