export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "SITE_VISIT"
  | "DESIGN_SHARED"
  | "NEGOTIATION"
  | "CONFIRMED"
  | "LOST";

export type ActivityType =
  | "LEAD_CREATED"
  | "LEAD_OPENED"
  | "STATUS_CHANGED"
  | "NOTE_ADDED"
  | "CALL_LOGGED"
  | "QUOTE_CREATED"
  | "QUOTE_OPENED"
  | "QUOTE_APPROVED"
  | "QUOTE_SHARED"
  | "LEAD_UPDATED";

export interface LeadRecord {
  id: string;
  name: string;
  mobile: string;
  source: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  customerId?: string;
  projectId?: string;
  quoteId?: string;
  email?: string;
  location?: string;
  nextFollowUpDate?: string;
  followUpDone?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface ActivityEvent {
  id: string;
  leadId: string;
  type: ActivityType;
  message: string;
  at: string;
  meta?: Record<string, unknown>;
}

export type QuoteStatus = "DRAFT" | "APPROVED";

export interface QuoteSummary {
  quoteId: string;
  leadId: string;
  status: QuoteStatus;
  amount: number;
  data?: string;
  updatedAt: string;
}

export type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export interface Appointment {
  id: string;
  leadId: string;
  status: AppointmentStatus;
  scheduledAt: string;
  secondaryMobile?: string;
  latitude?: number;
  longitude?: number;
  locationNote?: string;
  customerNote?: string;
  createdAt: string;
  updatedAt: string;
}
