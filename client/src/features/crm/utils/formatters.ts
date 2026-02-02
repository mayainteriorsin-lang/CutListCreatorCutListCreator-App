/**
 * CRM Formatting Utilities
 * 
 * Common formatters for dates, activity types, and mobile numbers.
 */

export function normalizeMobile(mobile: string): string {
    return (mobile || "").replace(/\D/g, "");
}

export function formatWhen(iso: string): string {
    if (!iso) return "-";
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleString();
}

export function formatRelativeDate(iso: string): string {
    if (!iso) return "-";
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return "-";

    const now = new Date();
    const diffMs = now.getTime() - dt.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return dt.toLocaleDateString();
}

export function formatActivityType(type: string): string {
    return type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function quoteBadgeClass(status: "DRAFT" | "APPROVED"): string {
    return status === "APPROVED"
        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
        : "bg-blue-100 text-blue-700 border border-blue-200";
}
