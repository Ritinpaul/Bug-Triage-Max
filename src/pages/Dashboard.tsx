import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  Bug,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Clock,
  ChevronRight,
  Slack,
  Mail,
  FileText,
  Activity,
  TrendingUp,
  Users,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { PriorityBadge } from "@/components/PriorityBadge";
import { SourceBadge } from "@/components/SourceBadge";
import { ConfidenceRing } from "@/components/ConfidenceRing";
import { AgentActivityFeed } from "@/components/AgentActivityFeed";
import { SimulateBugModal } from "@/components/SimulateBugModal";
import { useState } from "react";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function Dashboard() {
  const [sourceFilter, setSourceFilter] = useState<"all" | "slack" | "email" | "form">("all");
  const [simulateOpen, setSimulateOpen] = useState(false);

  const { data: bugStats } = trpc.bugs.stats.useQuery();
  const { data: messageStats } = trpc.messages.stats.useQuery();
  const { data: recentMessages } = trpc.messages.recent.useQuery({ limit: 8, source: sourceFilter });
  const { data: activities } = trpc.agents.activities.useQuery({ limit: 6 });

  const openBugs = bugStats?.open || 0;
  const inProgress = bugStats?.inProgress || 0;
  const resolved = bugStats?.resolved || 0;
  const avgPriority = Math.round(bugStats?.avgPriority || 0);

  return (
    <>
      <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-450 mt-0.5">
            Real-time bug triage overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSimulateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-500/20 hover:shadow-sky-500/30 transition-all group"
          >
            <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
            Simulate Bug
          </button>
          <span className="flex items-center gap-2 text-xs text-sky-600 bg-sky-500/10 px-3 py-1.5 rounded-full font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            Live
          </span>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard
          icon={Bug}
          label="Open Bugs"
          value={openBugs}
          color="text-red-500"
          bg="bg-red-500/10"
        />
        <StatCard
          icon={Activity}
          label="In Progress"
          value={inProgress}
          color="text-sky-500"
          bg="bg-sky-500/10"
        />
        <StatCard
          icon={CheckCircle2}
          label="Resolved"
          value={resolved}
          color="text-emerald-500"
          bg="bg-emerald-500/10"
        />
        <StatCard
          icon={AlertTriangle}
          label="Avg Priority"
          value={`${avgPriority}%`}
          color="text-amber-500"
          bg="bg-amber-500/10"
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bug Stream - Main Column */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="col-span-1 lg:col-span-8 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-500" />
              Real-Time Bug Stream
            </h2>
            <div className="flex items-center gap-2">
              <FilterButton
                icon={Slack}
                label="Slack"
                active={sourceFilter === "slack"}
                onClick={() => setSourceFilter(sourceFilter === "slack" ? "all" : "slack")}
              />
              <FilterButton
                icon={Mail}
                label="Email"
                active={sourceFilter === "email"}
                onClick={() => setSourceFilter(sourceFilter === "email" ? "all" : "email")}
              />
              <FilterButton
                icon={FileText}
                label="Form"
                active={sourceFilter === "form"}
                onClick={() => setSourceFilter(sourceFilter === "form" ? "all" : "form")}
              />
            </div>
          </div>

          <GlassCard className="divide-y divide-[#0f172a]/08">
            {recentMessages?.map((msg: NonNullable<typeof recentMessages>[0], i: number) => (
              <motion.div
                key={msg.id}
                variants={item}
                custom={i}
                className="bug-stream-card p-4 cursor-pointer"
              >
                <Link
                  to={msg.bug ? `/issues/${msg.bug.id}` : "#"}
                  className="block"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <SourceBadge source={msg.source} />
                      {msg.bug && (
                        <PriorityBadge severity={msg.bug.severity} />
                      )}
                      <span className="text-sm font-bold text-slate-700">
                        {msg.bug?.title || "Processing..."}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {msg.parsed && (
                        <ConfidenceRing
                          value={Math.round(
                            (msg.parsed.overallConfidence || 0) * 100
                          )}
                          size={28}
                        />
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mb-2 line-clamp-1 pl-[1px]">
                    {msg.rawContent}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {msg.bug?.assigneeHandle || "Unassigned"}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {msg.bug?.component || (msg.parsed as any)?.component || "-"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(msg.createdAt)}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}

            {(!recentMessages || recentMessages.length === 0) && (
              <div className="p-8 text-center text-slate-400 text-sm font-medium">
                No bugs reported yet. The stream will populate as messages
                arrive.
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Right Column */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="col-span-1 lg:col-span-4 space-y-6"
        >
          {/* Agent Activity */}
          <div>
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-sky-500" />
              Agent Activity
            </h2>
            <AgentActivityFeed activities={activities || []} />
          </div>

          {/* Source Distribution */}
          <div>
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-sky-500" />
              Sources
            </h2>
            <GlassCard className="p-4">
              <div className="space-y-3">
                {messageStats?.bySource?.map((src: NonNullable<typeof messageStats.bySource>[0]) => (
                  <div key={src.source} className="flex items-center gap-3">
                    <SourceBadge source={src.source} />
                    <div className="flex-1">
                      <div className="h-1.5 bg-[#0f172a]/08 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(100, (src.count / Math.max(messageStats?.total || 1, 1)) * 100)}%`,
                          }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-500"
                        />
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-450 w-6 text-right">
                      {src.count}
                    </span>
                  </div>
                ))}
                {(!messageStats?.bySource ||
                  messageStats.bySource.length === 0) && (
                  <p className="text-xs text-slate-400 text-center py-2">
                    No data yet
                  </p>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Component Breakdown */}
          <div>
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
              <Bug className="w-4 h-4 text-sky-500" />
              Components
            </h2>
            <GlassCard className="p-4">
              <div className="space-y-2">
                {bugStats?.byComponent?.map((comp: NonNullable<typeof bugStats.byComponent>[0]) => (
                  <div
                    key={comp.component}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-500 capitalize font-medium">
                      {comp.component}
                    </span>
                    <span className="font-mono text-slate-700 font-bold">
                      {comp.count}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Quick Links */}
          <div>
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-sky-500" />
              Quick Actions
            </h2>
            <div className="space-y-2">
              <Link
                to="/issues"
                className="flex items-center gap-3 p-3 rounded-lg bg-white/40 hover:bg-slate-100/50 border border-slate-100 hover:border-slate-200 transition-all text-sm shadow-sm"
              >
                <Bug className="w-4 h-4 text-sky-500" />
                <span className="text-slate-700 font-semibold">View All Issues</span>
                <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
              </Link>
              <Link
                to="/analytics"
                className="flex items-center gap-3 p-3 rounded-lg bg-white/40 hover:bg-slate-100/50 border border-slate-100 hover:border-slate-200 transition-all text-sm shadow-sm"
              >
                <BarChart3 className="w-4 h-4 text-sky-500" />
                <span className="text-slate-700 font-semibold">Analytics</span>
                <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
      </div>

      {/* Simulate Bug Modal */}
      <SimulateBugModal open={simulateOpen} onClose={() => setSimulateOpen(false)} />
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
  bg: string;
}) {
  return (
    <motion.div variants={item}>
      <GlassCard className="p-4 glass-card-hover shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800">{value}</p>
            <p className="text-xs text-slate-400 font-medium">{label}</p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function FilterButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
        active
          ? "bg-sky-500/20 border-sky-500/40 text-sky-600 shadow-sm"
          : "text-slate-400 bg-white/40 hover:bg-slate-100/50 border-slate-100 hover:border-slate-200"
      }`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
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
