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

const COLORS = ["#8b5cf6", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

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
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
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
          color="text-violet-400"
          bg="bg-violet-400/10"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Triage Time"
          value={`${performance?.avgTriageTime || 0}ms`}
          color="text-blue-400"
          bg="bg-blue-400/10"
        />
        <StatCard
          icon={Zap}
          label="Avg Repro Time"
          value={`${performance?.avgReproTime || 0}ms`}
          color="text-cyan-400"
          bg="bg-cyan-400/10"
        />
        <StatCard
          icon={CheckCircle2}
          label="Pipeline Success"
          value={`${Math.round(performance?.pipeline?.completed && performance?.pipeline?.total ? (performance.pipeline.completed / performance.pipeline.total) * 100 : 0)}%`}
          color="text-emerald-400"
          bg="bg-emerald-400/10"
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
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-violet-400" />
            Daily Trend (7 Days)
          </h2>
          <GlassCard className="p-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#6b6b7b", fontSize: 11 }}
                  tickFormatter={(v: string) =>
                    new Date(v).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  stroke="rgba(255,255,255,0.06)"
                />
                <YAxis
                  tick={{ fill: "#6b6b7b", fontSize: 11 }}
                  stroke="rgba(255,255,255,0.06)"
                />
                <Tooltip
                  contentStyle={{
                    background: "#12121f",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "#a0a0b0" }}
                />
                <Bar dataKey="bugs" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="messages" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-violet-400" />
            Bugs by Component
          </h2>
          <GlassCard className="p-4 h-72">
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
                    background: "#12121f",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 -mt-4">
              {componentData.map((entry: typeof componentData[0], index: number) => (
                <span
                  key={entry.name}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground"
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
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-violet-400" />
          Agent Performance (24h)
        </h2>
        <GlassCard>
          <div className="grid grid-cols-3 gap-4 p-4">
            {overview?.agents?.map((agent: NonNullable<typeof overview.agents>[0]) => (
              <div
                key={agent.agentName}
                className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white capitalize">
                      {agent.agentName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {agent.runs} runs
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Avg Duration</span>
                    <span className="font-mono text-foreground">
                      {Math.round(agent.avgDuration || 0)}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-mono text-emerald-400">
                      {Math.round(agent.successRate || 0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500"
                      style={{ width: `${Math.round(agent.successRate || 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {(!overview?.agents || overview.agents.length === 0) && (
              <div className="col-span-3 text-center text-muted-foreground text-sm py-8">
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
      <GlassCard className="p-4 glass-card-hover">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}
          >
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div>
            <p className="text-lg font-bold text-white">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
