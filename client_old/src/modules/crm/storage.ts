import type { ActivityEvent, ActivityType, LeadRecord, LeadStatus, QuoteStatus, QuoteSummary } from "./types";
import { generateUUID } from "@/lib/uuid";

const API_BASE = "/api/crm";
const STORAGE_KEYS = {
  leads: "crm:leads",
  activity: "crm:activity",
  quotes: "crm:quotes",
} as const;

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

function hasSyncHttp(): boolean {
  return isBrowser() && typeof XMLHttpRequest !== "undefined";
}

function nowISO(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${generateUUID()}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
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
  localStorage.setItem(key, JSON.stringify(value));
}

function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as string[]).includes(value);
}

function requestSync<T>(method: "GET" | "POST" | "PATCH", path: string, body?: unknown): T | null {
  if (!hasSyncHttp()) return null;

  try {
    const xhr = new XMLHttpRequest();
    xhr.open(method, path, false);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(body ? JSON.stringify(body) : null);

    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        return JSON.parse(xhr.responseText) as T;
      } catch {
        return null;
      }
    }
  } catch {
    // swallow and fallback to localStorage
  }

  return null;
}

function fireAndForget(method: "POST" | "PATCH", path: string, body?: unknown) {
  if (!isBrowser() || typeof fetch === "undefined") return;
  fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => undefined);
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

export function getLeads(): LeadRecord[] {
  const localLeads = readLeads();
  const remote = requestSync<LeadRecord[]>("GET", `${API_BASE}/leads`);

  if (remote && Array.isArray(remote)) {
    const merged = remote.map((lead) => {
      const fallback =
        localLeads.find((l) => l.id === lead.id) ??
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

    const extraLocal = localLeads.filter((l) => !remote.find((r) => r.id === l.id));
    const next = [...merged, ...extraLocal].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    writeJson(STORAGE_KEYS.leads, next);
    return next;
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

  const remote = requestSync<LeadRecord>("POST", `${API_BASE}/leads`, base);
  if (!remote) {
    fireAndForget("POST", `${API_BASE}/leads`, base);
  }

  const finalLead = remote ? mergeLead(remote, base) : base;
  return upsertLeadLocal(finalLead);
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

  const remote = requestSync<ActivityEvent>("POST", `${API_BASE}/activities`, {
    id: draft.id,
    leadId: input.leadId,
    type: input.type,
    message: input.message,
    meta: input.meta,
  });

  if (!remote) {
    fireAndForget("POST", `${API_BASE}/activities`, {
      id: draft.id,
      leadId: input.leadId,
      type: input.type,
      message: input.message,
      meta: input.meta,
    });
  }

  const event: ActivityEvent = remote
    ? {
        ...draft,
        ...remote,
        at: (remote as ActivityEvent).at || draft.at,
        meta: remote.meta ?? draft.meta,
      }
    : draft;

  const next = [event, ...events].slice(0, 2000);
  writeJson(STORAGE_KEYS.activity, next);
  return event;
}

export function getActivity(leadId: string): ActivityEvent[] {
  const local = readActivity();
  const remote = requestSync<ActivityEvent[]>(`GET`, `${API_BASE}/activities/${encodeURIComponent(leadId)}`);

  if (remote && Array.isArray(remote)) {
    const others = local.filter((e) => e.leadId !== leadId);
    const next = [...remote, ...others];
    writeJson(STORAGE_KEYS.activity, next);
    return remote.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
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

  const remote = requestSync<LeadRecord>(
    "PATCH",
    `${API_BASE}/leads/${encodeURIComponent(leadId)}/status`,
    { status }
  );
  if (!remote) {
    fireAndForget("PATCH", `${API_BASE}/leads/${encodeURIComponent(leadId)}/status`, { status });
  }

  const finalLead = remote ? mergeLead(remote, base) : { ...base, status, updatedAt: nowISO() };

  if (index >= 0) {
    leads[index] = finalLead;
  } else {
    leads.push(finalLead);
  }
  writeJson(STORAGE_KEYS.leads, leads);

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
}): QuoteSummary {
  const base: QuoteSummary = {
    quoteId: input.quoteId,
    leadId: input.leadId,
    status: input.status,
    amount: input.amount,
    updatedAt: nowISO(),
  };

  const remote = requestSync<QuoteSummary>("POST", `${API_BASE}/quotes`, base);
  if (!remote) {
    fireAndForget("POST", `${API_BASE}/quotes`, base);
  }

  const summary: QuoteSummary = {
    ...base,
    ...remote,
    updatedAt: remote?.updatedAt ?? base.updatedAt,
  };

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

  return summary;
}

export function getQuoteSummaryByLead(leadId: string): QuoteSummary | undefined {
  const leads = readLeads();
  const lead = leads.find((l) => l.id === leadId);
  const quotes = readQuotes().filter((q) => q.leadId === leadId);

  const remote = requestSync<QuoteSummary>(`GET`, `${API_BASE}/quotes/by-lead/${encodeURIComponent(leadId)}`);
  if (remote) {
    const nextQuotes = [remote, ...readQuotes().filter((q) => q.quoteId !== remote.quoteId)];
    writeJson(STORAGE_KEYS.quotes, nextQuotes);
    return remote;
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
