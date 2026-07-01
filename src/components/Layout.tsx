import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useLiveStream } from "@/hooks/useLiveStream";
import {
  LayoutDashboard,
  Bug,
  BarChart3,
  Settings,
  Zap,
  Shield,
  LogOut,
  ChevronRight,
  FileText,
  AlertCircle,
  Loader2,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/providers/trpc";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0f]">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-[#0e0e18] border-r border-white/[0.06] transition-transform duration-300 md:relative md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Mobile Close Button */}
        <button 
          onClick={() => setSidebarOpen(false)}
          className="md:hidden absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/[0.05] rounded-md"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5">
          <div className="relative w-9 h-9 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-blue-500 rounded-lg opacity-80" />
            <Zap className="relative w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight">
              Bug Triage Max
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono">
              AI-Powered
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-violet-500/10 text-violet-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                )}
              >
                <item.icon
                  className={cn(
                    "w-4.5 h-4.5 transition-colors",
                    isActive ? "text-violet-400" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span>{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* System Health Mini */}
        <div className="px-4 py-3 mx-3 mb-2">
          <div className="glass-card p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-muted-foreground">
                System Health
              </span>
            </div>
            <div className="space-y-1.5">
              {healthData ? (
                healthData.map((agent) => {
                  let statusColor = "text-emerald-400";
                  let bgPulse = "bg-emerald-400 animate-pulse";
                  let label = "Online";

                  if (agent.status === "error") {
                    statusColor = "text-red-400";
                    bgPulse = "bg-red-400";
                    label = "Error";
                  } else if (agent.status === "idle") {
                    statusColor = "text-muted-foreground";
                    bgPulse = "bg-muted-foreground/50";
                    label = "Idle";
                  } else if (agent.status === "running") {
                    statusColor = "text-blue-400";
                    bgPulse = "bg-blue-400 animate-pulse";
                    label = "Running";
                  }

                  return (
                    <div key={agent.agent} className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground capitalize">
                        {agent.agent}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${bgPulse}`} />
                        <span className={`text-[11px] ${statusColor}`}>{label}</span>
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User */}
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || "User"}
                className="w-8 h-8 rounded-full ring-1 ring-white/10"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-xs font-medium text-white">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {user?.name || "Guest"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {user?.email || "Not signed in"}
              </p>
            </div>
            {user && (
              <button
                onClick={logout}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/[0.06] bg-[#0e0e18]">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-400" />
            <h1 className="text-sm font-semibold text-white">Bug Triage Max</h1>
          </div>
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/[0.05] rounded-md"
          >
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
