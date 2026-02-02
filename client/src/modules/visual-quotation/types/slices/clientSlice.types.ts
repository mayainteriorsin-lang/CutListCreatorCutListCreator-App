/**
 * Client Slice State Types
 * Owns: Client information, quote metadata, CRM context
 */

import type { VQStatus, UnitType } from "../core";
import type { ClientInfo, QuoteMeta, AuditEntry } from "../quotation";

/**
 * ClientSliceState
 * Responsible for client/customer data and quotation identity
 */
export interface ClientSliceState {
  /* CRM context */
  leadId: string | null;
  quoteId: string | null;

  /* Quotation core */
  status: VQStatus;
  version: number;

  /* Client info */
  client: ClientInfo;
  meta: QuoteMeta;

  /* Unit type selection */
  roomType: string;
  unitType: UnitType;
  customUnitTypes: string[];

  /* Audit trail */
  audit: AuditEntry[];
  approvedSnapshot?: string;
}

/**
 * ClientSliceActions
 * Actions owned by client slice
 */
export interface ClientSliceActions {
  // URL sync (CRM context)
  syncFromUrl: (input: { leadId?: string | null; quoteId?: string | null }) => void;

  // Client/meta
  setClientField: (key: keyof ClientInfo, value: string) => void;
  setMetaField: (key: keyof QuoteMeta, value: string) => void;

  // Unit type
  setRoomType: (value: string) => void;
  setUnitType: (value: UnitType) => void;
  addCustomUnitType: (value: string) => void;

  // Versioning / approval
  bumpVersion: (reason?: string) => void;
  approveQuote: () => void;
  unapproveToDraft: () => void;
  resetDraft: () => void;

  // Audit helpers
  addAudit: (action: string, details?: string) => void;
}

export type ClientSlice = ClientSliceState & ClientSliceActions;
