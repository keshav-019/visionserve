import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function MetricCard({
  label,
  value,
  delta,
  deltaInvert = false,
  icon: Icon,
  hint,
  mono = true,
  isLoading,
}: {
  label: string;
  value: string;
  delta?: number;
  /** true when a decrease is good (e.g. latency, error rate) */
  deltaInvert?: boolean;
  icon?: LucideIcon;
  hint?: string;
  mono?: boolean;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-7 w-28" />
          <Skeleton className="mt-2 h-3 w-24" />
        </CardContent>
      </Card>
    );
  }
  const positive = delta !== undefined && (deltaInvert ? delta < 0 : delta > 0);
  const negative = delta !== undefined && (deltaInvert ? delta > 0 : delta < 0);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {Icon && <Icon className="size-3.5 text-muted-foreground/70" aria-hidden />}
        </div>
        <p
          className={cn(
            "mt-1.5 text-2xl font-semibold tracking-tight font-tnum",
            mono && "font-mono text-[22px]",
          )}
        >
          {value}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs">
          {delta !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium font-tnum",
                positive && "text-success",
                negative && "text-destructive",
                !positive && !negative && "text-muted-foreground",
              )}
            >
              {delta > 0 ? (
                <ArrowUpRight className="size-3" aria-hidden />
              ) : delta < 0 ? (
                <ArrowDownRight className="size-3" aria-hidden />
              ) : null}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
