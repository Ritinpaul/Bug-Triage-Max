import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { DemoBanner } from "@/components/DemoBanner";
import { useLiveStream } from "@/hooks/useLiveStream";
import {
  LayoutDashboard,
  Bug,
  BarChart3,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
  FileText,
  Loader2,
  Menu,
  Home,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/providers/trpc";
import { useTheme } from "@/providers/ThemeProvider";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/issues", label: "Issues", icon: Bug },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/release-notes", label: "Release Notes", icon: FileText },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  // Start global SSE listener
  useLiveStream();

  const { data: healthData } = trpc.agents.health.useQuery();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-b from-[#e0f0fc] to-[#f0f7ff] text-[#0f172a]">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-white/70 backdrop-blur-xl border-r border-[#0f172a]/08 transition-transform duration-300 md:relative md:translate-x-0 shadow-lg shadow-slate-900/5",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile Close Button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 px-6 py-5 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
            <Bug className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-800 tracking-tight leading-tight">Bug Triage Max</h1>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">AI-Powered</p>
          </div>
        </Link>

        {/* Back to Home */}
        <div className="px-3 mb-1">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 group border",
                  isActive
                    ? "bg-sky-500/10 text-sky-600 border-sky-500/20 shadow-sm shadow-sky-500/5"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-transparent"
                )}
              >
                <item.icon
                  className={cn(
                    "w-4.5 h-4.5 transition-colors",
                    isActive ? "text-sky-600" : "text-slate-400 group-hover:text-slate-900"
                  )}
                />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
              </Link>
            );
          })}
        </nav>

        {/* System Health */}
        <div className="px-4 py-3 mx-3 mb-2">
          <div className="glass-card p-3 rounded-2xl bg-white/50 border border-white/60">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-3.5 h-3.5 text-sky-500" />
              <span className="text-xs font-bold text-slate-500">System Health</span>
            </div>
            <div className="space-y-1.5">
              {healthData ? (
                healthData.map((agent) => {
                  let statusColor = "text-emerald-500";
                  let bgPulse = "bg-emerald-500 animate-pulse";
                  let label = "Online";

                  if (agent.status === "error") {
                    statusColor = "text-red-500";
                    bgPulse = "bg-red-500";
                    label = "Error";
                  } else if (agent.status === "idle") {
                    statusColor = "text-slate-400";
                    bgPulse = "bg-slate-300";
                    label = "Idle";
                  } else if (agent.status === "running") {
                    statusColor = "text-sky-500";
                    bgPulse = "bg-sky-500 animate-pulse";
                    label = "Running";
                  }

                  return (
                    <div key={agent.agent} className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium capitalize">{agent.agent}</span>
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${bgPulse}`} />
                        <span className={`text-[11px] font-bold ${statusColor}`}>{label}</span>
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="px-6 py-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 text-slate-500 hover:text-slate-900 transition-colors w-full text-left"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-sm font-semibold">Toggle Theme</span>
          </button>
        </div>

        {/* User */}
        <div className="px-4 py-3 border-t border-[#0f172a]/08">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name || "User"} className="w-8 h-8 rounded-full ring-1 ring-slate-100" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-sky-500/20">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">{user?.name || "Guest"}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || "Not signed in"}</p>
            </div>
            {user && (
              <button onClick={logout} className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Demo Banner */}
        <DemoBanner />

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-[#0f172a]/08 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center">
              <Bug className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-sm font-black text-slate-800">Bug Triage Max</h1>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md">
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="page-enter">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
