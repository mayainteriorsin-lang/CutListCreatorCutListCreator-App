import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import DesignCenter from "@/modules/design";
import {
  Palette,
  Box,
  Sparkles,
  Home,
  Settings,
  Table2,
  FileText,
  Menu,
  X,
  Package,
  Library
} from "lucide-react";

export default function DesignPage() {
  const navigate = useNavigate();
  const [showNav, setShowNav] = useState(false);

  const handleExportToForm = (data: { width: number; height: number; depth: number; name: string }) => {
    sessionStorage.setItem('designCenterExport', JSON.stringify(data));
    navigate('/cabinets');
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-white flex flex-col">
      {/* Minimal Top Bar */}
      <div className="h-12 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Menu Toggle */}
          <button
            onClick={() => setShowNav(!showNav)}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            {showNav ? <X className="w-4 h-4 text-white" /> : <Menu className="w-4 h-4 text-white" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Palette className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-sm">Design Studio</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate("/visual-quotation")}
            className="text-white/70 hover:text-white hover:bg-white/10 text-xs"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Advanced
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/cabinets")}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs"
          >
            <Box className="w-3 h-3 mr-1" />
            Cabinet Builder
          </Button>
        </div>
      </div>

      {/* Floating Navigation Panel */}
      {showNav && (
        <div className="absolute top-14 left-4 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden w-48">
          <div className="p-2 space-y-1">
            <button
              onClick={() => { navigate("/"); setShowNav(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm transition-colors"
            >
              <Home className="w-4 h-4 text-blue-500" />
              Dashboard
            </button>
            <button
              onClick={() => { navigate("/cabinets"); setShowNav(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm transition-colors"
            >
              <Package className="w-4 h-4 text-amber-500" />
              Cabinets
            </button>
            <button
              onClick={() => { navigate("/library"); setShowNav(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm transition-colors"
            >
              <Library className="w-4 h-4 text-purple-500" />
              Library
            </button>
            <button
              onClick={() => { navigate("/spreadsheet"); setShowNav(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm transition-colors"
            >
              <Table2 className="w-4 h-4 text-emerald-500" />
              Spreadsheet
            </button>
            <button
              onClick={() => { navigate("/client-info"); setShowNav(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm transition-colors"
            >
              <FileText className="w-4 h-4 text-cyan-500" />
              Client Info
            </button>
            <button
              onClick={() => { navigate("/settings"); setShowNav(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 text-sm transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              Settings
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close nav */}
      {showNav && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNav(false)}
        />
      )}

      {/* Full-screen Design Canvas */}
      <div className="flex-1 overflow-hidden">
        <DesignCenter onExportToCutlist={handleExportToForm} />
      </div>
    </div>
  );
}
