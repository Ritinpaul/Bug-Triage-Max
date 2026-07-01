import { cn } from "@/lib/utils";
import { Slack, Mail, FileText } from "lucide-react";

interface SourceBadgeProps {
  source: string;
  className?: string;
}

const sourceConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; className: string; label: string }> = {
  slack: { icon: Slack, className: "source-slack", label: "Slack" },
  email: { icon: Mail, className: "source-email", label: "Email" },
  form: { icon: FileText, className: "source-form", label: "Form" },
};

export function SourceBadge({ source, className }: SourceBadgeProps) {
  const config = sourceConfig[source] || { icon: FileText, className: "source-form", label: source };
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
        config.className,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
