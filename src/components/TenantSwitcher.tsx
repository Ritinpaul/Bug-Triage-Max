import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { Loader2, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

export function TenantSwitcher() {
  const { data: tenants, isLoading } = trpc.tenants.list.useQuery();
  const [activeTenant, setActiveTenant] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("bugpulse_tenant_id");
    if (saved) {
      setActiveTenant(saved);
    } else if (tenants && tenants.length > 0) {
      // Default to first tenant if none saved
      const firstId = String(tenants[0].id);
      setActiveTenant(firstId);
      localStorage.setItem("bugpulse_tenant_id", firstId);
      // Reload to apply trpc headers
      window.location.reload();
    }
  }, [tenants]);

  const handleSwitch = (id: string) => {
    localStorage.setItem("bugpulse_tenant_id", id);
    setActiveTenant(id);
    window.location.reload(); // Reload to refresh all queries with new header
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-3">
        <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
      </div>
    );
  }

  if (!tenants || tenants.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-2 border-t border-[#0f172a]/08 dark:border-white/10">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Workspace</span>
      </div>
      <select
        value={activeTenant || ""}
        onChange={(e) => handleSwitch(e.target.value)}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-md p-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
      >
        {tenants.map(t => (
          <option key={t.id} value={String(t.id)}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
