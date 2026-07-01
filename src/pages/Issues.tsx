import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  Bug,
  Search,
  Filter,
  User,
  Github,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { PriorityBadge } from "@/components/PriorityBadge";
import { SourceBadge } from "@/components/SourceBadge";
import { toast } from "sonner";

const statusFilters = ["all", "open", "in_progress", "resolved", "closed"] as const;
const severityFilters = ["all", "P0", "P1", "P2", "P3"] as const;

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export default function Issues() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const utils = trpc.useUtils();
  const { data: teamMembers } = trpc.team.list.useQuery();

  const { data, isLoading } = trpc.bugs.list.useQuery({
    status: statusFilter as "open" | "in_progress" | "resolved" | "closed" | "all",
    severity: severityFilter as "P0" | "P1" | "P2" | "P3" | "all",
    search: search || undefined,
    limit: 50,
    offset: 0,
  });

  const assignMutation = trpc.bugs.assign.useMutation({
    onSuccess: () => {
      toast.success("Assignee updated");
      utils.bugs.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Issues
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {data?.total || 0} bug reports tracked
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col xl:flex-row xl:items-center gap-4"
      >
        <div className="relative w-full xl:flex-1 xl:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.02] border border-white/[0.06] rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full xl:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
          <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-x-auto min-w-max">
            {statusFilters.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-[11px] font-medium capitalize transition-all ${
                  statusFilter === s
                    ? "bg-violet-500/10 text-violet-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-x-auto min-w-max">
          {severityFilters.map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-2.5 py-2 text-[11px] font-medium transition-all ${
                severityFilter === s
                  ? "bg-violet-500/10 text-violet-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Bug List */}
      <GlassCard>
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/[0.04] text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          <div className="col-span-4">Title</div>
          <div className="col-span-1">Priority</div>
          <div className="col-span-1">Severity</div>
          <div className="col-span-1">Component</div>
          <div className="col-span-1">Source</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Assignee</div>
          <div className="col-span-1">Score</div>
          <div className="col-span-1">GitHub</div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Loading issues...
          </div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            {data?.items?.map((bug: NonNullable<typeof data.items>[0]) => (
              <motion.div
                key={bug.id}
                variants={item}
              >
                <Link
                  to={`/issues/${bug.id}`}
                  className="grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <Bug className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                    <span className="text-sm text-foreground truncate group-hover:text-violet-400 transition-colors">
                      {bug.title}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <span
                      className={`text-[10px] font-mono ${
                        bug.priorityScore >= 80
                          ? "text-red-400"
                          : bug.priorityScore >= 60
                          ? "text-amber-400"
                          : bug.priorityScore >= 40
                          ? "text-yellow-400"
                          : "text-blue-400"
                      }`}
                    >
                      {bug.priorityScore}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <PriorityBadge severity={bug.severity} />
                  </div>
                  <div className="col-span-1 flex items-center">
                    <span className="text-xs text-muted-foreground capitalize">
                      {bug.component}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <SourceBadge source={bug.source} />
                  </div>
                  <div className="col-span-1 flex items-center">
                    <StatusDot status={bug.status} />
                  </div>
                  <div 
                    className="col-span-1 flex items-center gap-1 relative group/assign"
                    onClick={(e) => e.preventDefault()}
                  >
                    <User className="w-3 h-3 text-muted-foreground" />
                    <select
                      className="text-xs bg-transparent text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer appearance-none w-full"
                      value={bug.assigneeHandle || ""}
                      onChange={(e) => {
                        const handle = e.target.value;
                        if (handle) assignMutation.mutate({ id: bug.id, assigneeHandle: handle });
                      }}
                      disabled={assignMutation.isPending}
                    >
                      <option value="" disabled>Unassigned</option>
                      {teamMembers?.map(member => (
                        <option key={member.id} value={member.handle} className="bg-[#0a0a0f]">
                          {member.handle.replace("@", "")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <div className="h-1.5 w-10 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                        style={{ width: `${bug.priorityScore}%` }}
                      />
                    </div>
                  </div>
                  <div className="col-span-1 flex items-center">
                    {bug.githubIssueId ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <Github className="w-3 h-3" />
                        #{bug.githubIssueId}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        —
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}

            {(!data?.items || data.items.length === 0) && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No issues found matching your filters.
              </div>
            )}
          </motion.div>
        )}

        {/* Pagination */}
        {data && data.total > 50 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.04]">
            <span className="text-xs text-muted-foreground">
              Showing {data.items.length} of {data.total}
            </span>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-xs text-muted-foreground bg-white/[0.02] rounded hover:bg-white/[0.05] transition-colors">
                Previous
              </button>
              <button className="px-3 py-1.5 text-xs text-muted-foreground bg-white/[0.02] rounded hover:bg-white/[0.05] transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: "bg-red-400",
    in_progress: "bg-violet-400",
    resolved: "bg-emerald-400",
    closed: "bg-muted-foreground",
  };

  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${colors[status] || "bg-muted-foreground"}`} />
      <span className="text-xs text-muted-foreground capitalize">
        {status.replace("_", " ")}
      </span>
    </span>
  );
}
