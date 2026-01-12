import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Sparkles, Plus, Trash2, PanelLeftClose, PanelLeft, User, Building2, ArrowLeft } from "lucide-react";
import { useVisualQuotationStore } from "../store/visualQuotationStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Components
import ViewToggle from "../components/ViewToggle/ViewToggle";
import RoomInputCompact from "../components/RoomInput/RoomInputCompact";
import UnitsCompact from "../components/Wardrobe/UnitsCompact";
import LaminateCompact from "../components/Materials/LaminateCompact";
import PriceCompact from "../components/Pricing/PriceCompact";
import ExportCompact from "../components/Export/ExportCompact";
import ApprovalBar from "../components/Approval/ApprovalBar";
import CanvasStage from "../components/Canvas/CanvasStage";

const VisualQuotationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const syncFromUrl = useVisualQuotationStore((s) => s.syncFromUrl);
  const resetAll = useVisualQuotationStore((s) => s.resetAll);
  const status = useVisualQuotationStore((s) => s.status);
  const client = useVisualQuotationStore((s) => s.client);
  const setClientField = useVisualQuotationStore((s) => s.setClientField);
  const leadId = searchParams.get("leadId");
  const quoteId = searchParams.get("quoteId");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const locked = status === "APPROVED";

  useEffect(() => {
    syncFromUrl({ leadId, quoteId });
  }, [leadId, quoteId, syncFromUrl]);

  const handleNew = () => {
    if (window.confirm("Start a new quotation? Current data will be cleared.")) {
      resetAll();
    }
  };

  const handleDelete = () => {
    if (window.confirm("Delete all data? This cannot be undone.")) {
      resetAll();
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      {/* Header - Enhanced with subtle gradient */}
      <header className="flex-shrink-0 h-11 bg-gradient-to-r from-slate-800 via-slate-800 to-slate-800/95 border-b border-slate-700/80 shadow-lg">
        <div className="h-full px-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700 transition-all duration-200"
              onClick={() => navigate("/")}
              title="Back to Home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            {/* Sidebar Toggle - Enhanced */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 w-7 p-0 transition-all duration-200",
                sidebarCollapsed
                  ? "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              )}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            >
              {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>

            {/* Logo & Title - Enhanced */}
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-sm font-bold text-white leading-none tracking-tight">Visual Quotation</h1>
                <span className="text-[9px] text-slate-500 leading-none mt-0.5">Design Studio</span>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-slate-700/50 mx-1" />

            {/* Action Buttons - Enhanced */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] px-2.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-200 font-medium"
                onClick={handleNew}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] px-2.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-200 font-medium"
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          {/* Client & Project Name - Enhanced with icons */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <User className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
              <Input
                type="text"
                placeholder="Client Name"
                value={client.name}
                onChange={(e) => setClientField("name", e.target.value)}
                disabled={locked}
                className="h-7 w-40 text-[11px] pl-7 pr-2 bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200 rounded-md"
              />
            </div>
            <div className="relative">
              <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
              <Input
                type="text"
                placeholder="Project / Site"
                value={client.location}
                onChange={(e) => setClientField("location", e.target.value)}
                disabled={locked}
                className="h-7 w-40 text-[11px] pl-7 pr-2 bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200 rounded-md"
              />
            </div>
          </div>

          <ViewToggle />
        </div>
      </header>

      {/* Main Content - Cinema Theater Layout */}
      <main className="flex-1 flex min-h-0">
        {/* Left Sidebar - Enhanced with smooth animation */}
        <aside
          className={cn(
            "flex-shrink-0 bg-gradient-to-b from-slate-800 to-slate-800/95 border-r border-slate-700/60 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent",
            sidebarCollapsed ? "w-0 p-0 opacity-0" : "w-[340px] p-2"
          )}
        >
          {!sidebarCollapsed && (
            <>
              {/* Row 1: Room Input */}
              <RoomInputCompact />

              {/* Row 2: Units */}
              <UnitsCompact />

              {/* Row 3: Laminate + Price */}
              <div className="flex gap-1.5">
                <LaminateCompact />
                <PriceCompact />
              </div>

              {/* Row 4: Export */}
              <ExportCompact />
            </>
          )}
        </aside>

        {/* Canvas Area - Enhanced with subtle background */}
        <div className="flex-1 min-w-0 min-h-0 p-1.5 flex flex-col overflow-hidden relative">
          <CanvasStage />
        </div>
      </main>

      {/* Approval Bar - Fixed Bottom */}
      <ApprovalBar />
    </div>
  );
};

export default VisualQuotationPage;
