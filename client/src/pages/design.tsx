import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DesignCenter from "@/components/ui/DesignCenter";
import { Palette, ArrowRight } from "lucide-react";

export default function DesignPage() {
  const navigate = useNavigate();

  const handleExportToForm = (data: { width: number; height: number; depth: number; name: string }) => {
    // Store in sessionStorage for the cabinets page to pick up
    sessionStorage.setItem('designCenterExport', JSON.stringify(data));
    navigate('/cabinets');
  };

  return (
    <AppLayout
      title="Design Center"
      subtitle="Create visual cabinet designs and export to the cabinet form"
      headerActions={
        <Button
          onClick={() => navigate("/cabinets")}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25"
        >
          <i className="fas fa-cube mr-2"></i>
          Go to Cabinets
        </Button>
      }
    >
      <div className="max-w-6xl mx-auto">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => navigate("/visual-quotation")}
            className="group p-4 bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-xl hover:shadow-lg hover:shadow-emerald-500/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <i className="fas fa-drafting-compass text-white text-sm"></i>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">Visual Quotation</h3>
                <p className="text-xs text-slate-500">Advanced room designer</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 ml-auto group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          <button
            onClick={() => navigate("/cabinets")}
            className="group p-4 bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-xl hover:shadow-lg hover:shadow-amber-500/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <i className="fas fa-cube text-white text-sm"></i>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-800 group-hover:text-amber-600 transition-colors">Cabinet Builder</h3>
                <p className="text-xs text-slate-500">Create cutting lists</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 ml-auto group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          <button
            onClick={() => navigate("/spreadsheet")}
            className="group p-4 bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-xl hover:shadow-lg hover:shadow-emerald-500/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <i className="fas fa-table text-white text-sm"></i>
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">Spreadsheet</h3>
                <p className="text-xs text-slate-500">Edit panel data</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 ml-auto group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        </div>

        {/* Design Center Card */}
        <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
          <CardHeader className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-slate-100">
            <CardTitle className="flex items-center gap-3 text-slate-800">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Palette className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-base font-semibold">Visual Designer</span>
                <p className="text-xs font-normal text-slate-500 mt-0.5">Create and customize cabinet designs visually</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <DesignCenter onExportToCutlist={handleExportToForm} />
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="mt-6 bg-gradient-to-r from-purple-50/50 to-pink-50/50 border-purple-100/50 rounded-2xl">
          <CardContent className="p-6">
            <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
              <i className="fas fa-lightbulb text-purple-500"></i>
              Design Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-purple-700">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600 flex-shrink-0 mt-0.5">1</span>
                <span>Use the visual designer to sketch your cabinet layout before adding dimensions</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600 flex-shrink-0 mt-0.5">2</span>
                <span>Click "Export to Form" to transfer your design to the cabinet builder</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600 flex-shrink-0 mt-0.5">3</span>
                <span>For complex rooms, try the Visual Quotation tool with advanced features</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
