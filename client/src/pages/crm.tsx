import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PinLock, { clearPin } from "@/components/guards/PinLock";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  getAllQuotesByLead,
  getAppointmentsByLead,
  updateAppointmentStatus,
  logActivity,
  upsertLead,
  clearCrmCache,
} from "@/modules/crm/storage";
import { clearEncryption } from "@/modules/crm/crypto";
import type { AppointmentStatus, LeadRecord, LeadStatus } from "@/modules/crm/types";
import { generateUUID } from "@/lib/uuid";
import {
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Plus,
  Search,
  Filter,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  IndianRupee,
  MessageSquare,
  PhoneCall,
  ExternalLink,
  ChevronRight,
  Share2,
  CalendarCheck,
  CalendarClock,
  Download,
  Trash2,
  BarChart3,
  Percent,
  Target,
  KeyRound,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Error Boundary
import { CRMErrorBoundary } from "@/components/errors/CRMErrorBoundary";

// Custom hooks
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useDebounce } from "@/hooks/useDebounce";

// Extracted hooks
import { useCRMState } from "@/features/crm/hooks/useCRMState";
import { useCRMStats } from "@/features/crm/hooks/useCRMStats";
import { useLeadOperations } from "@/features/crm/hooks/useLeadOperations";

// Extracted utilities
import { formatWhen, formatRelativeDate, formatActivityType, quoteBadgeClass } from "@/features/crm/utils/formatters";
import { exportLeadsToCSV } from "@/features/crm/utils/exportHelpers";
import { generateWhatsAppLink } from "@/features/crm/utils/whatsappHelpers";
import { PIPELINE, PIPELINE_CONFIG, APPOINTMENT_STATUS_CONFIG, followUpIndicator } from "@/features/crm/utils/crmConfig";

function safeId(prefix: string) {
  return `${prefix}-${generateUUID()}`;
}

export default function CrmPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // PIN Lock state
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Use custom hooks
  const crmState = useCRMState();
  const {
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
  } = crmState;

  // Debounced search for better performance
  const debouncedSearch = useDebounce(search, 300);

  // Use statistics hook with debounced search
  const { pipelineStats, dashboardStats, filteredLeads } = useCRMStats(leads, debouncedSearch, statusFilter);

  // Use operations hook
  const leadOperations = useLeadOperations({
    refreshLeads,
    refreshActivity,
    selectedLeadId,
  });

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
    navigate(`/quotation-maker?leadId=${lead.id}`);
  };

  const handleAddNote = () => {
    if (!selectedLead) return;
    leadOperations.handleAddNote(selectedLead.id, noteDraft);
    setNoteDraft("");
  };

  const handleLogCall = () => {
    if (!selectedLead) return;
    leadOperations.handleLogCall(selectedLead.id, callDraft);
    setCallDraft("");
  };

  const openFollowUpDialog = (lead: LeadRecord) => {
    setFollowUpLead(lead);
    setFollowUpDate(lead.nextFollowUpDate ? lead.nextFollowUpDate.slice(0, 10) : "");
    setFollowUpNote("");
  };

  const handleSaveFollowUp = () => {
    if (!followUpLead) return;
    leadOperations.handleSaveFollowUp(followUpLead.id, followUpDate, followUpNote);
    setFollowUpLead(null);
    setFollowUpDate("");
    setFollowUpNote("");
  };

  const handleExportLeads = () => {
    exportLeadsToCSV(leads);
    toast({ title: "Leads exported", description: `${leads.length} leads exported to CSV` });
  };

  const handleAddNewLead = () => {
    const newLead: LeadRecord = {
      id: generateUUID(),
      name: "New Lead",
      mobile: "",
      status: "NEW",
      source: "Manual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    upsertLead(newLead);
    refreshLeads();
    setSelectedLeadId(newLead.id);
    toast({ title: "New lead created" });
  };

  // Keyboard shortcuts
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  useKeyboardShortcuts([
    {
      key: "n",
      ctrl: true,
      description: "Create new lead",
      handler: handleAddNewLead,
    },
    {
      key: "f",
      ctrl: true,
      description: "Focus search",
      handler: () => searchInputRef.current?.focus(),
    },
    {
      key: "e",
      ctrl: true,
      description: "Export leads",
      handler: handleExportLeads,
    },
    {
      key: "Escape",
      description: "Close detail view",
      handler: () => setSelectedLeadId(null),
    },
  ]);

  const handleDeleteLead = (lead: LeadRecord) => {
    leadOperations.handleDeleteLead(lead);
    setDeleteConfirmLead(null);
    setSelectedLeadId(null);
  };

  const handleResetPin = () => {
    clearPin();
    clearEncryption();
    clearCrmCache();
    setShowResetPinDialog(false);
    setIsUnlocked(false);
    toast({ title: "PIN Reset", description: "Please set a new PIN" });
  };

  // Show PIN lock screen if not unlocked
  if (!isUnlocked) {
    return <PinLock onUnlock={() => setIsUnlocked(true)} />;
  }

  // Show loading spinner while data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-600">Loading CRM data...</p>
        </div>
      </div>
    );
  }

  // Show error state if data failed to load
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle>Error Loading CRM</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">Failed to load CRM data. Please try again.</p>
            {error.message && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-sm text-red-800">{error.message}</p>
              </div>
            )}
            <Button onClick={() => refreshLeads()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100">
      {/* Skip Links for Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Skip to main content
      </a>
      <a
        href="#leads-table"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-40 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Skip to leads table
      </a>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">CRM</h1>
                  <p className="text-xs text-slate-500">Manage your leads & quotations</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                <Input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search leads..."
                  className="w-64 pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                  aria-label="Search leads by name, mobile, or source"
                  role="searchbox"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as LeadStatus | "ALL")}
              >
                <SelectTrigger className="w-40 h-9 bg-slate-50 border-slate-200">
                  <Filter className="h-4 w-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {PIPELINE.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2">
                        {PIPELINE_CONFIG[s].icon}
                        {PIPELINE_CONFIG[s].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Export Button */}
              <Button
                variant="outline"
                onClick={handleExportLeads}
                className="h-9"
                aria-label="Export leads to CSV (Ctrl+E)"
              >
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                Export
              </Button>

              {/* Settings/Reset PIN */}
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-slate-500 hover:text-slate-900"
                onClick={() => setShowResetPinDialog(true)}
                title="Reset PIN"
                aria-label="Reset PIN"
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" />
              </Button>

              {/* New Lead Button */}
              <Button
                onClick={handleAddNewLead}
                className="h-9 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-500/20"
                aria-label="Create new lead (Ctrl+N)"
              >
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                New Lead
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Leads This Month
            </div>
            <div className="text-3xl font-bold text-slate-900">{dashboardStats.leadsThisMonth}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
              <Percent className="h-4 w-4 text-emerald-500" />
              Conversion Rate
            </div>
            <div className="text-3xl font-bold text-emerald-600">{dashboardStats.conversionRate}%</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
              <IndianRupee className="h-4 w-4 text-amber-500" />
              Avg Quote Value
            </div>
            <div className="text-3xl font-bold text-slate-900 flex items-center">
              <IndianRupee className="h-6 w-6" />
              {dashboardStats.avgQuoteValue > 0
                ? (dashboardStats.avgQuoteValue / 1000).toFixed(0) + "K"
                : "0"}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Follow-ups Due
            </div>
            <div className={cn(
              "text-3xl font-bold",
              dashboardStats.followUpsDueToday > 0 ? "text-red-600" : "text-slate-900"
            )}>
              {dashboardStats.followUpsDueToday}
            </div>
          </div>
        </div>

        {/* Pipeline Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {PIPELINE.map((status) => {
            const config = PIPELINE_CONFIG[status];
            const stat = pipelineStats[status];
            const isActive = statusFilter === status;

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(isActive ? "ALL" : status)}
                className={cn(
                  "relative p-3 rounded-xl border transition-all duration-200 text-left group",
                  isActive
                    ? "ring-2 ring-indigo-500 ring-offset-2 border-transparent"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-md",
                  "bg-white"
                )}
              >
                <div className={cn("flex items-center gap-1.5 text-xs font-medium mb-1", config.color)}>
                  {config.icon}
                  {config.label}
                </div>
                <div className="text-2xl font-bold text-slate-900">{stat.count}</div>
                {stat.value > 0 && (
                  <div className="text-xs text-slate-500 flex items-center gap-0.5 mt-0.5">
                    <IndianRupee className="h-3 w-3" />
                    {(stat.value / 1000).toFixed(0)}K
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Leads Table */}
        <Card id="leads-table" className="border-slate-200/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Leads
                <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-600">
                  {filteredLeads.length}
                </Badge>
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Lead</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Follow-up</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Quotations</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-slate-300" />
                          <p className="text-sm text-slate-500">No leads found</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/start-quotation")}
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add your first lead
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {filteredLeads.map((lead) => {
                    const allQuotes = getAllQuotesByLead(lead.id);
                    const quoteCount = allQuotes.length;
                    const approvedCount = allQuotes.filter(q => q.status === "APPROVED").length;
                    const totalAmount = allQuotes.reduce((sum, q) => sum + (q.amount || 0), 0);
                    const followUp = followUpIndicator(lead);
                    const statusConfig = PIPELINE_CONFIG[lead.status];

                    return (
                      <tr
                        key={lead.id}
                        className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedLeadId(lead.id)}
                      >
                        {/* Lead Info */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-indigo-700">
                                {lead.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 truncate">{lead.name}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                <span className="uppercase">{lead.source || "website"}</span>
                                <span className="text-slate-300">•</span>
                                <span>{formatRelativeDate(lead.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm text-slate-700">
                              <a
                                href={`tel:${lead.mobile.replace(/\D/g, "")}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 hover:text-green-600 transition-colors"
                                title="Click to call"
                              >
                                <Phone className="h-3.5 w-3.5 text-green-500" />
                                {lead.mobile}
                              </a>
                            </div>
                            {lead.email && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate max-w-[180px]">
                                <Mail className="h-3 w-3 text-slate-400" />
                                {lead.email}
                              </div>
                            )}
                            {(lead.latitude && lead.longitude) && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${lead.latitude},${lead.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium"
                              >
                                <MapPin className="h-3 w-3" />
                                View Map
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={lead.status}
                            onValueChange={(v) => leadOperations.handleStatusChange(lead.id, v as LeadStatus)}
                          >
                            <SelectTrigger className={cn(
                              "h-8 w-[140px] border text-xs font-medium",
                              statusConfig.bgColor,
                              statusConfig.color
                            )}>
                              <span className="flex items-center gap-1.5">
                                {statusConfig.icon}
                                {statusConfig.label}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              {PIPELINE.map((s) => (
                                <SelectItem key={s} value={s}>
                                  <span className="flex items-center gap-2">
                                    {PIPELINE_CONFIG[s].icon}
                                    {PIPELINE_CONFIG[s].label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Follow-up */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openFollowUpDialog(lead)}
                            className={cn(
                              "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors",
                              followUp.bgColor,
                              followUp.color,
                              "hover:opacity-80"
                            )}
                          >
                            {followUp.icon}
                            <span className="font-medium">
                              {lead.nextFollowUpDate
                                ? new Date(lead.nextFollowUpDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                                : followUp.label}
                            </span>
                          </button>
                        </td>

                        {/* Quotations */}
                        <td className="px-4 py-3">
                          {quoteCount === 0 ? (
                            <span className="text-sm text-slate-400">-</span>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 flex items-center">
                                  <IndianRupee className="h-3.5 w-3.5" />
                                  {totalAmount.toLocaleString("en-IN")}
                                </span>
                                {approvedCount > 0 && (
                                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] px-1.5">
                                    {approvedCount} Approved
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-slate-500">
                                {quoteCount} quote{quoteCount !== 1 ? 's' : ''}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-slate-600 hover:text-slate-900"
                              onClick={() => setSelectedLeadId(lead.id)}
                            >
                              Details
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                            <a
                              href={generateWhatsAppLink(lead)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1 h-8 px-3 rounded-md bg-green-500 hover:bg-green-600 text-white text-xs font-medium transition-colors"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              Quick Form
                            </a>
                            <Button
                              size="sm"
                              className="h-8 bg-indigo-600 hover:bg-indigo-700"
                              onClick={() => handleCreateOrViewQuotation(lead)}
                            >
                              {lead.quoteId ? "Quotation" : "Create"}
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
      </main>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLeadId} onOpenChange={(open) => !open && setSelectedLeadId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                <span className="text-xl font-bold text-indigo-700">
                  {selectedLead?.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <DialogTitle className="text-xl">{selectedLead?.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <span className="uppercase text-xs font-medium text-slate-500">{selectedLead?.source}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500">Added {formatRelativeDate(selectedLead?.createdAt || "")}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {!selectedLead ? (
            <div className="text-sm text-slate-600 py-8 text-center">Lead not found.</div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                    <Phone className="h-3.5 w-3.5" />
                    Phone
                  </div>
                  <div className="text-sm font-medium text-slate-900">{selectedLead.mobile}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </div>
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {selectedLead.email || "-"}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Location
                  </div>
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {selectedLead.location || "-"}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                    <Target className="h-3.5 w-3.5" />
                    Status
                  </div>
                  <Select
                    value={selectedLead.status}
                    onValueChange={(v) => handleStatusChange(selectedLead.id, v as LeadStatus)}
                  >
                    <SelectTrigger className={cn(
                      "h-7 w-full mt-0.5 border text-xs font-medium",
                      PIPELINE_CONFIG[selectedLead.status].bgColor,
                      PIPELINE_CONFIG[selectedLead.status].color
                    )}>
                      <span className="flex items-center gap-1.5">
                        {PIPELINE_CONFIG[selectedLead.status].icon}
                        {PIPELINE_CONFIG[selectedLead.status].label}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="flex items-center gap-2">
                            {PIPELINE_CONFIG[s].icon}
                            {PIPELINE_CONFIG[s].label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Site Location Map */}
              {(selectedLead.latitude && selectedLead.longitude) && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-rose-50 to-orange-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-rose-500" />
                      <span className="font-semibold text-slate-900">Site Location</span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedLead.latitude},${selectedLead.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open in Google Maps
                    </a>
                  </div>
                  <div className="relative">
                    <iframe
                      src={`https://maps.google.com/maps?q=${selectedLead.latitude},${selectedLead.longitude}&t=&z=17&ie=UTF8&iwloc=&output=embed`}
                      width="100%"
                      height="200"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="w-full"
                    />
                    <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-xs text-slate-600 shadow-sm border border-slate-200/50">
                      <span className="font-medium">{selectedLead.latitude.toFixed(6)}, {selectedLead.longitude.toFixed(6)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quotation History */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-500" />
                    <span className="font-semibold text-slate-900">Quotations</span>
                  </div>
                  <Button size="sm" onClick={() => handleCreateOrViewQuotation(selectedLead)}>
                    {selectedLead.quoteId ? "Open Latest" : "Create New"}
                  </Button>
                </div>
                <div className="p-4">
                  {(() => {
                    const quotes = getAllQuotesByLead(selectedLead.id);
                    if (quotes.length === 0) {
                      return (
                        <div className="text-center py-6">
                          <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">No quotations yet</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {quotes.map((quote, idx) => (
                          <button
                            key={quote.quoteId}
                            className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 transition-colors text-left"
                            onClick={() => {
                              navigate(
                                `/visual-quotation?leadId=${encodeURIComponent(selectedLead.id)}&quoteId=${encodeURIComponent(quote.quoteId)}`
                              );
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                <span className="text-xs font-bold text-indigo-600">#{quotes.length - idx}</span>
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 flex items-center">
                                  <IndianRupee className="h-3.5 w-3.5" />
                                  {quote.amount.toLocaleString("en-IN")}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {new Date(quote.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={quoteBadgeClass(quote.status)}>
                                {quote.status}
                              </Badge>
                              <ExternalLink className="h-4 w-4 text-slate-400" />
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Follow-up Section */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold text-slate-900">Follow-up</span>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {(() => {
                      const status = followUpIndicator(selectedLead);
                      return (
                        <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", status.bgColor)}>
                          {status.icon}
                          <span className={cn("font-medium", status.color)}>
                            {selectedLead.nextFollowUpDate
                              ? new Date(selectedLead.nextFollowUpDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
                              : status.label}
                          </span>
                        </div>
                      );
                    })()}
                    <Input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-44"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!followUpDate) {
                          toast({ title: "Select a follow-up date" });
                          return;
                        }
                        leadOperations.handleSaveFollowUp(selectedLead.id, followUpDate);
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => leadOperations.handleMarkFollowUpDone(selectedLead.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Done
                    </Button>
                  </div>
                </div>
              </div>

              {/* Appointment Section */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-100 flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-indigo-500" />
                  <span className="font-semibold text-slate-900">Appointments</span>
                </div>
                <div className="p-4">
                  {(() => {
                    const appointments = getAppointmentsByLead(selectedLead.id);
                    if (appointments.length === 0) {
                      return (
                        <div className="text-center py-6">
                          <CalendarClock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-500 mb-3">No appointments scheduled</p>
                          <p className="text-xs text-slate-400">
                            Share the appointment link with the customer via WhatsApp
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {appointments.map((appt) => {
                          const statusConfig = APPOINTMENT_STATUS_CONFIG[appt.status];
                          const scheduledDate = new Date(appt.scheduledAt);

                          return (
                            <div
                              key={appt.id}
                              className="p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                                      <Calendar className="h-4 w-4 text-indigo-500" />
                                      {scheduledDate.toLocaleDateString("en-IN", {
                                        weekday: "short",
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                                      {scheduledDate.toLocaleTimeString("en-IN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                    {appt.secondaryMobile && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {appt.secondaryMobile}
                                      </span>
                                    )}
                                    {(appt.latitude && appt.longitude) && (
                                      <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${appt.latitude},${appt.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium"
                                      >
                                        <MapPin className="h-3 w-3" />
                                        View Location
                                      </a>
                                    )}
                                  </div>

                                  {appt.locationNote && (
                                    <p className="text-xs text-slate-500 mt-1.5">
                                      <span className="font-medium">Location:</span> {appt.locationNote}
                                    </p>
                                  )}
                                  {appt.customerNote && (
                                    <p className="text-xs text-slate-500 mt-1">
                                      <span className="font-medium">Note:</span> {appt.customerNote}
                                    </p>
                                  )}
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                  <Select
                                    value={appt.status}
                                    onValueChange={(v) => {
                                      updateAppointmentStatus(appt.id, v as AppointmentStatus);
                                      refreshLeads();
                                      refreshActivity(selectedLead.id);
                                      toast({ title: "Appointment status updated" });
                                    }}
                                  >
                                    <SelectTrigger className={cn(
                                      "h-7 w-[120px] border text-[10px] font-medium",
                                      statusConfig.bgColor,
                                      statusConfig.color
                                    )}>
                                      <span className="flex items-center gap-1">
                                        {statusConfig.icon}
                                        {statusConfig.label}
                                      </span>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as AppointmentStatus[]).map((s) => (
                                        <SelectItem key={s} value={s}>
                                          <span className="flex items-center gap-2">
                                            {APPOINTMENT_STATUS_CONFIG[s].icon}
                                            {APPOINTMENT_STATUS_CONFIG[s].label}
                                          </span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Contact Update */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="font-semibold text-slate-900">Update Contact</span>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1.5 block">Email</label>
                      <Input
                        type="email"
                        value={emailDraft}
                        onChange={(e) => setEmailDraft(e.target.value)}
                        placeholder="customer@email.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1.5 block">Location / Site</label>
                      <Input
                        value={locationDraft}
                        onChange={(e) => setLocationDraft(e.target.value)}
                        placeholder="City or site address"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="mt-3"
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
                        logActivity({ leadId: selectedLead.id, type: "LEAD_UPDATED", message: "Email updated" });
                      }
                      if (changedLocation) {
                        logActivity({ leadId: selectedLead.id, type: "LEAD_UPDATED", message: "Location updated" });
                      }
                      refreshLeads();
                      refreshActivity(selectedLead.id);
                      toast({ title: "Contact updated" });
                    }}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>

              {/* Quick Actions - Notes & Calls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-500" />
                    <span className="font-semibold text-slate-900">Add Note</span>
                  </div>
                  <div className="p-4">
                    <Textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="Type a note..."
                      className="min-h-[80px] resize-none"
                    />
                    <Button size="sm" className="mt-2" onClick={handleAddNote}>
                      Add Note
                    </Button>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                    <PhoneCall className="h-4 w-4 text-green-500" />
                    <span className="font-semibold text-slate-900">Log Call</span>
                  </div>
                  <div className="p-4">
                    <Textarea
                      value={callDraft}
                      onChange={(e) => setCallDraft(e.target.value)}
                      placeholder="Call notes (optional)..."
                      className="min-h-[80px] resize-none"
                    />
                    <Button size="sm" variant="outline" className="mt-2" onClick={handleLogCall}>
                      Log Call
                    </Button>
                  </div>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className="font-semibold text-slate-900">Activity Timeline</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Updated {formatRelativeDate(selectedLead.updatedAt)}
                  </span>
                </div>
                <div className="p-4 max-h-64 overflow-auto">
                  {activity.length === 0 ? (
                    <div className="text-center py-6">
                      <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">No activity yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activity.map((ev) => (
                        <div key={ev.id} className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                            {ev.type === "CALL_LOGGED" && <PhoneCall className="h-4 w-4 text-green-500" />}
                            {ev.type === "NOTE_ADDED" && <MessageSquare className="h-4 w-4 text-purple-500" />}
                            {ev.type === "STATUS_CHANGED" && <Target className="h-4 w-4 text-blue-500" />}
                            {ev.type === "QUOTE_CREATED" && <FileText className="h-4 w-4 text-indigo-500" />}
                            {ev.type === "QUOTE_APPROVED" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                            {!["CALL_LOGGED", "NOTE_ADDED", "STATUS_CHANGED", "QUOTE_CREATED", "QUOTE_APPROVED"].includes(ev.type) && (
                              <Clock className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-slate-600">
                                {formatActivityType(ev.type)}
                              </span>
                              <span className="text-xs text-slate-400">{formatWhen(ev.at)}</span>
                            </div>
                            <p className="text-sm text-slate-900 mt-0.5">{ev.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-slate-100 flex justify-between">
            <Button
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => selectedLead && setDeleteConfirmLead(selectedLead)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Lead
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedLeadId(null)}>
                Close
              </Button>
              {selectedLead && (
                <Button onClick={() => handleCreateOrViewQuotation(selectedLead)}>
                  {selectedLead.quoteId ? "Open Quotation" : "Create Quotation"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmLead} onOpenChange={(open) => !open && setDeleteConfirmLead(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Lead
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteConfirmLead?.name}</strong>? This will permanently remove:
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>Lead information</li>
                <li>All quotations</li>
                <li>All appointments</li>
                <li>Activity history</li>
              </ul>
              <span className="block mt-2 text-red-600 font-medium">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmLead(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmLead && handleDeleteLead(deleteConfirmLead)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={!!followUpLead} onOpenChange={(open) => !open && setFollowUpLead(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-500" />
              Schedule Follow-up
            </DialogTitle>
            <DialogDescription>
              Set a reminder to follow up with {followUpLead?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Date</label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Note (optional)</label>
              <Textarea
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                placeholder="Add a reminder note..."
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpLead(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFollowUp}>
              Save Follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset PIN Dialog */}
      <Dialog open={showResetPinDialog} onOpenChange={setShowResetPinDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-indigo-500" />
              Reset PIN
            </DialogTitle>
            <DialogDescription>
              This will remove your current PIN and allow you to set a new one.
              You'll need to enter a new PIN to access CRM.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowResetPinDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPin}>
              Reset PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
