/**
 * CRM Module - State & Persistence Ownership (PHASE 4)
 *
 * OWNERSHIP MODEL:
 * - State Owner: This module (storage.ts) via in-memory cache + localStorage
 * - Write Owner: This module - all mutations flow through exported functions
 * - Persistence Adapter: writeJson() for localStorage, requestAsync() for API
 * - Fallback Behavior: localStorage-first, API sync is async fire-and-forget
 *
 * SOURCE-OF-TRUTH POLICY:
 * - Authenticated mode: Server is authoritative for cross-device sync
 * - localStorage acts as optimistic cache for immediate UI response
 * - Conflict resolution: Server response merges into local state (mergeLead)
 * - Offline: localStorage continues to work, syncs when online
 *
 * WRITE PATH (single canonical entrypoint per entity):
 * - Leads: upsertLead() -> writeJson() -> requestAsync() [async]
 * - Activity: logActivity() -> writeJson() -> requestAsync() [async]
 * - Quotes: upsertQuoteSummary() -> writeJson() -> requestAsync() [async]
 * - Appointments: upsertAppointment() -> writeJson() [local-only currently]
 *
 * READ PATH:
 * - getLeads() returns local immediately, triggers background API sync
 * - TTL-based sync prevents excessive API calls (15-30s)
 */

import type { ActivityEvent, ActivityType, Appointment, AppointmentStatus, LeadRecord, LeadStatus, QuoteStatus, QuoteSummary } from "./types";
import { generateUUID } from "@/lib/uuid";
import {
  encryptedRead,
  encryptedWrite,
  isEncryptionReady,
  initializeEncryption,
  migrateToEncrypted,
  needsMigration,
} from "./crypto";

const API_BASE = "/api/crm";
const STORAGE_KEYS = {
  leads: "crm:leads",
  activity: "crm:activity",
  quotes: "crm:quotes",
  appointments: "crm:appointments",
} as const;

// Public lead index - NOT encrypted, used for appointment page
// Only stores leadId -> { name, mobile } for customer-facing pages
const PUBLIC_LEAD_INDEX_KEY = "crm:public-lead-index";

interface PublicLeadInfo {
  name: string;
  mobile: string;
}

function getPublicLeadIndex(): Record<string, PublicLeadInfo> {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(PUBLIC_LEAD_INDEX_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function updatePublicLeadIndex(leadId: string, info: PublicLeadInfo): void {
  if (!isBrowser()) return;
  const index = getPublicLeadIndex();
  index[leadId] = info;
  localStorage.setItem(PUBLIC_LEAD_INDEX_KEY, JSON.stringify(index));
}

function removeFromPublicLeadIndex(leadId: string): void {
  if (!isBrowser()) return;
  const index = getPublicLeadIndex();
  delete index[leadId];
  localStorage.setItem(PUBLIC_LEAD_INDEX_KEY, JSON.stringify(index));
}

// Get public lead info (accessible without PIN) for appointment page
export function getPublicLeadInfo(leadId: string): PublicLeadInfo | null {
  const index = getPublicLeadIndex();
  return index[leadId] || null;
}

const CRM_UPDATE_EVENT = "crm:update";

const LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "SITE_VISIT",
  "DESIGN_SHARED",
  "NEGOTIATION",
  "CONFIRMED",
  "LOST",
];

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function notifyUpdate() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(CRM_UPDATE_EVENT));
}

export function subscribeCrmUpdates(handler: () => void): () => void {
  if (!isBrowser()) return () => undefined;
  window.addEventListener(CRM_UPDATE_EVENT, handler);
  return () => window.removeEventListener(CRM_UPDATE_EVENT, handler);
}

function nowISO(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${generateUUID()}`;
}

// In-memory cache for CRM data (decrypted)
const dataCache = new Map<string, unknown>();
let cacheInitialized = false;

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;

  // Use cache if encryption is ready and cache is initialized
  if (isEncryptionReady() && cacheInitialized && dataCache.has(key)) {
    return dataCache.get(key) as T;
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!isBrowser()) return;

  // Update cache
  dataCache.set(key, value);

  // Write encrypted if encryption is ready
  if (isEncryptionReady()) {
    void encryptedWrite(key, value);
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

// Initialize cache from encrypted storage (call after PIN unlock)
export async function initializeCrmData(pin: string): Promise<void> {
  const success = await initializeEncryption(pin);
  if (!success) {
    console.warn("Encryption not available, using plain storage");
    cacheInitialized = true;
    return;
  }

  // Migrate existing data if needed
  if (needsMigration()) {
    await migrateToEncrypted();
  }

  // Load all CRM data into cache
  const keys = Object.values(STORAGE_KEYS);
  for (const key of keys) {
    const data = await encryptedRead(key, null);
    if (data !== null) {
      dataCache.set(key, data);
    }
  }

  // Populate public lead index from decrypted leads (for appointment page)
  const leads = dataCache.get(STORAGE_KEYS.leads) as LeadRecord[] | undefined;
  if (leads && Array.isArray(leads)) {
    for (const lead of leads) {
      updatePublicLeadIndex(lead.id, { name: lead.name, mobile: lead.mobile });
    }
  }

  cacheInitialized = true;
  notifyUpdate();
}

// Clear cache on lock
export function clearCrmCache(): void {
  dataCache.clear();
  cacheInitialized = false;
}

function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as string[]).includes(value);
}

function unwrapOk<T>(payload: any): T | null {
  if (!payload || typeof payload !== "object") {
    return payload as T;
  }
  if ("ok" in payload) {
    return payload.ok ? (payload.data as T) : null;
  }
  return payload as T;
}

async function requestAsync<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown
): Promise<T | null> {
  if (!isBrowser() || typeof fetch === "undefined") return null;

  try {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) return null;

    const text = await res.text();
    if (!text) return null;
    const parsed = JSON.parse(text);
    return unwrapOk<T>(parsed);
  } catch {
    return null;
  }
}

type LegacyLead = {
  leadId?: string;
  name?: string;
  mobile?: string;
  source?: string;
  createdAt?: string;
  status?: string;
};

type LegacyCustomer = { customerId: string; leadId: string };
type LegacyProject = { projectId: string; customerId: string };

function migrateLegacyLeadsIfNeeded(current: LeadRecord[]): LeadRecord[] {
  if (!isBrowser()) return current;
  if (current.length > 0) return current;

  const legacyLeads = readJson<LegacyLead[]>("leads", []);
  if (legacyLeads.length === 0) return current;

  const legacyCustomers = readJson<LegacyCustomer[]>("customers", []);
  const legacyProjects = readJson<LegacyProject[]>("projects", []);

  const migrated: LeadRecord[] = legacyLeads.map((lead) => {
    const id = lead.leadId ?? uid("lead");
    const customer = legacyCustomers.find((c) => c.leadId === id);
    const project = customer
      ? legacyProjects.find((p) => p.customerId === customer.customerId)
      : undefined;

    const createdAt = lead.createdAt ?? nowISO();
    const status: LeadStatus = isLeadStatus(lead.status) ? lead.status : "NEW";

    return {
      id,
      name: lead.name ?? "Unknown",
      mobile: lead.mobile ?? "",
      source: lead.source ?? "legacy",
      status,
      createdAt,
      updatedAt: createdAt,
      customerId: customer?.customerId,
      projectId: project?.projectId,
    };
  });

  writeJson(STORAGE_KEYS.leads, migrated);
  return migrated;
}

function readLeads(): LeadRecord[] {
  const current = readJson<LeadRecord[]>(STORAGE_KEYS.leads, []);
  return migrateLegacyLeadsIfNeeded(current);
}

function readActivity(): ActivityEvent[] {
  return readJson<ActivityEvent[]>(STORAGE_KEYS.activity, []);
}

function readQuotes(): QuoteSummary[] {
  return readJson<QuoteSummary[]>(STORAGE_KEYS.quotes, []);
}

let leadsSyncInFlight = false;
let leadsLastSyncAt = 0;
const activitySyncInFlight = new Set<string>();
const activityLastSync = new Map<string, number>();
const quoteSyncInFlight = new Set<string>();
const quoteLastSync = new Map<string, number>();

const LEADS_SYNC_TTL_MS = 15000;
const ACTIVITY_SYNC_TTL_MS = 15000;
const QUOTE_SYNC_TTL_MS = 30000;

function mergeLead(remote: Partial<LeadRecord>, fallback: LeadRecord): LeadRecord {
  const status = isLeadStatus(remote.status) ? remote.status : fallback.status;
  return {
    ...fallback,
    ...remote,
    status,
    source: remote.source ?? fallback.source ?? "website",
    createdAt: remote.createdAt ?? fallback.createdAt,
    updatedAt: remote.updatedAt ?? fallback.updatedAt,
    quoteId: remote.quoteId ?? fallback.quoteId,
    customerId: remote.customerId ?? fallback.customerId,
    projectId: remote.projectId ?? fallback.projectId,
    email: remote.email ?? fallback.email ?? "",
    location: remote.location ?? fallback.location ?? "",
    latitude: remote.latitude ?? fallback.latitude,
    longitude: remote.longitude ?? fallback.longitude,
    nextFollowUpDate: remote.nextFollowUpDate ?? fallback.nextFollowUpDate,
    followUpDone: remote.followUpDone ?? fallback.followUpDone,
  };
}

function upsertLeadLocal(lead: LeadRecord): LeadRecord {
  const leads = readLeads();
  const index = leads.findIndex((l) => l.id === lead.id);
  const normalized: LeadRecord = {
    ...lead,
    status: lead.status ?? "NEW",
    source: lead.source || "website",
    createdAt: lead.createdAt || nowISO(),
    updatedAt: lead.updatedAt || nowISO(),
    email: lead.email ?? "",
    location: lead.location ?? "",
    latitude: lead.latitude ?? undefined,
    longitude: lead.longitude ?? undefined,
  };

  if (index >= 0) {
    leads[index] = normalized;
  } else {
    leads.push(normalized);
  }

  writeJson(STORAGE_KEYS.leads, leads);
  return normalized;
}

export function getLeads(options?: { skipRemote?: boolean }): LeadRecord[] {
  const localLeads = readLeads();
  const now = Date.now();

  if (
    !options?.skipRemote &&
    !leadsSyncInFlight &&
    now - leadsLastSyncAt > LEADS_SYNC_TTL_MS
  ) {
    leadsSyncInFlight = true;
    leadsLastSyncAt = now;
    void requestAsync<LeadRecord[]>("GET", `${API_BASE}/leads`)
      .then((remote) => {
        if (remote && Array.isArray(remote)) {
          const currentLocal = readLeads();
          const merged = remote.map((lead) => {
            const fallback =
              currentLocal.find((l) => l.id === lead.id) ??
              ({
                id: lead.id,
                name: lead.name,
                mobile: lead.mobile,
                source: lead.source ?? "website",
                status: isLeadStatus(lead.status) ? lead.status : "NEW",
                createdAt: lead.createdAt ?? nowISO(),
                updatedAt: lead.updatedAt ?? nowISO(),
              } as LeadRecord);
            return mergeLead(lead, fallback);
          });

          const extraLocal = currentLocal.filter((l) => !remote.find((r) => r.id === l.id));
          const next = [...merged, ...extraLocal].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          writeJson(STORAGE_KEYS.leads, next);
          notifyUpdate();
        }
      })
      .finally(() => {
        leadsSyncInFlight = false;
      });
  }

  return [...localLeads].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function upsertLead(lead: LeadRecord): LeadRecord {
  const base: LeadRecord = {
    ...lead,
    status: lead.status ?? "NEW",
    source: lead.source || "website",
    createdAt: lead.createdAt || nowISO(),
    updatedAt: lead.updatedAt || nowISO(),
    email: lead.email ?? "",
    location: lead.location ?? "",
    latitude: lead.latitude ?? undefined,
    longitude: lead.longitude ?? undefined,
  };

  const local = upsertLeadLocal(base);

  // Update public lead index (for appointment page access without PIN)
  updatePublicLeadIndex(base.id, { name: base.name, mobile: base.mobile });

  notifyUpdate();
  void requestAsync<LeadRecord>("POST", `${API_BASE}/leads`, base).then((remote) => {
    if (remote) {
      const finalLead = mergeLead(remote, base);
      upsertLeadLocal(finalLead);
      notifyUpdate();
    }
  });

  return local;
}

export function logActivity(input: {
  leadId: string;
  type: ActivityType;
  message: string;
  meta?: Record<string, unknown>;
}): ActivityEvent {
  const events = readActivity();
  const draft: ActivityEvent = {
    id: uid("act"),
    leadId: input.leadId,
    type: input.type,
    message: input.message,
    at: nowISO(),
    meta: input.meta,
  };

  // PATCH 50: Reduced from 2000 to 500 to prevent localStorage overflow (~5MB limit)
  const MAX_ACTIVITY_EVENTS = 500;
  const next = [draft, ...events].slice(0, MAX_ACTIVITY_EVENTS);
  writeJson(STORAGE_KEYS.activity, next);
  notifyUpdate();

  void requestAsync<ActivityEvent>("POST", `${API_BASE}/activities`, {
    id: draft.id,
    leadId: input.leadId,
    type: input.type,
    message: input.message,
    meta: input.meta,
  }).then((remote) => {
    if (!remote) return;
    const updatedEvent: ActivityEvent = {
      ...draft,
      ...remote,
      at: (remote as ActivityEvent).at || draft.at,
      meta: remote.meta ?? draft.meta,
    };

    const current = readActivity();
    const existingIndex = current.findIndex((e) => e.id === draft.id);
    if (existingIndex >= 0) {
      current[existingIndex] = updatedEvent;
    } else {
      current.unshift(updatedEvent);
    }

    writeJson(STORAGE_KEYS.activity, current.slice(0, MAX_ACTIVITY_EVENTS));
    notifyUpdate();
  });

  return draft;
}

export function getActivity(leadId: string, options?: { skipRemote?: boolean }): ActivityEvent[] {
  const local = readActivity();
  const now = Date.now();
  const lastSync = activityLastSync.get(leadId) ?? 0;
  if (
    !options?.skipRemote &&
    !activitySyncInFlight.has(leadId) &&
    now - lastSync > ACTIVITY_SYNC_TTL_MS
  ) {
    activitySyncInFlight.add(leadId);
    activityLastSync.set(leadId, now);
    void requestAsync<ActivityEvent[]>(
      "GET",
      `${API_BASE}/activities/${encodeURIComponent(leadId)}`
    )
      .then((remote) => {
        if (remote && Array.isArray(remote)) {
          const others = readActivity().filter((e) => e.leadId !== leadId);
          const next = [...remote, ...others];
          writeJson(STORAGE_KEYS.activity, next);
          notifyUpdate();
        }
      })
      .finally(() => {
        activitySyncInFlight.delete(leadId);
      });
  }

  const events = local.filter((e) => e.leadId === leadId);
  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function updateLeadStatus(leadId: string, status: LeadStatus): LeadRecord | undefined {
  const leads = readLeads();
  const index = leads.findIndex((l) => l.id === leadId);
  const previous = index >= 0 ? leads[index] : undefined;
  if (previous && previous.status === status) return previous;

  const base: LeadRecord =
    previous ??
    ({
      id: leadId,
      name: "",
      mobile: "",
      source: "website",
      status,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      email: "",
      location: "",
      latitude: undefined,
      longitude: undefined,
    } as LeadRecord);

  const finalLead = { ...base, status, updatedAt: nowISO() };

  if (index >= 0) {
    leads[index] = finalLead;
  } else {
    leads.push(finalLead);
  }
  writeJson(STORAGE_KEYS.leads, leads);
  notifyUpdate();

  void requestAsync<LeadRecord>(
    "PATCH",
    `${API_BASE}/leads/${encodeURIComponent(leadId)}/status`,
    { status }
  ).then((remote) => {
    if (!remote) return;
    const merged = mergeLead(remote, finalLead);
    const current = readLeads();
    const idx = current.findIndex((l) => l.id === leadId);
    if (idx >= 0) {
      current[idx] = merged;
    } else {
      current.push(merged);
    }
    writeJson(STORAGE_KEYS.leads, current);
    notifyUpdate();
  });

  const previousStatus = previous?.status ?? "UNKNOWN";
  logActivity({
    leadId,
    type: "STATUS_CHANGED",
    message: `Status changed: ${previousStatus} -> ${status}`,
  });

  return finalLead;
}

export function upsertQuoteSummary(input: {
  quoteId: string;
  leadId: string;
  status: QuoteStatus;
  amount: number;
  data?: string;
}): QuoteSummary {
  const base: QuoteSummary = {
    quoteId: input.quoteId,
    leadId: input.leadId,
    status: input.status,
    amount: input.amount,
    data: input.data,
    updatedAt: nowISO(),
  };

  const summary: QuoteSummary = base;

  const quotes = readQuotes();
  const index = quotes.findIndex((q) => q.quoteId === summary.quoteId);

  if (index >= 0) {
    quotes[index] = summary;
  } else {
    quotes.push(summary);
  }

  writeJson(STORAGE_KEYS.quotes, quotes);

  const leads = readLeads();
  const leadIndex = leads.findIndex((l) => l.id === summary.leadId);
  if (leadIndex >= 0 && !leads[leadIndex].quoteId) {
    leads[leadIndex] = {
      ...leads[leadIndex],
      quoteId: summary.quoteId,
      updatedAt: nowISO(),
      email: leads[leadIndex].email ?? "",
      location: leads[leadIndex].location ?? "",
    };
    writeJson(STORAGE_KEYS.leads, leads);
  }
  notifyUpdate();

  void requestAsync<QuoteSummary>("POST", `${API_BASE}/quotes`, base).then((remote) => {
    if (!remote) return;
    const nextSummary: QuoteSummary = {
      ...base,
      ...remote,
      updatedAt: remote.updatedAt ?? base.updatedAt,
    };

    const currentQuotes = readQuotes();
    const existingIndex = currentQuotes.findIndex((q) => q.quoteId === nextSummary.quoteId);
    if (existingIndex >= 0) {
      currentQuotes[existingIndex] = nextSummary;
    } else {
      currentQuotes.push(nextSummary);
    }
    writeJson(STORAGE_KEYS.quotes, currentQuotes);

    const currentLeads = readLeads();
    const leadIdx = currentLeads.findIndex((l) => l.id === nextSummary.leadId);
    if (leadIdx >= 0 && !currentLeads[leadIdx].quoteId) {
      currentLeads[leadIdx] = {
        ...currentLeads[leadIdx],
        quoteId: nextSummary.quoteId,
        updatedAt: nowISO(),
        email: currentLeads[leadIdx].email ?? "",
        location: currentLeads[leadIdx].location ?? "",
      };
      writeJson(STORAGE_KEYS.leads, currentLeads);
    }
    notifyUpdate();
  });

  return summary;
}

export function getQuoteSummaryByLead(leadId: string): QuoteSummary | undefined {
  const leads = readLeads();
  const lead = leads.find((l) => l.id === leadId);
  const quotes = readQuotes().filter((q) => q.leadId === leadId);

  const now = Date.now();
  const lastSync = quoteLastSync.get(leadId) ?? 0;
  if (!quoteSyncInFlight.has(leadId) && now - lastSync > QUOTE_SYNC_TTL_MS) {
    quoteSyncInFlight.add(leadId);
    quoteLastSync.set(leadId, now);
    void requestAsync<QuoteSummary>(`GET`, `${API_BASE}/quotes/by-lead/${encodeURIComponent(leadId)}`)
      .then((remote) => {
        if (remote) {
          const nextQuotes = [remote, ...readQuotes().filter((q) => q.quoteId !== remote.quoteId)];
          writeJson(STORAGE_KEYS.quotes, nextQuotes);
          notifyUpdate();
        }
      })
      .finally(() => {
        quoteSyncInFlight.delete(leadId);
      });
  }

  if (lead?.quoteId) {
    const byId = quotes.find((q) => q.quoteId === lead.quoteId);
    if (byId) return byId;
  }

  return quotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
}

export function getQuoteById(quoteId: string): QuoteSummary | undefined {
  const quotes = readQuotes();
  return quotes.find((q) => q.quoteId === quoteId);
}

export function getAllQuotesByLead(leadId: string): QuoteSummary[] {
  const quotes = readQuotes().filter((q) => q.leadId === leadId);
  return quotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getLeadById(leadId: string): LeadRecord | undefined {
  const leads = readLeads();
  return leads.find((l) => l.id === leadId);
}

export function setFollowUp(leadId: string, date: string, note?: string): LeadRecord | undefined {
  const leads = getLeads();
  const existing = leads.find((l) => l.id === leadId);
  const base: LeadRecord =
    existing ??
    ({
      id: leadId,
      name: "",
      mobile: "",
      source: "website",
      status: "NEW",
      createdAt: nowISO(),
      updatedAt: nowISO(),
      email: "",
      location: "",
      latitude: undefined,
      longitude: undefined,
    } as LeadRecord);

  const updated: LeadRecord = {
    ...base,
    nextFollowUpDate: date,
    followUpDone: false,
    updatedAt: nowISO(),
  };

  const persisted = upsertLead(updated);

  const trimmedNote = note?.trim();
  const message = trimmedNote
    ? `Follow-up scheduled for ${date}: ${trimmedNote}`
    : `Follow-up scheduled for ${date}`;

  logActivity({
    leadId,
    type: "NOTE_ADDED",
    message,
    meta: { followUpDate: date, followUpDone: false, note: trimmedNote },
  });

  return persisted;
}

export function markFollowUpDone(leadId: string): LeadRecord | undefined {
  const leads = getLeads();
  const existing = leads.find((l) => l.id === leadId);
  if (!existing) return undefined;

  const updated: LeadRecord = {
    ...existing,
    nextFollowUpDate: undefined,
    followUpDone: true,
    updatedAt: nowISO(),
  };

  const persisted = upsertLead(updated);

  logActivity({
    leadId,
    type: "NOTE_ADDED",
    message: "Follow-up completed",
    meta: { followUpDone: true },
  });

  return persisted;
}

// Appointment functions
function readAppointments(): Appointment[] {
  return readJson<Appointment[]>(STORAGE_KEYS.appointments, []);
}

export function getAppointmentsByLead(leadId: string): Appointment[] {
  const appointments = readAppointments();
  return appointments
    .filter((a) => a.leadId === leadId)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
}

export function getAppointmentById(appointmentId: string): Appointment | undefined {
  const appointments = readAppointments();
  return appointments.find((a) => a.id === appointmentId);
}

export function upsertAppointment(appointment: Appointment): Appointment {
  const appointments = readAppointments();
  const index = appointments.findIndex((a) => a.id === appointment.id);

  const normalized: Appointment = {
    ...appointment,
    createdAt: appointment.createdAt || nowISO(),
    updatedAt: nowISO(),
  };

  if (index >= 0) {
    appointments[index] = normalized;
  } else {
    appointments.push(normalized);
  }

  writeJson(STORAGE_KEYS.appointments, appointments);
  notifyUpdate();
  return normalized;
}

export function createAppointment(input: {
  leadId: string;
  scheduledAt: string;
  secondaryMobile?: string;
  latitude?: number;
  longitude?: number;
  locationNote?: string;
  customerNote?: string;
}): Appointment {
  const appointment: Appointment = {
    id: uid("appt"),
    leadId: input.leadId,
    status: "PENDING",
    scheduledAt: input.scheduledAt,
    secondaryMobile: input.secondaryMobile,
    latitude: input.latitude,
    longitude: input.longitude,
    locationNote: input.locationNote,
    customerNote: input.customerNote,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  const saved = upsertAppointment(appointment);

  logActivity({
    leadId: input.leadId,
    type: "NOTE_ADDED",
    message: `Appointment scheduled for ${new Date(input.scheduledAt).toLocaleString()}`,
    meta: { appointmentId: appointment.id },
  });

  return saved;
}

export function updateAppointmentStatus(appointmentId: string, status: AppointmentStatus): Appointment | undefined {
  const appointments = readAppointments();
  const index = appointments.findIndex((a) => a.id === appointmentId);
  if (index < 0) return undefined;

  const previous = appointments[index];
  const updated: Appointment = {
    ...previous,
    status,
    updatedAt: nowISO(),
  };

  appointments[index] = updated;
  writeJson(STORAGE_KEYS.appointments, appointments);
  notifyUpdate();

  logActivity({
    leadId: previous.leadId,
    type: "NOTE_ADDED",
    message: `Appointment status changed to ${status}`,
    meta: { appointmentId, status },
  });

  return updated;
}

export function deleteLead(leadId: string): boolean {
  const leads = readLeads();
  const index = leads.findIndex((l) => l.id === leadId);
  if (index < 0) return false;

  // Remove lead
  leads.splice(index, 1);
  writeJson(STORAGE_KEYS.leads, leads);

  // Remove from public lead index
  removeFromPublicLeadIndex(leadId);

  // Remove related activity
  const activity = readActivity();
  const filteredActivity = activity.filter((a) => a.leadId !== leadId);
  writeJson(STORAGE_KEYS.activity, filteredActivity);

  // Remove related quotes
  const quotes = readQuotes();
  const filteredQuotes = quotes.filter((q) => q.leadId !== leadId);
  writeJson(STORAGE_KEYS.quotes, filteredQuotes);

  // Remove related appointments
  const appointments = readAppointments();
  const filteredAppointments = appointments.filter((a) => a.leadId !== leadId);
  writeJson(STORAGE_KEYS.appointments, filteredAppointments);

  notifyUpdate();
  return true;
}
