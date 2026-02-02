import { useMemo } from "react";
import { getAllQuotesByLead } from "@/modules/crm/storage";
import type { LeadRecord, LeadStatus } from "@/modules/crm/types";

export interface PipelineStatsData {
    count: number;
    value: number;
}

export interface DashboardStatsData {
    leadsThisMonth: number;
    conversionRate: number;
    avgQuoteValue: number;
    followUpsDueToday: number;
}

export interface UseCRMStatsReturn {
    pipelineStats: Record<LeadStatus, PipelineStatsData>;
    dashboardStats: DashboardStatsData;
    filteredLeads: LeadRecord[];
}

function normalizeMobile(mobile: string): string {
    return (mobile || "").replace(/\D/g, "");
}

export function useCRMStats(
    leads: LeadRecord[],
    search: string,
    statusFilter: LeadStatus | "ALL"
): UseCRMStatsReturn {
    // Pipeline stats
    const pipelineStats = useMemo(() => {
        const stats: Record<LeadStatus, PipelineStatsData> = {
            NEW: { count: 0, value: 0 },
            CONTACTED: { count: 0, value: 0 },
            SITE_VISIT: { count: 0, value: 0 },
            DESIGN_SHARED: { count: 0, value: 0 },
            NEGOTIATION: { count: 0, value: 0 },
            CONFIRMED: { count: 0, value: 0 },
            LOST: { count: 0, value: 0 },
        };

        leads.forEach((lead) => {
            stats[lead.status].count++;
            const quotes = getAllQuotesByLead(lead.id);
            const total = quotes.reduce((sum, q) => sum + (q.amount || 0), 0);
            stats[lead.status].value += total;
        });

        return stats;
    }, [leads]);

    // Dashboard stats
    const dashboardStats = useMemo(() => {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Leads this month
        const leadsThisMonth = leads.filter((lead) => new Date(lead.createdAt) >= thisMonth).length;

        // Conversion rate (CONFIRMED / total excluding LOST)
        const totalExcludingLost = leads.filter((l) => l.status !== "LOST").length;
        const confirmed = leads.filter((l) => l.status === "CONFIRMED").length;
        const conversionRate = totalExcludingLost > 0 ? Math.round((confirmed / totalExcludingLost) * 100) : 0;

        // Average quotation value
        let totalValue = 0;
        let quoteCount = 0;
        leads.forEach((lead) => {
            const quotes = getAllQuotesByLead(lead.id);
            quotes.forEach((q) => {
                if (q.amount > 0) {
                    totalValue += q.amount;
                    quoteCount++;
                }
            });
        });
        const avgQuoteValue = quoteCount > 0 ? Math.round(totalValue / quoteCount) : 0;

        // Follow-ups due today
        const followUpsDueToday = leads.filter((lead) => {
            if (!lead.nextFollowUpDate || lead.followUpDone) return false;
            const target = new Date(lead.nextFollowUpDate);
            const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());
            return targetDate.getTime() <= today.getTime();
        }).length;

        return { leadsThisMonth, conversionRate, avgQuoteValue, followUpsDueToday };
    }, [leads]);

    // Filtered leads
    const filteredLeads = useMemo(() => {
        const q = search.trim().toLowerCase();
        const qDigits = normalizeMobile(search);

        return leads.filter((lead) => {
            if (statusFilter !== "ALL" && lead.status !== statusFilter) return false;
            if (!q) return true;

            const nameMatch = lead.name.toLowerCase().includes(q);
            const sourceMatch = (lead.source || "").toLowerCase().includes(q);
            const mobileDigits = normalizeMobile(lead.mobile);
            const mobileMatch = (qDigits && mobileDigits.includes(qDigits)) || lead.mobile.toLowerCase().includes(q);

            return nameMatch || sourceMatch || mobileMatch;
        });
    }, [leads, search, statusFilter]);

    return {
        pipelineStats,
        dashboardStats,
        filteredLeads,
    };
}
