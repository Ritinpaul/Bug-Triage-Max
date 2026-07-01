import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { GlassCard } from "@/components/GlassCard";

const COLORS = ["#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#f59e0b", "#ef4444"];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function Analytics() {
  const { data: overview } = trpc.analytics.overview.useQuery();
  const { data: performance } = trpc.analytics.performance.useQuery();

  const componentData =
    overview?.bugs?.byComponent?.map((c: NonNullable<typeof overview.bugs.byComponent>[0]) => ({
      name: c.component.charAt(0).toUpperCase() + c.component.slice(1),
      value: c.count,
    })) || [];

  const trendData = overview?.dailyTrend || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          Analytics
        </h1>
        <p className="text-sm text-slate-450 mt-0.5 font-medium">
          Performance metrics and trends
        </p>
      </motion.div>

      {/* Performance Cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          icon={Clock}
          label="Avg Parse Time"
          value={`${performance?.avgParseTime || 0}ms`}
          color="text-sky-600"
          bg="bg-sky-500/10"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Triage Time"
          value={`${performance?.avgTriageTime || 0}ms`}
          color="text-blue-600"
          bg="bg-blue-500/10"
        />
        <StatCard
          icon={Zap}
          label="Avg Repro Time"
          value={`${performance?.avgReproTime || 0}ms`}
          color="text-teal-600"
          bg="bg-teal-500/10"
        />
        <StatCard
          icon={CheckCircle2}
          label="Pipeline Success"
          value={`${Math.round(performance?.pipeline?.completed && performance?.pipeline?.total ? (performance.pipeline.completed / performance.pipeline.total) * 100 : 0)}%`}
          color="text-emerald-600"
          bg="bg-emerald-500/10"
        />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-sky-500" />
            Daily Trend (7 Days)
          </h2>
          <GlassCard className="p-4 h-72 shadow-sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(15,23,42,0.06)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                  tickFormatter={(v: string) =>
                    new Date(v).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  stroke="rgba(15,23,42,0.06)"
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                  stroke="rgba(15,23,42,0.06)"
                />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid rgba(15,23,42,0.08)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  }}
                  labelStyle={{ color: "#475569", fontWeight: 700 }}
                />
                <Bar dataKey="bugs" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="messages" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>

        {/* Component Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-sky-500" />
            Bugs by Component
          </h2>
          <GlassCard className="p-4 h-72 shadow-sm">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={componentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {componentData.map((_e: typeof componentData[0], index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid rgba(15,23,42,0.08)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 -mt-4">
              {componentData.map((entry: typeof componentData[0], index: number) => (
                <span
                  key={entry.name}
                  className="flex items-center gap-1 text-[11px] text-slate-500 font-bold"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  {entry.name} ({entry.value})
                </span>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Agent Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-sky-500" />
          Agent Performance (24h)
        </h2>
        <GlassCard className="shadow-sm">
          <div className="grid grid-cols-3 gap-4 p-4">
            {overview?.agents?.map((agent: NonNullable<typeof overview.agents>[0]) => (
              <div
                key={agent.agentName}
                className="p-4 rounded-xl bg-white/40 border border-slate-200/50 hover:bg-slate-100/20 transition-all shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 capitalize">
                      {agent.agentName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold">
                      {agent.runs} runs
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Avg Duration</span>
                    <span className="font-mono text-slate-700 font-bold">
                      {Math.round(agent.avgDuration || 0)}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Success Rate</span>
                    <span className="font-mono text-sky-600 font-bold">
                      {Math.round(agent.successRate || 0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#0f172a]/08 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-500"
                      style={{ width: `${Math.round(agent.successRate || 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {(!overview?.agents || overview.agents.length === 0) && (
              <div className="col-span-3 text-center text-slate-400 text-sm py-8 font-medium">
                No agent data available yet.
              </div>
            )}
          </div>
        </GlassCard>
      </motion.div>
    </div>
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
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <motion.div variants={item}>
      <GlassCard className="p-4 glass-card-hover shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}
          >
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div>
            <p className="text-lg font-black text-slate-800">{value}</p>
            <p className="text-xs text-slate-400 font-medium">{label}</p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
