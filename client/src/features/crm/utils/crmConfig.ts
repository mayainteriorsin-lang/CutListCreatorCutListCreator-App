import React from "react";
import type { LeadRecord, LeadStatus, AppointmentStatus } from "@/modules/crm/types";
import {
    Sparkles,
    Phone,
    MapPin,
    FileText,
    Target,
    UserCheck,
    XCircle,
    CalendarClock,
    CalendarCheck,
    CheckCircle2,
    Ban,
    Clock,
    AlertCircle,
    Calendar,
} from "lucide-react";

export const PIPELINE: LeadStatus[] = [
    "NEW",
    "CONTACTED",
    "SITE_VISIT",
    "DESIGN_SHARED",
    "NEGOTIATION",
    "CONFIRMED",
    "LOST",
];

export const PIPELINE_CONFIG: Record<LeadStatus, { label: string; color: string; bgColor: string; icon: React.ReactElement }> = {
    NEW: { label: "New", color: "text-slate-700", bgColor: "bg-slate-100 border-slate-200", icon: React.createElement(Sparkles, { className: "h-3 w-3" }) },
    CONTACTED: { label: "Contacted", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200", icon: React.createElement(Phone, { className: "h-3 w-3" }) },
    SITE_VISIT: { label: "Site Visit", color: "text-violet-700", bgColor: "bg-violet-50 border-violet-200", icon: React.createElement(MapPin, { className: "h-3 w-3" }) },
    DESIGN_SHARED: { label: "Design Shared", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200", icon: React.createElement(FileText, { className: "h-3 w-3" }) },
    NEGOTIATION: { label: "Negotiation", color: "text-orange-700", bgColor: "bg-orange-50 border-orange-200", icon: React.createElement(Target, { className: "h-3 w-3" }) },
    CONFIRMED: { label: "Confirmed", color: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200", icon: React.createElement(UserCheck, { className: "h-3 w-3" }) },
    LOST: { label: "Lost", color: "text-red-700", bgColor: "bg-red-50 border-red-200", icon: React.createElement(XCircle, { className: "h-3 w-3" }) },
};

export const APPOINTMENT_STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; bgColor: string; icon: React.ReactElement }> = {
    PENDING: { label: "Pending", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200", icon: React.createElement(CalendarClock, { className: "h-3.5 w-3.5" }) },
    CONFIRMED: { label: "Confirmed", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200", icon: React.createElement(CalendarCheck, { className: "h-3.5 w-3.5" }) },
    COMPLETED: { label: "Completed", color: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200", icon: React.createElement(CheckCircle2, { className: "h-3.5 w-3.5" }) },
    CANCELLED: { label: "Cancelled", color: "text-red-700", bgColor: "bg-red-50 border-red-200", icon: React.createElement(Ban, { className: "h-3.5 w-3.5" }) },
};

export function followUpIndicator(lead: LeadRecord) {
    if (lead.followUpDone) {
        return { icon: React.createElement(CheckCircle2, { className: "h-4 w-4" }), label: "Done", color: "text-emerald-600", bgColor: "bg-emerald-50" };
    }
    if (!lead.nextFollowUpDate) {
        return { icon: React.createElement(Clock, { className: "h-4 w-4" }), label: "Not set", color: "text-slate-400", bgColor: "bg-slate-50" };
    }

    const today = new Date();
    const target = new Date(lead.nextFollowUpDate);
    const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const targetKey = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();

    if (targetKey < todayKey) return { icon: React.createElement(AlertCircle, { className: "h-4 w-4" }), label: "Overdue", color: "text-red-600", bgColor: "bg-red-50" };
    if (targetKey === todayKey) return { icon: React.createElement(Clock, { className: "h-4 w-4" }), label: "Today", color: "text-amber-600", bgColor: "bg-amber-50" };
    return { icon: React.createElement(Calendar, { className: "h-4 w-4" }), label: "Upcoming", color: "text-blue-600", bgColor: "bg-blue-50" };
}
