/**
 * Client Slice
 * Owns: Client information, quote metadata, CRM context, audit trail
 *
 * This slice manages:
 * - CRM context (leadId, quoteId)
 * - Quotation status and version
 * - Client info (name, phone, location)
 * - Quote meta (quoteNo, dateISO)
 * - Unit type selection
 * - Audit trail
 */

import type { StateCreator } from "zustand";
import type { ClientSliceState, ClientSliceActions } from "../../types/slices";
import type { ClientInfo, QuoteMeta, AuditEntry } from "../../types";

// Utility functions
function nowISO(): string {
  return new Date().toISOString();
}

function todayISODate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

/**
 * Initial state for client slice
 */
export const initialClientState: ClientSliceState = {
  leadId: null,
  quoteId: null,
  status: "DRAFT",
  version: 1,
  client: { name: "", phone: "", location: "" },
  meta: {
    quoteNo: `VQ-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
    dateISO: todayISODate(),
  },
  roomType: "Bedroom – Wardrobe",
  unitType: "wardrobe",
  customUnitTypes: [],
  audit: [],
  approvedSnapshot: undefined,
};

/**
 * Client slice creator
 * Note: This is a partial slice - will be combined with other slices
 */
export type ClientSlice = ClientSliceState & ClientSliceActions;

export const createClientSlice: StateCreator<
  ClientSlice,
  [],
  [],
  ClientSlice
> = (set, get) => ({
  ...initialClientState,

  // URL sync (CRM context) - simplified version
  // Full implementation with CRM calls will be in main store
  syncFromUrl: ({ leadId, quoteId }) => {
    set(() => ({
      leadId: leadId ?? null,
      quoteId: quoteId ?? null,
    }));
  },

  // Client/meta
  setClientField: (key: keyof ClientInfo, value: string) => {
    if (get().status === "APPROVED") return;
    set((s) => ({
      client: { ...s.client, [key]: value },
    }));
    get().addAudit("Client updated", `${key} = ${value}`);
  },

  setMetaField: (key: keyof QuoteMeta, value: string) => {
    if (get().status === "APPROVED") return;
    set((s) => ({
      meta: { ...s.meta, [key]: value },
    }));
    get().addAudit("Meta updated", `${key} = ${value}`);
  },

  // Unit type
  setRoomType: (value: string) => {
    if (get().status === "APPROVED") return;
    set(() => ({ roomType: value }));
    get().addAudit("Room type set", value);
  },

  setUnitType: (value: string) => {
    if (get().status === "APPROVED") return;
    set(() => ({ unitType: value }));
    get().addAudit("Unit type set", value);
  },

  addCustomUnitType: (value: string) => {
    const trimmed = value.trim().toLowerCase().replace(/\s+/g, "_");
    if (!trimmed) return;
    // Don't add if it's a default type or already exists
    const defaults = ["wardrobe", "kitchen", "tv_unit", "dresser", "other"];
    if (defaults.includes(trimmed)) return;
    const existing = get().customUnitTypes;
    if (existing.includes(trimmed)) return;
    set(() => ({ customUnitTypes: [...existing, trimmed] }));
    get().addAudit("Custom unit type added", trimmed);
  },

  // Versioning / approval
  bumpVersion: (reason?: string) => {
    if (get().status === "APPROVED") return;
    set((s) => ({ version: s.version + 1 }));
    if (reason) get().addAudit("Version bumped", reason);
  },

  approveQuote: () => {
    const s = get();
    const snapshot = JSON.stringify(
      {
        status: "APPROVED",
        version: s.version,
        client: s.client,
        meta: s.meta,
      },
      null,
      0
    );

    set(() => ({
      status: "APPROVED",
      approvedSnapshot: snapshot,
    }));

    get().addAudit("Quote approved", `version=${s.version}`);
  },

  unapproveToDraft: () => {
    set(() => ({
      status: "DRAFT",
      approvedSnapshot: undefined,
    }));
    get().addAudit("Unapproved to draft");
    get().bumpVersion("Unapproved to draft");
  },

  resetDraft: () => {
    const current = get();
    set(() => ({
      status: "DRAFT",
      approvedSnapshot: undefined,
      version: current.version + 1,
    }));
    get().addAudit("Duplicated as new draft", `from version=${current.version}`);
  },

  // Audit helpers
  addAudit: (action: string, details?: string) => {
    const entry: AuditEntry = {
      id: uid("AUD"),
      tsISO: nowISO(),
      action,
      details,
    };
    set((s) => ({ audit: [entry, ...s.audit].slice(0, 200) }));
  },
});
