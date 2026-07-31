import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "destructive" | "info" | "muted" | "primary";

const statusTone: Record<string, Tone> = {
  // job statuses
  succeeded: "success",
  failed: "destructive",
  running: "info",
  queued: "warning",
  cancelled: "muted",
  expired: "muted",
  // model statuses
  healthy: "success",
  degraded: "warning",
  failed_model: "destructive",
  inactive: "muted",
  loading: "info",
  warming: "info",
  unloading: "muted",
  unavailable: "destructive",
  // deployment
  active: "success",
  rolling_out: "info",
  paused: "muted",
  // batch
  partial_failure: "warning",
  // system components
  operational: "success",
  partial_outage: "warning",
  major_outage: "destructive",
  maintenance: "muted",
  // misc
  pending: "warning",
  accepted: "success",
  revoked: "destructive",
  suspended: "warning",
  invited: "info",
  failing: "destructive",
  resolved: "success",
  investigating: "destructive",
  identified: "warning",
  monitoring: "info",
  denied: "destructive",
  error: "destructive",
  beta: "primary",
  live: "success",
  test: "warning",
};

const toneClasses: Record<Tone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-info/30 bg-info/10 text-info",
  muted: "border-border bg-muted text-muted-foreground",
  primary: "border-primary/30 bg-primary/10 text-primary",
};

const dotClasses: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  muted: "bg-muted-foreground",
  primary: "bg-primary",
};

const pulsing = new Set(["running", "loading", "warming", "rolling_out", "investigating"]);

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const tone = statusTone[status] ?? "muted";
  const text = label ?? status.replace(/_/g, " ");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap capitalize",
        toneClasses[tone],
        className,
      )}
    >
      <span className="relative flex size-1.5">
        {pulsing.has(status) && (
          <span
            className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", dotClasses[tone])}
            aria-hidden
          />
        )}
        <span className={cn("relative inline-flex size-1.5 rounded-full", dotClasses[tone])} aria-hidden />
      </span>
      {text}
    </span>
  );
}
