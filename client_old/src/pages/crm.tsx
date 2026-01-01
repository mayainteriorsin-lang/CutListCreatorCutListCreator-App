import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  getActivity,
  getLeads,
  getQuoteSummaryByLead,
  logActivity,
  markFollowUpDone,
  setFollowUp,
  upsertLead,
  updateLeadStatus,
} from "@/modules/crm/storage";
import type { ActivityEvent, LeadRecord, LeadStatus } from "@/modules/crm/types";
import { generateUUID } from "@/lib/uuid";

const PIPELINE: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "SITE_VISIT",
  "DESIGN_SHARED",
  "NEGOTIATION",
  "CONFIRMED",
  "LOST",
];

function safeId(prefix: string) {
  return `${prefix}-${generateUUID()}`;
}

function normalizeMobile(mobile: string): string {
  return (mobile || "").replace(/\D/g, "");
}

function formatWhen(iso: string): string {
  if (!iso) return "-";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
}

function leadStatusBadgeClass(status: LeadStatus): string {
  switch (status) {
    case "NEW":
      return "bg-slate-100 text-slate-800 border border-slate-200";
    case "CONTACTED":
      return "bg-blue-100 text-blue-800 border border-blue-200";
    case "SITE_VISIT":
      return "bg-violet-100 text-violet-800 border border-violet-200";
    case "DESIGN_SHARED":
      return "bg-amber-100 text-amber-800 border border-amber-200";
    case "NEGOTIATION":
      return "bg-orange-100 text-orange-800 border border-orange-200";
    case "CONFIRMED":
      return "bg-green-100 text-green-800 border border-green-200";
    case "LOST":
      return "bg-red-100 text-red-800 border border-red-200";
  }
}

function quoteBadgeClass(status: "DRAFT" | "APPROVED"): string {
  return status === "APPROVED"
    ? "bg-green-100 text-green-800 border border-green-200"
    : "bg-blue-100 text-blue-800 border border-blue-200";
}

function formatActivityType(type: string): string {
  return type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function followUpIndicator(lead: LeadRecord) {
  if (lead.followUpDone) {
    return { icon: "🟢", label: "Done", color: "text-green-600" };
  }
  if (!lead.nextFollowUpDate) {
    return { icon: "—", label: "Not set", color: "text-gray-500" };
  }

  const today = new Date();
  const target = new Date(lead.nextFollowUpDate);
  const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const targetKey = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();

  if (targetKey < todayKey) return { icon: "🔴", label: "Overdue", color: "text-red-600" };
  if (targetKey === todayKey) return { icon: "🟡", label: "Today", color: "text-amber-600" };
  return { icon: "🟢", label: "Upcoming", color: "text-green-600" };
}

export default function CrmPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [leads, setLeads] = useState<LeadRecord[]>([]);
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

  const refreshLeads = () => setLeads(getLeads());
  const refreshActivity = (leadId: string) => setActivity(getActivity(leadId));

  useEffect(() => {
    refreshLeads();
  }, []);

  const selectedLead = useMemo(() => {
    if (!selectedLeadId) return null;
    return leads.find((l) => l.id === selectedLeadId) ?? null;
  }, [leads, selectedLeadId]);

  useEffect(() => {
    if (!selectedLeadId) {
      setActivity([]);
      setNoteDraft("");
      setCallDraft("");
      setEmailDraft("");
      setLocationDraft("");
      return;
    }

    logActivity({ leadId: selectedLeadId, type: "LEAD_OPENED", message: "Lead opened." });
    refreshActivity(selectedLeadId);
  }, [selectedLeadId]);

  useEffect(() => {
    if (selectedLeadId) {
      const lead = leads.find((l) => l.id === selectedLeadId);
      setFollowUpDate(lead?.nextFollowUpDate ? lead.nextFollowUpDate.slice(0, 10) : "");
      setEmailDraft(lead?.email || "");
      setLocationDraft(lead?.location || "");
    }
  }, [selectedLeadId, leads]);

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

  const handleStatusChange = (leadId: string, nextStatus: LeadStatus) => {
    updateLeadStatus(leadId, nextStatus);
    refreshLeads();
    if (selectedLeadId === leadId) refreshActivity(leadId);
  };

  const ensureQuoteId = (lead: LeadRecord): string => {
    if (lead.quoteId) return lead.quoteId;
    const quoteId = safeId("quote");

    upsertLead({ ...lead, quoteId, updatedAt: new Date().toISOString() });
    logActivity({
      leadId: lead.id,
      type: "QUOTE_CREATED",
      message: "Quote created from CRM.",
      meta: { quoteId },
    });

    refreshLeads();
    return quoteId;
  };

  const handleCreateOrViewQuotation = (lead: LeadRecord) => {
    const quoteId = ensureQuoteId(lead);
    navigate(
      `/visual-quotation?leadId=${encodeURIComponent(lead.id)}&quoteId=${encodeURIComponent(quoteId)}`
    );
  };

  const handleAddNote = () => {
    if (!selectedLead) return;
    const message = noteDraft.trim();
    if (!message) {
      toast({ title: "Add a note", description: "Type a note before saving." });
      return;
    }

    logActivity({ leadId: selectedLead.id, type: "NOTE_ADDED", message });
    setNoteDraft("");
    refreshActivity(selectedLead.id);
    toast({ title: "Note added" });
  };

  const handleLogCall = () => {
    if (!selectedLead) return;
    const message = callDraft.trim() || "Call logged.";

    logActivity({ leadId: selectedLead.id, type: "CALL_LOGGED", message });
    setCallDraft("");
    refreshActivity(selectedLead.id);
    toast({ title: "Call logged" });
  };

  const openFollowUpDialog = (lead: LeadRecord) => {
    setFollowUpLead(lead);
    setFollowUpDate(lead.nextFollowUpDate ? lead.nextFollowUpDate.slice(0, 10) : "");
    setFollowUpNote("");
  };

  const handleSaveFollowUp = () => {
    if (!followUpLead) return;
    if (!followUpDate) {
      toast({ title: "Select a follow-up date" });
      return;
    }
    setFollowUp(followUpLead.id, followUpDate, followUpNote);
    refreshLeads();
    if (selectedLeadId === followUpLead.id) refreshActivity(followUpLead.id);
    setFollowUpLead(null);
    setFollowUpDate("");
    setFollowUpNote("");
    toast({ title: "Follow-up saved" });
  };

  const handleMarkFollowUpDone = (leadId: string) => {
    markFollowUpDone(leadId);
    refreshLeads();
    if (selectedLeadId === leadId) refreshActivity(leadId);
    toast({ title: "Follow-up marked done" });
  };

  const handleSaveContact = (lead: LeadRecord) => {
    const nextEmail = (emailDraft ?? "").trim();
    const nextLocation = (locationDraft ?? "").trim();
    const changedEmail = nextEmail !== (lead.email ?? "");
    const changedLocation = nextLocation !== (lead.location ?? "");
    if (!changedEmail && !changedLocation) {
      toast({ title: "No changes to save" });
      return;
    }

    upsertLead({
      ...lead,
      email: nextEmail,
      location: nextLocation,
      updatedAt: new Date().toISOString(),
    });

    if (changedEmail) {
      logActivity({
        leadId: lead.id,
        type: "LEAD_UPDATED",
        message: "Email updated",
      });
    }
    if (changedLocation) {
      logActivity({
        leadId: lead.id,
        type: "LEAD_UPDATED",
        message: "Location updated",
      });
    }

    refreshLeads();
    refreshActivity(lead.id);
    toast({ title: "Contact updated" });
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Advanced CRM</h1>
            <p className="text-sm text-gray-600">
              Pipeline status, activity timeline, and quotation summary.
            </p>
          </div>
          <Button
            onClick={() => navigate("/start-quotation")}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            New Lead
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-lg text-gray-900">Leads</CardTitle>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name / mobile / source"
                  className="w-64"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "ALL")}
                  className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                >
                  <option value="ALL">All statuses</option>
                  {PIPELINE.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Name</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Mobile</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Email</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Location</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Source</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Follow-up</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Quote</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredLeads.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                        No leads found.
                      </td>
                    </tr>
                  )}

                  {filteredLeads.map((lead) => {
                    const quote = getQuoteSummaryByLead(lead.id);
                    const quoteStatus = quote?.status ?? (lead.quoteId ? "DRAFT" : null);

                    return (
                      <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-900">{lead.name}</td>
                    <td className="px-3 py-2 text-gray-700">{lead.mobile}</td>
                    <td className="px-3 py-2 text-gray-700 break-words max-w-[180px]">
                      {lead.email?.trim() ? lead.email : "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-700 break-words max-w-[180px]">
                      {lead.location?.trim() ? lead.location : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className="uppercase text-xs font-semibold text-gray-600">
                        {lead.source || "website"}
                      </span>
                    </td>

                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Badge className={leadStatusBadgeClass(lead.status)} variant="secondary">
                              {lead.status}
                            </Badge>
                            <select
                              value={lead.status}
                              onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                              className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs"
                              aria-label="Lead status"
                            >
                              {PIPELINE.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td className="px-3 py-2">
                          {(() => {
                            const status = followUpIndicator(lead);
                            return (
                              <div className="flex items-center gap-2">
                                <span className={status.color}>
                                  {status.icon}{" "}
                                  {lead.nextFollowUpDate
                                    ? new Date(lead.nextFollowUpDate).toLocaleDateString()
                                    : "Not set"}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openFollowUpDialog(lead)}
                                >
                                  Set / Change
                                </Button>
                              </div>
                            );
                          })()}
                        </td>

                        <td className="px-3 py-2">
                          {quoteStatus ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {quote?.amount != null ? `INR ${quote.amount.toLocaleString()}` : "INR —"}
                              </span>
                              <Badge className={quoteBadgeClass(quoteStatus)} variant="secondary">
                                {quoteStatus}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>

                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedLeadId(lead.id)}
                            >
                              Open Lead
                            </Button>
                            <Button size="sm" onClick={() => handleCreateOrViewQuotation(lead)}>
                              {lead.quoteId ? "View Quotation" : "Create Quotation"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedLeadId} onOpenChange={(open) => !open && setSelectedLeadId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
            <DialogDescription>Lead profile, quotation summary, and activity timeline.</DialogDescription>
          </DialogHeader>

          {!selectedLead ? (
            <div className="text-sm text-gray-600">Lead not found.</div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-xs font-semibold text-gray-500">Name</div>
                  <div className="text-sm font-medium text-gray-900">{selectedLead.name}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-xs font-semibold text-gray-500">Mobile</div>
                  <div className="text-sm font-medium text-gray-900">{selectedLead.mobile}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-xs font-semibold text-gray-500">Source</div>
                  <div className="text-sm font-medium text-gray-900 uppercase">
                    {selectedLead.source}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-xs font-semibold text-gray-500">Email</div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedLead.email?.trim() ? selectedLead.email : "—"}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-xs font-semibold text-gray-500">Location</div>
                  <div className="text-sm font-medium text-gray-900">
                    {selectedLead.location?.trim() ? selectedLead.location : "—"}
                    {selectedLead.latitude != null && selectedLead.longitude != null && (
                      <div className="text-xs text-blue-600">
                        <a
                          href={`https://www.google.com/maps?q=${selectedLead.latitude},${selectedLead.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open in Google Maps
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="text-xs font-semibold text-gray-500">Status</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className={leadStatusBadgeClass(selectedLead.status)} variant="secondary">
                      {selectedLead.status}
                    </Badge>
                    <select
                      value={selectedLead.status}
                      onChange={(e) =>
                        handleStatusChange(selectedLead.id, e.target.value as LeadStatus)
                      }
                      className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs"
                    >
                      {PIPELINE.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Quotation Summary</div>
                    <div className="text-xs text-gray-600">Latest quote amount + status.</div>
                  </div>
                  <Button size="sm" onClick={() => handleCreateOrViewQuotation(selectedLead)}>
                    {selectedLead.quoteId ? "Open Quotation" : "Create Quotation"}
                  </Button>
                </div>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {(() => {
                    const quote = getQuoteSummaryByLead(selectedLead.id);
                    const status = quote?.status ?? (selectedLead.quoteId ? "DRAFT" : null);
                    if (!status) return <span className="text-sm text-gray-600">No quote yet.</span>;

                    return (
                      <>
                        <span className="text-sm font-semibold text-gray-900">
                          {quote?.amount != null ? `INR ${quote.amount.toLocaleString()}` : "INR —"}
                        </span>
                        <Badge className={quoteBadgeClass(status)} variant="secondary">
                          {status}
                        </Badge>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Activity Timeline</div>
                    <div className="text-xs text-gray-600">Latest first</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Created: {formatWhen(selectedLead.createdAt)} • Updated: {formatWhen(selectedLead.updatedAt)}
                  </div>
                </div>

                <div className="mt-3 space-y-2 max-h-64 overflow-auto pr-1">
                  {activity.length === 0 ? (
                    <div className="text-sm text-gray-600">No activity yet.</div>
                  ) : (
                    activity.map((ev) => (
                      <div key={ev.id} className="rounded-md border border-gray-200 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-semibold text-gray-700">
                            {formatActivityType(ev.type)}
                          </div>
                          <div className="text-xs text-gray-500">{formatWhen(ev.at)}</div>
                        </div>
                        <div className="text-sm text-gray-800 mt-1">{ev.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 space-y-3">
                <div className="text-sm font-semibold text-gray-900">Contact Details</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-gray-600">Email</div>
                    <Input
                      type="email"
                      value={emailDraft}
                      onChange={(e) => setEmailDraft(e.target.value)}
                      placeholder="customer@email.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-gray-600">Location / Site</div>
                    <Input
                      value={locationDraft}
                      onChange={(e) => setLocationDraft(e.target.value)}
                      placeholder="City or site address"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const changedEmail = (emailDraft ?? "").trim() !== (selectedLead.email ?? "");
                      const changedLocation = (locationDraft ?? "").trim() !== (selectedLead.location ?? "");
                      const nextLead: LeadRecord = {
                        ...selectedLead,
                        email: (emailDraft ?? "").trim(),
                        location: (locationDraft ?? "").trim(),
                        updatedAt: new Date().toISOString(),
                      };
                      upsertLead(nextLead);
                      if (changedEmail) {
                        logActivity({
                          leadId: selectedLead.id,
                          type: "LEAD_UPDATED",
                          message: "Email updated",
                        });
                      }
                      if (changedLocation) {
                        logActivity({
                          leadId: selectedLead.id,
                          type: "LEAD_UPDATED",
                          message: "Location updated",
                        });
                      }
                      refreshLeads();
                      refreshActivity(selectedLead.id);
                      toast({ title: "Contact updated" });
                    }}
                  >
                    Save Contact
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3 space-y-3">
                <div className="text-sm font-semibold text-gray-900">Next Follow-up</div>
                <div className="text-sm text-gray-700 flex items-center gap-2">
                  {(() => {
                    const status = followUpIndicator(selectedLead);
                    return (
                      <>
                        <span className={status.color}>{status.icon}</span>
                        <span>
                          {selectedLead.nextFollowUpDate
                            ? new Date(selectedLead.nextFollowUpDate).toLocaleDateString()
                            : "Not set"}
                        </span>
                      </>
                    );
                  })()}
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="md:w-48"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!followUpDate) {
                          toast({ title: "Select a follow-up date" });
                          return;
                        }
                        setFollowUp(selectedLead.id, followUpDate);
                        refreshLeads();
                        refreshActivity(selectedLead.id);
                        toast({ title: "Follow-up saved" });
                      }}
                    >
                      Save Follow-up
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkFollowUpDone(selectedLead.id)}
                    >
                      Mark Done
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 p-3 space-y-2">
                  <div className="text-sm font-semibold text-gray-900">Add Note</div>
                  <Textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Type a note…"
                    className="min-h-[90px]"
                  />
                  <Button size="sm" onClick={handleAddNote}>
                    Add Note
                  </Button>
                </div>
                <div className="rounded-lg border border-gray-200 p-3 space-y-2">
                  <div className="text-sm font-semibold text-gray-900">Log Call</div>
                  <Textarea
                    value={callDraft}
                    onChange={(e) => setCallDraft(e.target.value)}
                    placeholder="Optional call notes…"
                    className="min-h-[90px]"
                  />
                  <Button size="sm" variant="outline" onClick={handleLogCall}>
                    Log Call
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLeadId(null)}>
              Close
            </Button>
            {selectedLead && (
              <Button onClick={() => handleCreateOrViewQuotation(selectedLead)}>
                {selectedLead.quoteId ? "Open Quotation" : "Create Quotation"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!followUpLead} onOpenChange={(open) => !open && setFollowUpLead(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Follow-up</DialogTitle>
            <DialogDescription>Schedule the next follow-up for this lead.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-600">Date</div>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-600">Note (optional)</div>
              <Textarea
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                placeholder="Add a short reminder note"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpLead(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFollowUp}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
