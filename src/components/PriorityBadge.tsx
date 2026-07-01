import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  severity: string;
  className?: string;
}

export function PriorityBadge({ severity, className }: PriorityBadgeProps) {
  const level = severity?.toUpperCase() || "P3";
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider",
        level === "P0" && "priority-p0",
        level === "P1" && "priority-p1",
        level === "P2" && "priority-p2",
        level === "P3" && "priority-p3",
        className
      )}
    >
      {level}
    </span>
  );
}
