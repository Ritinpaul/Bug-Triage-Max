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
import { BugListSkeleton } from "@/components/BugListSkeleton";
import { useDebounce } from "@/hooks/useDebounce";
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
  const [page, setPage] = useState(1);
  const limit = 50;
  
  const debouncedSearch = useDebounce(search, 300);

  const utils = trpc.useUtils();
  const { data: teamMembers } = trpc.team.list.useQuery();

  const { data, isLoading } = trpc.bugs.list.useQuery({
    status: statusFilter as "open" | "in_progress" | "resolved" | "closed" | "all",
    severity: severityFilter as "P0" | "P1" | "P2" | "P3" | "all",
    search: debouncedSearch || undefined,
    limit,
    offset: (page - 1) * limit,
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
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          Issues
        </h1>
        <p className="text-sm text-slate-450 mt-0.5 font-medium">
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search issues..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-slate-200/60 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-all shadow-sm"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full xl:w-auto">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <div className="flex items-center gap-1 bg-white/50 border border-slate-200/60 rounded-xl overflow-x-auto min-w-max p-0.5 shadow-sm">
            {statusFilters.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all ${
                  statusFilter === s
                    ? "bg-sky-500/10 text-sky-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white/50 border border-slate-200/60 rounded-xl overflow-x-auto min-w-max p-0.5 shadow-sm">
          {severityFilters.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSeverityFilter(s);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                severityFilter === s
                  ? "bg-sky-500/10 text-sky-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Bug List */}
      <GlassCard className="shadow-sm">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-[#0f172a]/08 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
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
          <div className="p-4">
            <BugListSkeleton />
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
                  className="grid grid-cols-12 gap-4 px-5 py-3.5 border-b border-[#0f172a]/04 hover:bg-slate-100/30 transition-colors group"
                >
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <Bug className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700 font-semibold truncate group-hover:text-sky-600 transition-colors">
                      {bug.title}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        bug.priorityScore >= 80
                          ? "text-red-500"
                          : bug.priorityScore >= 60
                          ? "text-amber-500"
                          : bug.priorityScore >= 40
                          ? "text-yellow-600"
                          : "text-sky-550"
                      }`}
                    >
                      {bug.priorityScore}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <PriorityBadge severity={bug.severity} />
                  </div>
                  <div className="col-span-1 flex items-center">
                    <span className="text-xs text-slate-450 capitalize font-medium">
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
                    <User className="w-3 h-3 text-slate-400" />
                    <select
                      className="text-xs bg-transparent text-slate-400 hover:text-slate-800 focus:outline-none cursor-pointer appearance-none w-full font-medium"
                      value={bug.assigneeHandle || ""}
                      onChange={(e) => {
                        const handle = e.target.value;
                        if (handle) assignMutation.mutate({ id: bug.id, assigneeHandle: handle });
                      }}
                      disabled={assignMutation.isPending}
                    >
                      <option value="" disabled>Unassigned</option>
                      {teamMembers?.map(member => (
                        <option key={member.id} value={member.handle} className="bg-white text-slate-850">
                          {member.handle.replace("@", "")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <div className="h-1.5 w-10 bg-[#0f172a]/08 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-teal-500"
                        style={{ width: `${bug.priorityScore}%` }}
                      />
                    </div>
                  </div>
                  <div className="col-span-1 flex items-center">
                    {bug.githubIssueId ? (
                      <span className="flex items-center gap-1 text-[10px] text-sky-600 font-bold">
                        <Github className="w-3 h-3" />
                        #{bug.githubIssueId}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        —
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}

            {(!data?.items || data.items.length === 0) && (
              <div className="p-8 text-center text-slate-400 text-sm font-medium">
                No issues found matching your filters.
              </div>
            )}
          </motion.div>
        )}

        {/* Pagination */}
        {data && data.total > limit && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#0f172a]/08">
            <span className="text-xs text-slate-400 font-medium">
              Showing {(page - 1) * limit + 1} - {Math.min(page * limit, data.total)} of {data.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs text-slate-450 bg-white/50 rounded-lg hover:bg-slate-100/50 transition-colors border border-slate-200/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= data.total}
                className="px-3 py-1.5 text-xs text-slate-450 bg-white/50 rounded-lg hover:bg-slate-100/50 transition-colors border border-slate-200/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
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
    open: "bg-red-500",
    in_progress: "bg-sky-500",
    resolved: "bg-emerald-500",
    closed: "bg-slate-400",
  };

  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${colors[status] || "bg-slate-400"}`} />
      <span className="text-xs text-slate-450 capitalize font-medium">
        {status.replace("_", " ")}
      </span>
    </span>
  );
}
