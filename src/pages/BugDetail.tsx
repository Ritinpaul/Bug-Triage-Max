import { useParams, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bug,
  Github,
  User,
  Clock,
  Brain,
  GitBranch,
  Play,
  AlertTriangle,
  Zap,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { PriorityBadge } from "@/components/PriorityBadge";
import { SourceBadge } from "@/components/SourceBadge";
import { ConfidenceRing } from "@/components/ConfidenceRing";
import { toast } from "sonner";

export default function BugDetail() {
  const { id } = useParams<{ id: string }>();
  const bugId = parseInt(id || "0");
  const { data, isLoading, refetch } = trpc.bugs.getById.useQuery({ id: bugId });
  const [copiedGithub, setCopiedGithub] = useState(false);
  const { data: team } = trpc.team.list.useQuery();

  const createIssueMutation = trpc.bugs.createGithubIssue.useMutation({
    onSuccess: (result) => {
      if (result.alreadyExists) {
        toast.info("Issue already linked to GitHub");
      } else {
        toast.success(`GitHub issue #${result.issueNumber} created!`);
      }
      refetch();
    },
    onError: (err) => {
      toast.error(`Failed to create issue: ${err.message}`);
    },
  });

  const updateStatusMutation = trpc.bugs.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); refetch(); },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const assignMutation = trpc.bugs.assign.useMutation({
    onSuccess: () => { toast.success("Assignee updated"); refetch(); },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const syncMutation = trpc.bugs.syncGithubStatus.useMutation({
    onSuccess: (result) => {
      if (result.autoResolved > 0) toast.success("Bug auto-resolved from GitHub");
      else if (result.reopened > 0) toast.warning("Bug re-opened from GitHub");
      else toast.info("GitHub status: no changes");
      refetch();
    },
    onError: (err) => toast.error(`Sync failed: ${err.message}`),
  });

  const { data: githubBody } = trpc.bugs.generateGithubBody.useQuery(
    { id: bugId },
    { enabled: !!data }
  );


  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-[#0f172a]/08 rounded" />
          <div className="h-64 bg-[#0f172a]/04 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data?.bug) {
    return (
      <div className="p-6">
        <Link
          to="/issues"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Issues
        </Link>
        <div className="mt-8 text-center text-slate-400 font-medium">
          Bug not found.
        </div>
      </div>
    );
  }

  const { bug, message, parsed, reproduction, similarBugs } = data;

  const handleCopyGithub = () => {
    if (githubBody?.body) {
      navigator.clipboard.writeText(githubBody.body);
      setCopiedGithub(true);
      setTimeout(() => setCopiedGithub(false), 2000);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Link
          to="/issues"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-900 transition-colors w-fit font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Issues
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <PriorityBadge severity={bug.severity} />
            <SourceBadge source={bug.source} />
            <span className="text-xs text-slate-400 font-mono font-medium">
              #{bug.id}
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-800">{bug.title}</h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            Parsed from: "{message?.rawContent?.slice(0, 80)}
            {message && message.rawContent && message.rawContent.length > 80 ? "..." : ""}"
          </p>
        </div>
        <div className="flex items-center gap-3">
          {bug.githubIssueUrl ? (
            <a
              href={bug.githubIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-sky-500/10 border border-sky-500/25 rounded-xl text-xs text-sky-600 hover:bg-sky-500/20 font-bold transition-all shadow-sm"
            >
              <Github className="w-4 h-4" />
              View on GitHub
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <>
              <button
                onClick={() => createIssueMutation.mutate({ id: bugId })}
                disabled={createIssueMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 bg-sky-500/10 border border-sky-500/25 rounded-xl text-xs text-sky-600 hover:bg-sky-500/20 font-bold transition-all disabled:opacity-50 shadow-sm"
              >
                {createIssueMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Github className="w-4 h-4" />
                )}
                {createIssueMutation.isPending ? "Creating..." : "Create GitHub Issue"}
              </button>
              <button
                onClick={handleCopyGithub}
                className="flex items-center gap-2 px-3 py-2 bg-white/50 border border-slate-200/60 rounded-xl text-xs text-slate-500 hover:bg-slate-100 font-bold transition-all shadow-sm"
              >
                {copiedGithub ? (
                  <Check className="w-4 h-4 text-sky-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copiedGithub ? "Copied!" : "Copy Body"}
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="col-span-8 space-y-6">
          {/* Original Message + Parsed Structure */}
          <div className="grid grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                <Bug className="w-4 h-4 text-sky-500" />
                Original Message
              </h3>
              <GlassCard className="p-4">
                <SourceBadge source={bug.source} className="mb-3" />
                <p className="text-sm text-slate-650 leading-relaxed font-medium">
                  {message?.rawContent || "No content available"}
                </p>
                <div className="mt-4 pt-3 border-t border-[#0f172a]/08 flex items-center gap-4 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {message?.senderName || "Unknown"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {message?.createdAt
                      ? new Date(message.createdAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </GlassCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-sky-500" />
                Parsed Structure
              </h3>
              <GlassCard className="p-4 space-y-4">
                {parsed ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">Intent</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700 capitalize">
                          {parsed.intent.replace("_", " ")}
                        </span>
                        <ConfidenceRing
                          value={Math.round(parsed.intentConfidence * 100)}
                          size={24}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">Component</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700 capitalize">
                          {parsed.component}
                        </span>
                        <ConfidenceRing
                          value={Math.round(parsed.componentConfidence * 100)}
                          size={24}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">Severity</span>
                      <PriorityBadge severity={parsed.severityLabel} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">Priority Score</span>
                      <span className="text-sm font-mono font-bold text-slate-700">
                        {bug.priorityScore}/100
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">Overall Confidence</span>
                      <ConfidenceRing
                        value={Math.round(parsed.overallConfidence * 100)}
                        size={28}
                      />
                    </div>
                    {parsed.flaggedForReview === 1 && (
                      <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-[11px] text-amber-600 font-bold">
                          Flagged for manual review (confidence &lt; 60%)
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-400 font-medium">
                    Not yet parsed
                  </p>
                )}
              </GlassCard>
            </motion.div>
          </div>

          {/* Similar Bugs */}
          {similarBugs && similarBugs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                <GitBranch className="w-4 h-4 text-sky-500" />
                Similar Past Bugs
              </h3>
              <GlassCard className="divide-y divide-[#0f172a]/08">
                {similarBugs.map((sim: NonNullable<typeof similarBugs>[0]) => (
                  <Link
                    key={sim.id}
                    to={`/issues/${sim.similarBugId}`}
                    className="flex items-center justify-between p-4 hover:bg-slate-100/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-700 font-semibold">
                        {sim.bugTitle || `#${sim.similarBugId}`}
                      </span>
                      {sim.isDuplicate === 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-650 border border-red-500/20 font-bold">
                          Possible Duplicate
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-[#0f172a]/08 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-500"
                          style={{ width: `${Math.round(sim.similarityScore * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-400 font-medium">
                        {Math.round(sim.similarityScore * 100)}%
                      </span>
                    </div>
                  </Link>
                ))}
              </GlassCard>
            </motion.div>
          )}

          {/* Reproduction Steps */}
          {reproduction && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                <Play className="w-4 h-4 text-sky-600" />
                Reproduction Steps
              </h3>
              <GlassCard className="p-4 space-y-4">
                <ol className="space-y-2">
                  {reproduction.steps?.map((step: string, i: number) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm text-slate-650 font-medium"
                    >
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-[10px] font-mono text-sky-650 font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#0f172a]/08">
                  <div>
                    <span className="text-[11px] text-sky-600 font-bold">
                      Expected
                    </span>
                    <p className="text-xs text-slate-400 mt-1 font-medium">
                      {reproduction.expectedBehavior || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-red-500 font-bold">
                      Actual
                    </span>
                    <p className="text-xs text-slate-400 mt-1 font-medium">
                      {reproduction.actualBehavior || "—"}
                    </p>
                  </div>
                </div>

                {reproduction.errorLogSummary && (
                  <div className="pt-3 border-t border-[#0f172a]/08">
                    <span className="text-[11px] text-amber-600 font-bold">
                      Error Log Summary
                    </span>
                    <code className="block mt-1 p-2 rounded bg-slate-100 text-xs font-mono text-amber-700 font-bold border border-slate-200/40">
                      {reproduction.errorLogSummary}
                    </code>
                  </div>
                )}

                {(reproduction as any).accuracyScore && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-400 font-medium">
                      AI Accuracy Score
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 bg-[#0f172a]/08 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-500"
                          style={{ width: `${Math.round((reproduction as any).accuracyScore * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 font-medium">
                        {Math.round((reproduction as any).accuracyScore * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}
        </div>

        {/* Right Column - Metadata */}
        <div className="col-span-4 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-sky-500" />
              Metadata
            </h3>
            <GlassCard className="p-4 space-y-3 shadow-sm">
              {/* Status selector */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Status</span>
                <div className="relative">
                  <select
                    value={bug.status}
                    onChange={(e) =>
                      updateStatusMutation.mutate({
                        id: bugId,
                        status: e.target.value as "open" | "in_progress" | "resolved" | "closed",
                      })
                    }
                    disabled={updateStatusMutation.isPending}
                    className="appearance-none text-xs bg-slate-100 border border-slate-200/60 rounded px-2.5 py-1.5 pr-8 text-slate-700 font-bold cursor-pointer hover:bg-slate-200 transition-colors disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-sky-500/55"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Component</span>
                <span className="text-xs text-slate-700 capitalize font-bold">{bug.component}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Severity</span>
                <PriorityBadge severity={bug.severity} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Priority Score</span>
                <span className="text-xs font-mono text-slate-700 font-bold">{bug.priorityScore}/100</span>
              </div>

              {/* Assignee selector */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Assignee</span>
                <div className="relative">
                  <select
                    value={bug.assigneeHandle || ""}
                    onChange={(e) =>
                      assignMutation.mutate({ id: bugId, assigneeHandle: e.target.value })
                    }
                    disabled={assignMutation.isPending}
                    className="appearance-none text-xs bg-slate-100 border border-slate-200/60 rounded px-2.5 py-1.5 pr-8 text-slate-700 font-bold cursor-pointer hover:bg-slate-200 transition-colors disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-sky-500/55 max-w-[120px] truncate"
                  >
                    <option value="">Unassigned</option>
                    {team?.map((m: { handle: string; name: string }) => (
                      <option key={m.handle} value={m.handle}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Created</span>
                <span className="text-xs text-slate-450 font-medium">
                  {bug.createdAt ? new Date(bug.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>

              {/* GitHub issue link + sync */}
              {bug.githubIssueId && (
                <div className="pt-2 border-t border-[#0f172a]/08 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">GitHub Issue</span>
                    <a
                      href={bug.githubIssueUrl ?? `#`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-sky-600 font-bold hover:underline"
                    >
                      #{bug.githubIssueId}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <button
                    onClick={() => syncMutation.mutate({ bugId })}
                    disabled={syncMutation.isPending}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] text-sky-650 bg-sky-500/10 border border-sky-500/25 rounded-xl hover:bg-sky-500/20 font-bold transition-all disabled:opacity-50 shadow-sm"
                  >
                    {syncMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Sync from GitHub
                  </button>
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* Agent Reasoning */}
          {parsed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-sky-500" />
                Agent Reasoning
              </h3>
              <GlassCard className="p-4 space-y-2 shadow-sm">
                <div className="flex items-start gap-2">
                  <Brain className="w-3.5 h-3.5 text-sky-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-450 font-medium">
                    <span className="text-sky-600 font-bold">Parser:</span>{" "}
                    Detected "{parsed.intent.replace("_", " ")}" intent from
                    keywords: {(parsed.keywords as string[])?.slice(0, 3).join(", ")}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <GitBranch className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-450 font-medium">
                    <span className="text-blue-600 font-bold">Triage:</span> Component "
                    {parsed.component}" mapped to{" "}
                    {bug.assigneeHandle || "on-call"} based on expertise
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Play className="w-3.5 h-3.5 text-sky-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-450 font-medium">
                    <span className="text-sky-600 font-bold">Repro:</span> Generated steps
                    from description + error pattern matching
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* GitHub Preview */}
          {githubBody && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                <Github className="w-4 h-4 text-sky-500" />
                GitHub Issue Preview
              </h3>
              <GlassCard className="p-4 shadow-sm">
                <p className="text-xs font-bold text-slate-700 mb-2">
                  {githubBody.title}
                </p>
                <pre className="text-[10px] text-slate-450 font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto bg-slate-100 p-2.5 rounded-xl border border-slate-200/40 font-bold">
                  {githubBody.body}
                </pre>
              </GlassCard>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

