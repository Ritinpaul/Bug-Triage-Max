import { GlassCard } from "./GlassCard";

export function BugListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <GlassCard key={i} className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between animate-pulse">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0 mt-1" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
              <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:flex-col sm:items-end shrink-0 pl-12 sm:pl-0">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-900" />
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-900" />
            </div>
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
