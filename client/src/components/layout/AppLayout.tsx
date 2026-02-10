import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  Settings,
  Palette,
  Table2,
  Package,
  FileText,
  Users,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
  gradient: string;
}

const navItems: NavItem[] = [
  {
    path: "/",
    label: "Home",
    icon: <Home className="w-5 h-5" />,
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    path: "/cabinets",
    label: "Cabinets",
    icon: <Package className="w-5 h-5" />,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    path: "/settings",
    label: "Settings",
    icon: <Settings className="w-5 h-5" />,
    gradient: "from-slate-500 to-slate-600",
  },
  {
    path: "/design",
    label: "Design",
    icon: <Palette className="w-5 h-5" />,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    path: "/spreadsheet",
    label: "Spreadsheet",
    icon: <Table2 className="w-5 h-5" />,
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    path: "/library",
    label: "Library",
    icon: <BookOpen className="w-5 h-5" />,
    gradient: "from-indigo-500 to-blue-600",
  },
];

const secondaryNavItems: NavItem[] = [
  {
    path: "/client-info",
    label: "Client Info",
    icon: <FileText className="w-5 h-5" />,
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    path: "/crm",
    label: "CRM",
    icon: <Users className="w-5 h-5" />,
    gradient: "from-rose-500 to-red-500",
  },
];

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  headerActions?: ReactNode;
}

export default function AppLayout({
  children,
  title,
  subtitle,
  headerActions,
}: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-white/80 backdrop-blur-xl border-r border-slate-200/60 z-50 transition-all duration-300",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
              <i className="fas fa-layer-group text-white text-sm"></i>
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
                  CutList Pro
                </h1>
                <p className="text-[10px] text-slate-500 -mt-0.5 font-medium whitespace-nowrap">
                  Precision Cutting
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {/* Primary Nav */}
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                  isActive(item.path)
                    ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <span
                  className={cn(
                    "flex-shrink-0",
                    isActive(item.path)
                      ? "text-white"
                      : "text-slate-400 group-hover:text-slate-600"
                  )}
                >
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="py-3">
            <div className="border-t border-slate-200"></div>
          </div>

          {/* Secondary Nav */}
          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Business
              </p>
            )}
            {secondaryNavItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                  isActive(item.path)
                    ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <span
                  className={cn(
                    "flex-shrink-0",
                    isActive(item.path)
                      ? "text-white"
                      : "text-slate-400 group-hover:text-slate-600"
                  )}
                >
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-slate-600" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-slate-600" />
          )}
        </button>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "transition-all duration-300",
          collapsed ? "ml-[72px]" : "ml-64"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
          <div className="px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                {title && (
                  <h1 className="text-xl font-bold text-slate-900">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {headerActions}
                {user && (
                  <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                    <span className="text-sm text-slate-600">{user.email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
