import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { sanitizeInput } from "@/lib/sanitize";
import { validateNote, validateEmail, validateLocation, validateFollowUpDate } from "@/features/crm/utils/validation";
import {
    updateLeadStatus,
    deleteLead,
    setFollowUp,
    markFollowUpDone,
    logActivity,
    upsertLead,
} from "@/modules/crm/storage";
import type { LeadRecord, LeadStatus } from "@/modules/crm/types";

export interface UseLeadOperationsProps {
    refreshLeads: () => void;
    refreshActivity: (leadId: string) => void;
    selectedLeadId: string | null;
}

export interface UseLeadOperationsReturn {
    handleStatusChange: (leadId: string, nextStatus: LeadStatus) => void;
    handleDeleteLead: (lead: LeadRecord) => void;
    handleSaveFollowUp: (leadId: string, date: string, note?: string) => void;
    handleMarkFollowUpDone: (leadId: string) => void;
    handleUpdateContact: (lead: LeadRecord, email: string, location: string) => void;
    handleAddNote: (leadId: string, note: string) => void;
    handleLogCall: (leadId: string, callNote?: string) => void;
}

export function useLeadOperations({
    refreshLeads,
    refreshActivity,
    selectedLeadId,
}: UseLeadOperationsProps): UseLeadOperationsReturn {
    const { toast } = useToast();

    const handleStatusChange = useCallback(
        (leadId: string, nextStatus: LeadStatus) => {
            updateLeadStatus(leadId, nextStatus);
            refreshLeads();
            if (selectedLeadId === leadId) refreshActivity(leadId);
        },
        [refreshLeads, refreshActivity, selectedLeadId]
    );

    const handleDeleteLead = useCallback(
        (lead: LeadRecord) => {
            try {
                deleteLead(lead.id);
                refreshLeads();
                toast({ title: "Lead deleted", description: `${lead.name} has been removed` });
            } catch (error) {
                const err = error as Error;
                console.error("Error deleting lead:", err);
                toast({
                    title: "Failed to delete lead",
                    description: err.message,
                    variant: "destructive"
                });
            }
        },
        [refreshLeads, toast]
    );

    const handleSaveFollowUp = useCallback(
        (leadId: string, date: string, note?: string) => {
            try {
                if (!date || !validateFollowUpDate(date)) {
                    toast({ title: "Please select a valid future date", variant: "destructive" });
                    return;
                }
                const sanitizedNote = note ? sanitizeInput(note) : undefined;
                setFollowUp(leadId, date, sanitizedNote);
                refreshLeads();
                if (selectedLeadId === leadId) refreshActivity(leadId);
                toast({ title: "Follow-up saved" });
            } catch (error) {
                const err = error as Error;
                console.error("Error saving follow-up:", err);
                toast({
                    title: "Failed to save follow-up",
                    description: err.message,
                    variant: "destructive"
                });
            }
        },
        [refreshLeads, refreshActivity, selectedLeadId, toast]
    );

    const handleMarkFollowUpDone = useCallback(
        (leadId: string) => {
            markFollowUpDone(leadId);
            refreshLeads();
            if (selectedLeadId === leadId) refreshActivity(leadId);
            toast({ title: "Follow-up marked done" });
        },
        [refreshLeads, refreshActivity, selectedLeadId, toast]
    );

    const handleUpdateContact = useCallback(
        (lead: LeadRecord, email: string, location: string) => {
            try {
                const sanitizedEmail = sanitizeInput(email).trim();
                const sanitizedLocation = sanitizeInput(location).trim();

                // Validate email if provided
                if (sanitizedEmail && !validateEmail(sanitizedEmail)) {
                    toast({ title: "Invalid email format", variant: "destructive" });
                    return;
                }

                // Validate location length
                if (sanitizedLocation && !validateLocation(sanitizedLocation)) {
                    toast({ title: "Location is too long (max 200 characters)", variant: "destructive" });
                    return;
                }

                const changedEmail = sanitizedEmail !== (lead.email ?? "");
                const changedLocation = sanitizedLocation !== (lead.location ?? "");

                const nextLead: LeadRecord = {
                    ...lead,
                    email: sanitizedEmail,
                    location: sanitizedLocation,
                    updatedAt: new Date().toISOString(),
                };

                upsertLead(nextLead);

                if (changedEmail) {
                    logActivity({ leadId: lead.id, type: "LEAD_UPDATED", message: "Email updated" });
                }
                if (changedLocation) {
                    logActivity({ leadId: lead.id, type: "LEAD_UPDATED", message: "Location updated" });
                }

                refreshLeads();
                refreshActivity(lead.id);
                toast({ title: "Contact updated" });
            } catch (error) {
                const err = error as Error;
                console.error("Error updating contact:", err);
                toast({
                    title: "Failed to update contact",
                    description: err.message,
                    variant: "destructive"
                });
            }
        },
        [refreshLeads, refreshActivity, toast]
    );

    const handleAddNote = useCallback(
        (leadId: string, note: string) => {
            try {
                const sanitized = sanitizeInput(note).trim();
                if (!validateNote(sanitized)) {
                    toast({ title: "Note must be between 1 and 1000 characters", variant: "destructive" });
                    return;
                }

                logActivity({ leadId, type: "NOTE_ADDED", message: sanitized });
                refreshActivity(leadId);
                toast({ title: "Note added" });
            } catch (error) {
                const err = error as Error;
                console.error("Error adding note:", err);
                toast({
                    title: "Failed to add note",
                    description: err.message,
                    variant: "destructive"
                });
            }
        },
        [refreshActivity, toast]
    );

    const handleLogCall = useCallback(
        (leadId: string, callNote?: string) => {
            try {
                const sanitized = callNote ? sanitizeInput(callNote).trim() : "";
                const message = sanitized || "Call logged.";
                logActivity({ leadId, type: "CALL_LOGGED", message });
                refreshActivity(leadId);
                toast({ title: "Call logged" });
            } catch (error) {
                const err = error as Error;
                console.error("Error logging call:", err);
                toast({
                    title: "Failed to log call",
                    description: err.message,
                    variant: "destructive"
                });
            }
        },
        [refreshActivity, toast]
    );

    return {
        handleStatusChange,
        handleDeleteLead,
        handleSaveFollowUp,
        handleMarkFollowUpDone,
        handleUpdateContact,
        handleAddNote,
        handleLogCall,
    };
}
