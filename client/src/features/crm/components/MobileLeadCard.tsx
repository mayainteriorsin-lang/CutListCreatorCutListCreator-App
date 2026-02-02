import React from "react";
import { LeadRecord, LeadStatus } from "@/modules/crm/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Phone,
    Mail,
    MapPin,
    Calendar,
    IndianRupee,
    MessageSquare,
    PhoneCall,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/features/crm/utils/formatters";
import { PIPELINE_CONFIG, followUpIndicator } from "@/features/crm/utils/crmConfig";

interface MobileLeadCardProps {
    lead: LeadRecord;
    quoteCount: number;
    approvedCount: number;
    totalAmount: number;
    onClick: () => void;
    onQuoteClick: (e: React.MouseEvent) => void;
    onWhatsAppClick: (e: React.MouseEvent) => void;
    onCallClick: (e: React.MouseEvent) => void;
    onFollowUpClick: (e: React.MouseEvent) => void;
}

export function MobileLeadCard({
    lead,
    quoteCount,
    approvedCount,
    totalAmount,
    onClick,
    onQuoteClick,
    onWhatsAppClick,
    onCallClick,
    onFollowUpClick,
}: MobileLeadCardProps) {
    const statusConfig = PIPELINE_CONFIG[lead.status];
    const followUp = followUpIndicator(lead);

    return (
        <div
            onClick={onClick}
            className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
        >
            {/* Header: Avatar + Name + Status */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-semibold text-indigo-700">
                            {lead.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 truncate">{lead.name}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span className="uppercase">{lead.source || "website"}</span>
                            <span>•</span>
                            <span>{formatRelativeDate(lead.createdAt)}</span>
                        </div>
                    </div>
                </div>

                {/* Status Badge */}
                <Badge className={cn("text-xs font-medium", statusConfig.bgColor, statusConfig.color)}>
                    {statusConfig.label}
                </Badge>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-3 pb-3 border-b border-slate-100">
                {/* Phone */}
                <a
                    href={`tel:${lead.mobile.replace(/\D/g, "")}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 text-sm hover:text-green-600 transition-colors"
                >
                    <Phone className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="font-medium">{lead.mobile}</span>
                </a>

                {/* Email */}
                {lead.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{lead.email}</span>
                    </div>
                )}

                {/* Location */}
                {lead.latitude && lead.longitude && (
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${lead.latitude},${lead.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700"
                    >
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium">View Map</span>
                    </a>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <div className="text-xs text-slate-500 mb-0.5">Quotes</div>
                    <div className="text-sm font-semibold text-slate-900">{quoteCount}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center">
                    <div className="text-xs text-green-600 mb-0.5">Approved</div>
                    <div className="text-sm font-semibold text-green-700">{approvedCount}</div>
                </div>
                <div className="bg-indigo-50 rounded-lg p-2 text-center">
                    <div className="text-xs text-indigo-600 mb-0.5 flex items-center justify-center gap-0.5">
                        <IndianRupee className="h-3 w-3" />
                        Total
                    </div>
                    <div className="text-sm font-semibold text-indigo-700">
                        {totalAmount > 0 ? `${(totalAmount / 1000).toFixed(0)}K` : "-"}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
                {/* Follow-up */}
                <button
                    onClick={onFollowUpClick}
                    className={cn(
                        "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                        followUp.bgColor,
                        followUp.color,
                        "hover:opacity-80"
                    )}
                >
                    <Calendar className="h-3.5 w-3.5" />
                    {lead.nextFollowUpDate
                        ? new Date(lead.nextFollowUpDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                        })
                        : followUp.label}
                </button>

                {/* Quick Actions */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={onCallClick}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                        aria-label="Log call"
                    >
                        <PhoneCall className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={onWhatsAppClick}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                        aria-label="Send WhatsApp"
                    >
                        <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={onQuoteClick}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                        aria-label="View quote"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
