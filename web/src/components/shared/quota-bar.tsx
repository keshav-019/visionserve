import type { Quota } from "@/lib/types";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export function QuotaBar({ quota }: { quota: Quota }) {
  const pct = Math.min(100, (quota.used / quota.limit) * 100);
  const tone = pct >= 90 ? "bg-destructive" : pct >= 75 ? "bg-warning" : "bg-primary";
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium">{quota.label}</span>
        <span className="font-mono font-tnum text-muted-foreground">
          {formatCompact(quota.used)} / {formatCompact(quota.limit)} {quota.unit}
          <span className="ml-1.5">({quota.period})</span>
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${quota.label}: ${pct.toFixed(0)}% used`}
      >
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {pct >= 75 && (
        <p className={cn("text-[11px]", pct >= 90 ? "text-destructive" : "text-warning")}>
          {pct >= 100
            ? "Quota exhausted — requests are being rejected."
            : pct >= 90
              ? "90% threshold reached."
              : "75% threshold reached."}
        </p>
      )}
    </div>
  );
}
