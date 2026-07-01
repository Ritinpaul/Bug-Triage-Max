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
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { useState } from "react";
import { toast } from "sonner";

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
  online: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  offline: { icon: XCircle, color: "text-muted-foreground", bg: "bg-white/[0.02]", border: "border-white/[0.06]" },
  degraded: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  error: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
};

export default function Settings() {
  const { data: integrations, refetch: refetchIntegrations } = trpc.integrations.list.useQuery();
  const { data: team } = trpc.team.list.useQuery();
  const { data: config } = trpc.integrations.config.useQuery();
  const [syncResult, setSyncResult] = useState<{
    synced: number; autoResolved: number; reopened: number;
  } | null>(null);

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
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage integrations, team, and system configuration
        </p>
      </motion.div>

      {/* Integration Health */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-400" />
            Integration Health
          </h2>
          <button
            onClick={() => checkAll.mutate()}
            disabled={checkAll.isPending}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg hover:bg-violet-500/20 transition-all disabled:opacity-50"
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
              <GlassCard key={service} className={`p-4 border ${cfg.border} transition-colors`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
                    <ServiceIcon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <StatusIcon className={`w-3.5 h-3.5 ${cfg.color} mt-0.5`} />
                </div>
                <p className="text-sm font-medium text-white mb-0.5">
                  {serviceLabels[service]}
                </p>
                <p className={`text-[10px] capitalize mb-3 ${cfg.color}`}>{status}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Response</span>
                    <span className="font-mono text-foreground">
                      {integration?.responseTime ? `${integration.responseTime}ms` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Checked</span>
                    <span className="font-mono text-muted-foreground">
                      {integration?.lastCheckedAt
                        ? formatTimeAgo(integration.lastCheckedAt)
                        : "never"}
                    </span>
                  </div>
                </div>
                {integration?.lastError && (
                  <p className="mt-2 text-[9px] text-red-400 truncate" title={integration.lastError}>
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
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
          <Github className="w-4 h-4 text-violet-400" />
          GitHub Integration
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Config status */}
          <GlassCard className="p-4">
            <p className="text-sm font-medium text-white mb-3">Connection Status</p>
            <div className="space-y-2">
              <ConfigRow label="Personal Access Token" value={config?.github.hasPat} />
              <ConfigRow label="Repository Owner" value={config?.github.hasOwner} />
              <ConfigRow label="Repository Name" value={config?.github.hasRepo} />
              {config?.github.repoDisplay && (
                <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2">
                  <Github className="w-3.5 h-3.5 text-muted-foreground" />
                  <a
                    href={`https://github.com/${config.github.repoDisplay}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-violet-400 hover:underline flex items-center gap-1"
                  >
                    {config.github.repoDisplay}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}
              {!config?.github.configured && (
                <p className="text-[10px] text-amber-400 mt-2">
                  Add GITHUB_PAT, GITHUB_REPO_OWNER, GITHUB_REPO_NAME to .env to enable
                </p>
              )}
            </div>
          </GlassCard>

          {/* GitHub sync */}
          <GlassCard className="p-4">
            <p className="text-sm font-medium text-white mb-1">Issue Sync</p>
            <p className="text-[11px] text-muted-foreground mb-4">
              Sync GitHub issue states back — auto-resolve bugs when GitHub issues are closed.
            </p>

            {syncResult && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-[11px] text-emerald-400 font-medium mb-1">Last Sync</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-white">{syncResult.synced}</p>
                    <p className="text-[9px] text-muted-foreground">Synced</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-400">{syncResult.autoResolved}</p>
                    <p className="text-[9px] text-muted-foreground">Resolved</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-400">{syncResult.reopened}</p>
                    <p className="text-[9px] text-muted-foreground">Reopened</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => syncGithub.mutate({})}
              disabled={syncGithub.isPending || !config?.github.configured}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-lg text-xs text-violet-400 hover:bg-violet-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {syncGithub.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <GitPullRequest className="w-4 h-4" />
              )}
              {syncGithub.isPending ? "Syncing..." : "Sync GitHub Issues"}
            </button>

            {!config?.github.configured && (
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Configure GitHub credentials above to enable sync
              </p>
            )}
          </GlassCard>
        </div>
      </motion.div>

      {/* Team Members */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-violet-400" />
          Team Members
        </h2>
        <GlassCard className="divide-y divide-white/[0.04]">
          {team?.map((member: NonNullable<typeof team>[0]) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-sm font-medium text-white">
                  {member.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{member.name}</p>
                    {member.isOnCall ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        On Call
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{member.handle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(member.expertise as string[])?.map((exp) => (
                  <span
                    key={exp}
                    className="px-2 py-0.5 rounded text-[10px] bg-white/[0.03] text-muted-foreground border border-white/[0.06] capitalize"
                  >
                    {exp}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {(!team || team.length === 0) && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No team members configured.
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Config & Webhooks */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Key className="w-4 h-4 text-violet-400" />
          Configuration
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <Webhook className="w-5 h-5 text-violet-400" />
              <div>
                <p className="text-sm font-medium text-white">Webhook Endpoints</p>
                <p className="text-[11px] text-muted-foreground">Receive bug reports from external sources</p>
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
                  className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/[0.04]"
                >
                  <div className="flex items-center gap-2">
                    {endpoint.configured ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    )}
                    <span className="text-[11px] text-muted-foreground">{endpoint.label}</span>
                  </div>
                  <code className="text-[10px] font-mono text-violet-400">{endpoint.url}</code>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <Key className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-white">API Keys</p>
                <p className="text-[11px] text-muted-foreground">External service credentials status</p>
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
    <div className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/[0.04]">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {configured ? (
        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
          <CheckCircle2 className="w-3 h-3" />
          Set
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <XCircle className="w-3 h-3" />
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
