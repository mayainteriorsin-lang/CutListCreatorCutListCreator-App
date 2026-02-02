import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { EMPTY_HOME_SUMMARY, type HomeSummary } from "@/application/home/home.contract";
import { getHomeSummary } from "@/application/home/home.service";
import {
  Plus,
  Search,
  Clock,
  FolderOpen,
  TrendingUp,
  Users,
  Package,
  FileText,
  Settings,
  Home,
  ChevronLeft,
  ChevronRight,
  Layers,
  PenTool,
  Box,
  Image,
  Table2,
  Palette,
  Factory,
  CreditCard,
  Zap,
  BookOpen,
} from "lucide-react";

type HomePageProps = {
  summary?: HomeSummary;
};

export default function HomePage({ summary }: HomePageProps) {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [stats, setStats] = useState<HomeSummary>(summary ?? EMPTY_HOME_SUMMARY);

  // Load stats from application service (read-only summary)
  useEffect(() => {
    if (summary) {
      setStats(summary);
      return;
    }

    setStats(getHomeSummary());
  }, [summary]);

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return amount.toLocaleString("en-IN");
  };

  // Main app pages - large icons
  const mainPages = [
    {
      path: "/2d-quotation",
      label: "2D Quotation",
      description: "Visual room design",
      icon: <PenTool className="w-8 h-8" />,
      gradient: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/30",
    },
    {
      path: "/3d-quotation",
      label: "3D Quotation",
      description: "3D room view",
      icon: <Box className="w-8 h-8" />,
      gradient: "from-violet-500 to-purple-500",
      shadow: "shadow-violet-500/30",
    },
    {
      path: "/cabinets",
      label: "Cabinets",
      description: "Cut list builder",
      icon: <Package className="w-8 h-8" />,
      gradient: "from-amber-500 to-orange-500",
      shadow: "shadow-amber-500/30",
    },
    {
      path: "/client-info",
      label: "Client Info",
      description: "Manage quotes",
      icon: <FileText className="w-8 h-8" />,
      gradient: "from-cyan-500 to-blue-500",
      shadow: "shadow-cyan-500/30",
    },
    {
      path: "/quick-quotation",
      label: "Quick Quote",
      description: "Fast quotation",
      icon: <Zap className="w-8 h-8" />,
      gradient: "from-amber-500 to-yellow-500",
      shadow: "shadow-amber-500/30",
    },
    {
      path: "/design",
      label: "Design Center",
      description: "Visual designer",
      icon: <Palette className="w-8 h-8" />,
      gradient: "from-pink-500 to-rose-500",
      shadow: "shadow-pink-500/30",
    },
    {
      path: "/library",
      label: "Library",
      description: "Module templates",
      icon: <BookOpen className="w-8 h-8" />,
      gradient: "from-indigo-500 to-blue-600",
      shadow: "shadow-indigo-500/30",
    },
    {
      path: "/spreadsheet",
      label: "Spreadsheet",
      description: "Panel data",
      icon: <Table2 className="w-8 h-8" />,
      gradient: "from-green-500 to-emerald-500",
      shadow: "shadow-green-500/30",
    },
    {
      path: "/2d-quotation/production",
      label: "Production",
      description: "Manufacturing view",
      icon: <Factory className="w-8 h-8" />,
      gradient: "from-slate-500 to-slate-700",
      shadow: "shadow-slate-500/30",
    },
    {
      path: "/crm",
      label: "CRM",
      description: "Client management",
      icon: <Users className="w-8 h-8" />,
      gradient: "from-rose-500 to-red-500",
      shadow: "shadow-rose-500/30",
    },
    {
      path: "/rate-cards",
      label: "Rate Cards",
      description: "Pricing configs",
      icon: <CreditCard className="w-8 h-8" />,
      gradient: "from-blue-500 to-indigo-600",
      shadow: "shadow-blue-500/30",
    },
    {
      path: "/settings",
      label: "Settings",
      description: "Configuration",
      icon: <Settings className="w-8 h-8" />,
      gradient: "from-gray-500 to-gray-700",
      shadow: "shadow-gray-500/30",
    },
  ];

  const sidebarNav = [
    { path: "/", label: "Home", icon: <Home className="w-5 h-5" />, gradient: "from-blue-500 to-indigo-500" },
    { path: "/2d-quotation", label: "2D Design", icon: <PenTool className="w-5 h-5" />, gradient: "from-emerald-500 to-teal-500" },
    { path: "/cabinets", label: "Cabinets", icon: <Package className="w-5 h-5" />, gradient: "from-amber-500 to-orange-500" },
    { path: "/settings", label: "Settings", icon: <Settings className="w-5 h-5" />, gradient: "from-slate-500 to-slate-600" },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Sidebar */}
      <aside className={cn(
        "flex-shrink-0 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-48"
      )}>
        {/* Logo */}
        <div className="h-14 flex items-center px-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
              <Layers className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <h1 className="text-sm font-bold text-slate-900 whitespace-nowrap">Design Studio</h1>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {sidebarNav.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-sm",
                location.pathname === item.path || (item.path === "/" && location.pathname === "/home")
                  ? `bg-gradient-to-r ${item.gradient} text-white shadow-md`
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="m-2 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 h-14 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <button
            onClick={() => navigate("/2d-quotation")}
            className="h-9 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/25 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col gap-5 overflow-hidden">
          {/* Stats Row */}
          <div className="flex-shrink-0 grid grid-cols-4 gap-4">
            <div className="bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.totalProjects}</p>
                <p className="text-xs text-slate-500">Projects</p>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.pendingQuotes}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">
                  <span className="text-base">₹</span>{formatCurrency(stats.thisMonthRevenue)}
                </p>
                <p className="text-xs text-slate-500">Revenue</p>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.activeClients}</p>
                <p className="text-xs text-slate-500">Clients</p>
              </div>
            </div>
          </div>

          {/* Quick Access - All Pages Grid */}
          <div className="flex-1 flex flex-col min-h-0">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Access</h2>
            <div className="grid grid-cols-4 xl:grid-cols-6 gap-3">
              {mainPages.map((page) => (
                <button
                  key={page.path}
                  onClick={() => navigate(page.path)}
                  className="group bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-xl p-3 hover:shadow-xl hover:shadow-slate-200/50 transition-all text-left flex flex-col items-center"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg mb-2 group-hover:scale-110 transition-transform",
                    page.gradient, page.shadow
                  )}>
                    <span className="text-white [&>svg]:w-6 [&>svg]:h-6">{page.icon}</span>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-xs text-center group-hover:text-blue-600 transition-colors">
                    {page.label}
                  </h3>
                  <p className="text-[10px] text-slate-500 text-center mt-0.5">{page.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
