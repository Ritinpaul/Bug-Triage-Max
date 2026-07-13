import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Shield,
  Github,
  Slack,
  Mail,
  Database,
  Brain,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Key,
  Webhook,
  GitPullRequest,
  Loader2,
  ExternalLink,
  Activity,
  Moon,
  Sun,
  Monitor
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { useTheme } from "@/providers/ThemeProvider";

const serviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  github: Github,
  slack: Slack,
  email: Mail,
  lemma: Database,
  llm: Brain,
};

const serviceLabels: Record<string, string> = {
  github: "GitHub",
  slack: "Slack",
  email: "Email IMAP",
  lemma: "Lemma SDK",
  llm: "Gemini AI",
};

const statusConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string }> = {
  online: { icon: CheckCircle2, color: "text-emerald-600 font-bold", bg: "bg-emerald-500/10", border: "border-emerald-500/20 shadow-sm" },
  offline: { icon: XCircle, color: "text-slate-400 font-semibold", bg: "bg-slate-100", border: "border-slate-200/80 shadow-sm" },
  degraded: { icon: AlertTriangle, color: "text-amber-600 font-bold", bg: "bg-amber-500/10", border: "border-amber-500/20 shadow-sm" },
  error: { icon: XCircle, color: "text-red-500 font-bold", bg: "bg-red-500/10", border: "border-red-500/20 shadow-sm" },
};

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [hasAutoUpgraded, setHasAutoUpgraded] = useState(false);
  const { data: integrations, refetch: refetchIntegrations } = trpc.integrations.list.useQuery();
  const { data: team } = trpc.team.list.useQuery();
  const { data: config } = trpc.integrations.config.useQuery();
  const { data: subStatus } = trpc.tenants.getSubscriptionStatus.useQuery();
  const verifyPayment = trpc.tenants.verifyRazorpayPayment.useMutation({
    onSuccess: () => {
      toast.success("Payment successful! You are now on the Pro plan.");
      // Optional: refetch subscription status if possible, or reload
      window.location.reload();
    },
    onError: (err) => toast.error(`Payment verification failed: ${err.message}`)
  });

  const createOrder = trpc.tenants.createRazorpayOrder.useMutation({
    onSuccess: async (data) => {
      const loadRazorpay = () => new Promise<boolean>((resolve) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });

      const res = await loadRazorpay();
      if (!res) {
        toast.error("Failed to load Razorpay SDK. Check your connection.");
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: "BugPulse Pro",
        description: "Unlimited bugs and AI agents",
        order_id: data.order_id,
        handler: function (response: any) {
          verifyPayment.mutate({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        theme: {
          color: "#0ea5e9", // Sky 500
        },
        modal: {
          ondismiss: function() {
            toast.info("Payment cancelled");
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        toast.error(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
    },
    onError: (err) => toast.error(`Order creation failed: ${err.message}`)
  });
  const [syncResult, setSyncResult] = useState<{
    synced: number; autoResolved: number; reopened: number;
  } | null>(null);

  useEffect(() => {
    if (searchParams.get("upgrade") === "true" && !hasAutoUpgraded && subStatus && !createOrder.isPending) {
      setHasAutoUpgraded(true);
      setSearchParams(new URLSearchParams());
      if (subStatus.subscription?.plan !== "pro") {
        createOrder.mutate();
      }
    }
  }, [searchParams, hasAutoUpgraded, setSearchParams, subStatus, createOrder]);

  const checkAll = trpc.integrations.checkAll.useMutation({
    onSuccess: () => {
      refetchIntegrations();
      toast.success("All integrations checked");
    },
    onError: (err) => toast.error(`Check failed: ${err.message}`),
  });

  const syncGithub = trpc.bugs.syncGithubStatus.useMutation({
    onSuccess: (result) => {
      setSyncResult(result);
      toast.success(
        result.autoResolved > 0
          ? `Synced ${result.synced} issues — ${result.autoResolved} auto-resolved`
          : `Synced ${result.synced} issues — no changes`
      );
    },
    onError: (err) => toast.error(`Sync failed: ${err.message}`),
  });

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-455 mt-0.5 font-medium">
          Manage integrations, team, and system configuration
        </p>
      </motion.div>

      {/* Billing */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.01 }}>
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-sky-500" />
          Billing & Usage
        </h2>
        <GlassCard className="p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-700">Current Plan: <span className="capitalize">{subStatus?.subscription?.plan || "Free"}</span></p>
              <p className="text-[11px] text-slate-450 font-medium">Status: {subStatus?.subscription?.status || "incomplete"}</p>
            </div>
            {subStatus?.subscription?.plan !== "pro" && (
              <button
                onClick={() => createOrder.mutate()}
                disabled={createOrder.isPending || verifyPayment.isPending}
                className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {createOrder.isPending || verifyPayment.isPending ? "Processing..." : "Upgrade to Pro"}
              </button>
            )}
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Bugs Processed This Month</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{subStatus?.usage?.bugsProcessedCount || 0} / {subStatus?.subscription?.status === "active" ? "Unlimited" : "50"}</span>
            </div>
            {subStatus?.subscription?.status !== "active" && (
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                <div 
                  className="bg-sky-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(((subStatus?.usage?.bugsProcessedCount || 0) / 50) * 100, 100)}%` }}
                ></div>
              </div>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Appearance */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}>
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
          <Moon className="w-4 h-4 text-sky-500" />
          Appearance
        </h2>
        <GlassCard className="p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-bold text-slate-700">Theme Preference</p>
              <p className="text-[11px] text-slate-450 font-medium">Select your preferred color scheme</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {(["light", "dark", "system"] as const).map((t) => {
              const { theme, setTheme } = useTheme();
              const Icon = t === "light" ? Sun : t === "dark" ? Moon : Monitor;
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                    theme === t
                      ? "bg-sky-500/10 border-sky-500 text-sky-600 shadow-sm"
                      : "bg-white/50 border-slate-200/50 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-5 h-5 mb-2" />
                  <span className="text-xs font-bold capitalize">{t}</span>
                </button>
              );
            })}
          </div>
        </GlassCard>
      </motion.div>

      {/* Integration Health */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-500" />
            Integration Health
          </h2>
          <button
            onClick={() => checkAll.mutate()}
            disabled={checkAll.isPending}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-sky-650 bg-sky-500/10 border border-sky-500/25 rounded-xl hover:bg-sky-500/20 font-bold transition-all disabled:opacity-50 shadow-sm"
          >
            {checkAll.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {checkAll.isPending ? "Checking..." : "Refresh All"}
          </button>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {["github", "slack", "email", "llm", "lemma"].map((service) => {
            const integration = integrations?.find((i: { service: string }) => i.service === service);
            const status = integration?.status ?? "offline";
            const cfg = statusConfig[status] || statusConfig.offline;
            const StatusIcon = cfg.icon;
            const ServiceIcon = serviceIcons[service] || SettingsIcon;

            return (
              <GlassCard key={service} className={`p-4 border ${cfg.border} transition-colors shadow-sm`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
                    <ServiceIcon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <StatusIcon className={`w-3.5 h-3.5 ${cfg.color} mt-0.5`} />
                </div>
                <p className="text-sm font-black text-slate-800 mb-0.5">
                  {serviceLabels[service]}
                </p>
                <p className={`text-[10px] capitalize mb-3 font-bold ${cfg.color}`}>{status}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 font-medium">Response</span>
                    <span className="font-mono text-slate-700 font-bold">
                      {integration?.responseTime ? `${integration.responseTime}ms` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 font-medium">Checked</span>
                    <span className="font-mono text-slate-450 font-bold">
                      {integration?.lastCheckedAt
                        ? formatTimeAgo(integration.lastCheckedAt)
                        : "never"}
                    </span>
                  </div>
                </div>
                {integration?.lastError && (
                  <p className="mt-2 text-[9px] text-red-500 font-bold truncate" title={integration.lastError}>
                    {integration.lastError}
                  </p>
                )}
              </GlassCard>
            );
          })}
        </div>
      </motion.div>

      {/* GitHub Integration Panel */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
          <Github className="w-4 h-4 text-sky-500" />
          GitHub Integration
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Config status */}
          <GlassCard className="p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-700 mb-3">Connection Status</p>
            <div className="space-y-2">
              <ConfigRow label="Personal Access Token" value={config?.github.hasPat} />
              <ConfigRow label="Repository Owner" value={config?.github.hasOwner} />
              <ConfigRow label="Repository Name" value={config?.github.hasRepo} />
              {config?.github.repoDisplay && (
                <div className="mt-3 pt-3 border-t border-[#0f172a]/08 flex items-center gap-2">
                  <Github className="w-3.5 h-3.5 text-slate-400" />
                  <a
                    href={`https://github.com/${config.github.repoDisplay}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-sky-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    {config.github.repoDisplay}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}
              {!config?.github.configured && (
                <p className="text-[10px] text-amber-600 mt-2 font-bold">
                  Add GITHUB_PAT, GITHUB_REPO_OWNER, GITHUB_REPO_NAME to .env to enable
                </p>
              )}
            </div>
          </GlassCard>

          {/* GitHub sync */}
          <GlassCard className="p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-700 mb-1">Issue Sync</p>
            <p className="text-[11px] text-slate-400 font-medium mb-4">
              Sync GitHub issue states back — auto-resolve bugs when GitHub issues are closed.
            </p>

            {syncResult && (
              <div className="mb-4 p-3 rounded-xl bg-sky-500/10 border border-sky-500/25">
                <p className="text-[11px] text-sky-650 font-bold mb-1">Last Sync</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-black text-slate-800">{syncResult.synced}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Synced</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-sky-600">{syncResult.autoResolved}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Resolved</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-amber-600">{syncResult.reopened}</p>
                    <p className="text-[9px] text-slate-400 font-bold">Reopened</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => syncGithub.mutate({})}
              disabled={syncGithub.isPending || !config?.github.configured}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-sky-500/10 border border-sky-500/25 rounded-xl text-xs text-sky-650 hover:bg-sky-500/20 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              {syncGithub.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <GitPullRequest className="w-4 h-4" />
              )}
              {syncGithub.isPending ? "Syncing..." : "Sync GitHub Issues"}
            </button>

            {!config?.github.configured && (
              <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">
                Configure GitHub credentials above to enable sync
              </p>
            )}
          </GlassCard>
        </div>
      </motion.div>

      {/* Team Members */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-sky-500" />
          Team Members
        </h2>
        <GlassCard className="divide-y divide-[#0f172a]/04 shadow-sm">
          {team?.map((member: NonNullable<typeof team>[0]) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 hover:bg-slate-100/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                  {member.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-700">{member.name}</p>
                    {member.isOnCall ? (
                      <span className="px-1.5 py-0.5 rounded-lg text-[9px] bg-sky-500/10 text-sky-605 border border-sky-500/25 font-bold shadow-sm">
                        On Call
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold">{member.handle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(member.expertise as string[])?.map((exp) => (
                  <span
                    key={exp}
                    className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-100 text-slate-500 border border-slate-200/50 capitalize font-bold shadow-sm"
                  >
                    {exp}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {(!team || team.length === 0) && (
            <div className="p-8 text-center text-slate-400 text-sm font-medium">
              No team members configured.
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Config & Webhooks */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
          <Key className="w-4 h-4 text-sky-500" />
          Configuration
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Webhook className="w-5 h-5 text-sky-600" />
              <div>
                <p className="text-sm font-bold text-slate-700">Webhook Endpoints</p>
                <p className="text-[11px] text-slate-450 font-medium">Receive bug reports from external sources</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: "Slack Events API", url: "POST /api/webhooks/slack", configured: config?.slack.configured },
                { label: "Form Submission", url: "POST /api/webhooks/form", configured: true },
                { label: "Health Check", url: "GET /api/webhooks/health", configured: true },
              ].map((endpoint) => (
                <div
                  key={endpoint.label}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 border border-slate-200/55 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    {endpoint.configured ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    )}
                    <span className="text-[11px] text-slate-500 font-semibold">{endpoint.label}</span>
                  </div>
                  <code className="text-[10px] font-mono text-sky-650 font-bold">{endpoint.url}</code>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Key className="w-5 h-5 text-sky-605" />
              <div>
                <p className="text-sm font-bold text-slate-700">API Keys</p>
                <p className="text-[11px] text-slate-455 font-medium">External service credentials status</p>
              </div>
            </div>
            <div className="space-y-2">
              <ConfigRow label="Gemini API Key" value={config?.gemini.hasApiKey} />
              <ConfigRow label="GitHub PAT" value={config?.github.hasPat} />
              <ConfigRow label="Slack Bot Token" value={config?.slack.hasBotToken} />
              <ConfigRow label="Slack Signing Secret" value={config?.slack.hasSigningSecret} />
              <ConfigRow label="Email IMAP Host" value={config?.email.hasImapHost} />
            </div>
          </GlassCard>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────
function ConfigRow({ label, value }: { label: string; value: boolean | null | undefined }) {
  const configured = !!value;
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 border border-slate-200/55 shadow-sm">
      <span className="text-[11px] text-slate-500 font-semibold">{label}</span>
      {configured ? (
        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Set
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
          <XCircle className="w-3.5 h-3.5" />
          Not set
        </span>
      )}
    </div>
  );
}

function formatTimeAgo(date: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
