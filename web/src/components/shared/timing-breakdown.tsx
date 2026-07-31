import type { InferenceTiming } from "@/lib/types";
import { formatMs } from "@/lib/format";
import { cn } from "@/lib/utils";

const segments: { key: keyof InferenceTiming; label: string; color: string }[] = [
  { key: "uploadMs", label: "Upload", color: "var(--chart-5)" },
  { key: "queueWaitMs", label: "Queue wait", color: "var(--chart-3)" },
  { key: "decodeMs", label: "Decode", color: "var(--muted-foreground)" },
  { key: "preprocessMs", label: "Preprocess", color: "var(--chart-2)" },
  { key: "inferenceMs", label: "Inference", color: "var(--chart-1)" },
  { key: "postprocessMs", label: "Postprocess", color: "var(--chart-2)" },
  { key: "serializationMs", label: "Serialization", color: "var(--muted-foreground)" },
];

export function TimingBreakdown({
  timing,
  className,
}: {
  timing: InferenceTiming;
  className?: string;
}) {
  const present = segments.filter((s) => timing[s.key] !== undefined && timing[s.key]! > 0);
  return (
    <div className={cn("space-y-3", className)}>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`Timing breakdown, total ${formatMs(timing.totalMs)}`}
      >
        {present.map((s) => (
          <div
            key={s.key}
            style={{
              width: `${(timing[s.key]! / timing.totalMs) * 100}%`,
              backgroundColor: s.color,
            }}
            title={`${s.label}: ${formatMs(timing[s.key])}`}
          />
        ))}
      </div>
      <ul className="space-y-1">
        {present.map((s) => (
          <li key={s.key} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="size-2 rounded-sm"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
              {s.label}
            </span>
            <span className="font-mono font-tnum">
              {formatMs(timing[s.key])}
              <span className="ml-2 text-muted-foreground">
                {((timing[s.key]! / timing.totalMs) * 100).toFixed(0)}%
              </span>
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between border-t pt-1.5 text-xs font-medium">
          <span>Total</span>
          <span className="font-mono font-tnum">{formatMs(timing.totalMs)}</span>
        </li>
      </ul>
    </div>
  );
}
