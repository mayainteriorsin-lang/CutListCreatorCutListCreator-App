import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
    getActivity,
    getLeads,
    subscribeCrmUpdates,
} from "@/modules/crm/storage";
import type { ActivityEvent, LeadRecord, LeadStatus } from "@/modules/crm/types";

export interface UseCRMStateReturn {
    // Core data
    leads: LeadRecord[];
    isLoading: boolean;
    error: Error | null;
    search: string;
    setSearch: (search: string) => void;
    statusFilter: LeadStatus | "ALL";
    setStatusFilter: (filter: LeadStatus | "ALL") => void;

    // Selected lead
    selectedLeadId: string | null;
    setSelectedLeadId: (id: string | null) => void;
    selectedLead: LeadRecord | null;
    activity: ActivityEvent[];

    // Dialog states
    deleteConfirmLead: LeadRecord | null;
    setDeleteConfirmLead: (lead: LeadRecord | null) => void;
    followUpLead: LeadRecord | null;
    setFollowUpLead: (lead: LeadRecord | null) => void;
    showResetPinDialog: boolean;
    setShowResetPinDialog: (show: boolean) => void;

    // Draft states
    noteDraft: string;
    setNoteDraft: (note: string) => void;
    callDraft: string;
    setCallDraft: (call: string) => void;
    followUpDate: string;
    setFollowUpDate: (date: string) => void;
    followUpNote: string;
    setFollowUpNote: (note: string) => void;
    emailDraft: string;
    setEmailDraft: (email: string) => void;
    locationDraft: string;
    setLocationDraft: (location: string) => void;

    // Operations
    refreshLeads: (options?: { skipRemote?: boolean }) => void;
    refreshActivity: (leadId: string, options?: { skipRemote?: boolean }) => void;
}

export function useCRMState(): UseCRMStateReturn {
    const { toast } = useToast();
    const [leads, setLeads] = useState<LeadRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<LeadStatus | "ALL">("ALL");

    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [activity, setActivity] = useState<ActivityEvent[]>([]);

    const [noteDraft, setNoteDraft] = useState("");
    const [callDraft, setCallDraft] = useState("");
    const [followUpLead, setFollowUpLead] = useState<LeadRecord | null>(null);
    const [followUpDate, setFollowUpDate] = useState("");
    const [followUpNote, setFollowUpNote] = useState("");
    const [emailDraft, setEmailDraft] = useState("");
    const [locationDraft, setLocationDraft] = useState("");
    const [deleteConfirmLead, setDeleteConfirmLead] = useState<LeadRecord | null>(null);
    const [showResetPinDialog, setShowResetPinDialog] = useState(false);

    const refreshLeads = useCallback((options?: { skipRemote?: boolean }) => {
        try {
            setIsLoading(true);
            setError(null);
            const data = getLeads(options);
            setLeads(data);
        } catch (err) {
            const error = err as Error;
            setError(error);
            console.error("Error loading leads:", error);
            toast({
                title: "Failed to load leads",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    const refreshActivity = useCallback((leadId: string, options?: { skipRemote?: boolean }) => {
        try {
            const data = getActivity(leadId, options);
            setActivity(data);
        } catch (err) {
            const error = err as Error;
            console.error("Error loading activity:", error);
            toast({
                title: "Failed to load activity",
                description: error.message,
                variant: "destructive"
            });
        }
    }, [toast]);

    // Initial load
    useEffect(() => {
        refreshLeads();
    }, [refreshLeads]);

    // Subscribe to real-time updates
    useEffect(() => {
        const unsubscribe = subscribeCrmUpdates(() => {
            refreshLeads({ skipRemote: true });
            if (selectedLeadId) {
                refreshActivity(selectedLeadId, { skipRemote: true });
            }
        });
        return unsubscribe;
    }, [refreshActivity, refreshLeads, selectedLeadId]);

    // Selected lead computed value
    const selectedLead = useMemo(() => {
        if (!selectedLeadId) return null;
        return leads.find((l) => l.id === selectedLeadId) ?? null;
    }, [leads, selectedLeadId]);

    // Reset drafts when lead selection changes
    useEffect(() => {
        if (!selectedLeadId) {
            setActivity([]);
            setNoteDraft("");
            setCallDraft("");
            setEmailDraft("");
            setLocationDraft("");
            return;
        }

        refreshActivity(selectedLeadId);
    }, [selectedLeadId, refreshActivity]);

    // Sync email and location drafts from selected lead
    useEffect(() => {
        if (selectedLeadId) {
            const lead = leads.find((l) => l.id === selectedLeadId);
            setFollowUpDate(lead?.nextFollowUpDate ? lead.nextFollowUpDate.slice(0, 10) : "");
            setEmailDraft(lead?.email || "");
            setLocationDraft(lead?.location || "");
        }
    }, [selectedLeadId, leads]);

    return {
        leads,
        isLoading,
        error,
        search,
        setSearch,
        statusFilter,
        setStatusFilter,
        selectedLeadId,
        setSelectedLeadId,
        selectedLead,
        activity,
        deleteConfirmLead,
        setDeleteConfirmLead,
        followUpLead,
        setFollowUpLead,
        showResetPinDialog,
        setShowResetPinDialog,
        noteDraft,
        setNoteDraft,
        callDraft,
        setCallDraft,
        followUpDate,
        setFollowUpDate,
        followUpNote,
        setFollowUpNote,
        emailDraft,
        setEmailDraft,
        locationDraft,
        setLocationDraft,
        refreshLeads,
        refreshActivity,
    };
}
