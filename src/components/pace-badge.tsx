import { AlertTriangle, CheckCircle2, Clock, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PACE_LABEL, type PaceStatus } from "@/lib/lifecycle";

const STYLES: Record<PaceStatus, string> = {
  "on-track": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  watch: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  behind: "bg-destructive/10 text-destructive",
  done: "bg-primary/10 text-primary",
  unknown: "bg-muted text-muted-foreground",
};

const ICONS: Record<PaceStatus, typeof Clock> = {
  "on-track": CheckCircle2,
  watch: Clock,
  behind: AlertTriangle,
  done: CheckCircle2,
  unknown: HelpCircle,
};

/**
 * Schedule status for a project.
 *
 * NOTE: this is deliberately attached to the PROJECT, never to a person. A
 * project being behind is an actionable fact the whole team can respond to;
 * scoring individuals on the same signals would be gameable and unfair.
 */
export function PaceBadge({
  status,
  className,
  showLabel = true,
}: {
  status: PaceStatus;
  className?: string;
  showLabel?: boolean;
}) {
  const Icon = ICONS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        STYLES[status],
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {showLabel && PACE_LABEL[status]}
    </span>
  );
}
