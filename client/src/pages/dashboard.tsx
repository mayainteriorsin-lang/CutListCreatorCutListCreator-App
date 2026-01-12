import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  Settings,
  Palette,
  Table2,
  FileText,
  Users,
  ArrowRight,
  TrendingUp,
  Layers,
  CheckCircle2,
} from "lucide-react";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    cabinets: 0,
    panels: 0,
    quotations: 0,
  });

  // Load stats from localStorage
  useEffect(() => {
    try {
      // Count cabinets from autosave
      const autosave = localStorage.getItem("cutlist_autosave_v1");
      if (autosave) {
        const data = JSON.parse(autosave);
        setStats((prev) => ({
          ...prev,
          cabinets: data.cabinets?.length || 0,
        }));
      }

      // Count panels from spreadsheet
      const spreadsheet = localStorage.getItem("cutlist_spreadsheet_v1");
      if (spreadsheet) {
        const data = JSON.parse(spreadsheet);
        setStats((prev) => ({
          ...prev,
          panels: Array.isArray(data) ? data.length : 0,
        }));
      }

      // Count quotations
      const quotations = localStorage.getItem("quotations_v1");
      if (quotations) {
        const data = JSON.parse(quotations);
        setStats((prev) => ({
          ...prev,
          quotations: Array.isArray(data) ? data.length : 0,
        }));
      }
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  }, []);

  const quickActions = [
    {
      title: "Cabinet Builder",
      description: "Create cutting lists for cabinets",
      icon: <Package className="w-6 h-6" />,
      gradient: "from-amber-500 to-orange-500",
      shadow: "shadow-amber-500/25",
      path: "/cabinets",
    },
    {
      title: "Visual Quotation",
      description: "Design rooms with advanced tools",
      icon: <i className="fas fa-drafting-compass text-xl"></i>,
      gradient: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/25",
      path: "/visual-quotation",
    },
    {
      title: "Spreadsheet",
      description: "Edit panel data directly",
      icon: <Table2 className="w-6 h-6" />,
      gradient: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/25",
      path: "/spreadsheet",
    },
    {
      title: "Design Center",
      description: "Visual cabinet designer",
      icon: <Palette className="w-6 h-6" />,
      gradient: "from-purple-500 to-pink-500",
      shadow: "shadow-purple-500/25",
      path: "/design",
    },
  ];

  const businessTools = [
    {
      title: "Quotations",
      description: "Manage client quotations",
      icon: <FileText className="w-5 h-5" />,
      gradient: "from-cyan-500 to-blue-500",
      path: "/quotations",
      count: stats.quotations,
    },
    {
      title: "CRM",
      description: "Customer relationships",
      icon: <Users className="w-5 h-5" />,
      gradient: "from-rose-500 to-red-500",
      path: "/crm",
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome to CutList Pro
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto">
            Your complete solution for cabinet cutting lists, visual quotations,
            and customer management.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-800">{stats.cabinets}</p>
                <p className="text-sm text-slate-500">Cabinets</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-800">{stats.panels}</p>
                <p className="text-sm text-slate-500">Panels</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-800">{stats.quotations}</p>
                <p className="text-sm text-slate-500">Quotations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="group bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5 hover:shadow-xl hover:shadow-slate-200/50 transition-all text-left"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg ${action.shadow} mb-4 group-hover:scale-110 transition-transform`}
                >
                  <span className="text-white">{action.icon}</span>
                </div>
                <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                  {action.title}
                </h3>
                <p className="text-sm text-slate-500">{action.description}</p>
                <div className="mt-3 flex items-center text-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                  <span>Open</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Business Tools */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Business Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {businessTools.map((tool) => (
              <button
                key={tool.path}
                onClick={() => navigate(tool.path)}
                className="group bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5 hover:shadow-xl hover:shadow-slate-200/50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}
                  >
                    <span className="text-white">{tool.icon}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-sm text-slate-500">{tool.description}</p>
                  </div>
                  {tool.count !== undefined && tool.count > 0 && (
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-600">
                      {tool.count}
                    </span>
                  )}
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Settings Card */}
        <Card className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-slate-200/50 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Master Settings</h3>
                  <p className="text-sm text-slate-500">
                    Configure default materials, sheet sizes, and optimization
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate("/settings")}
                className="border-slate-300"
              >
                <Settings className="w-4 h-4 mr-2" />
                Open Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100/50 rounded-2xl p-6">
          <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
            <i className="fas fa-lightbulb text-blue-500"></i>
            Quick Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>
                Use <strong>Cabinet Builder</strong> for standard cabinet cutting lists
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>
                Use <strong>Visual Quotation</strong> for complex room layouts
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>
                Configure <strong>Settings</strong> to set default materials
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
