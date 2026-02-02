import type { LeadRecord } from "@/modules/crm/types";
import { getAllQuotesByLead } from "@/modules/crm/storage";

export interface ExportLeadData {
    Name: string;
    Mobile: string;
    Email: string;
    Location: string;
    Source: string;
    Status: string;
    "Quote Amount": number;
    "Follow Up": string;
    "Created At": string;
}

export function exportLeadsToCSV(leads: LeadRecord[]): void {
    const data: ExportLeadData[] = leads.map((lead) => {
        const quotes = getAllQuotesByLead(lead.id);
        const totalAmount = quotes.reduce((sum, q) => sum + (q.amount || 0), 0);
        return {
            Name: lead.name,
            Mobile: lead.mobile,
            Email: lead.email || "",
            Location: lead.location || "",
            Source: lead.source,
            Status: lead.status,
            "Quote Amount": totalAmount,
            "Follow Up": lead.nextFollowUpDate || "",
            "Created At": new Date(lead.createdAt).toLocaleDateString("en-IN"),
        };
    });

    // Convert to CSV
    const headers = Object.keys(data[0] || {});
    const csvRows = [
        headers.join(","),
        ...data.map((row) =>
            headers
                .map((h) => {
                    const value = String(row[h as keyof ExportLeadData] || "");
                    // Escape quotes and wrap in quotes if contains comma
                    if (value.includes(",") || value.includes('"')) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                })
                .join(",")
        ),
    ];
    const csvContent = csvRows.join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `crm-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}
