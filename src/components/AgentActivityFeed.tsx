import { GlassCard } from "./GlassCard";
import { Brain, GitBranch, Play, Circle, Clock } from "lucide-react";

interface Activity {
  id: number;
  agentName: string;
  action: string;
  status: string;
  duration: number | null;
  createdAt: Date | string;
  messagePreview?: string;
}

interface AgentActivityFeedProps {
  activities: Activity[];
}

const agentIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  parser: Brain,
  triage: GitBranch,
  reproduction: Play,
  release: Circle,
};

const agentColors: Record<string, string> = {
  parser: "text-emerald-600",
  triage: "text-sky-600",
  reproduction: "text-indigo-600",
  release: "text-emerald-600",
};

const statusIcons: Record<string, string> = {
  running: "●",
  completed: "✓",
  failed: "✗",
  waiting: "○",
};

const statusColors: Record<string, string> = {
  running: "text-emerald-500",
  completed: "text-emerald-500",
  failed: "text-red-500",
  waiting: "text-slate-400",
};

export function AgentActivityFeed({ activities }: AgentActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return (
      <GlassCard className="p-6 text-center">
        <p className="text-sm text-slate-400 font-medium">No recent activity</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="divide-y divide-[#0f172a]/08">
      {activities.map((activity) => {
        const Icon = agentIcons[activity.agentName] || Circle;
        const agentColor = agentColors[activity.agentName] || "text-slate-400";
        const statusColor = statusColors[activity.status] || "text-slate-400";

        return (
          <div key={activity.id} className="p-3 flex items-start gap-3">
            <div className="mt-0.5">
              <Icon className={`w-4 h-4 ${agentColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium capitalize ${agentColor}`}>
                  {activity.agentName}
                </span>
                <span className={`text-xs ${statusColor}`}>
                  {statusIcons[activity.status] || "○"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {activity.action}
              </p>
              {activity.duration && (
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {activity.duration}ms
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </GlassCard>
  );
}
