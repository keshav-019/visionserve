import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DescriptionList({
  items,
  columns = 2,
  className,
}: {
  items: { term: string; value: ReactNode; mono?: boolean }[];
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-3",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.term} className="min-w-0">
          <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{item.term}</dt>
          <dd className={cn("mt-0.5 truncate text-sm", item.mono && "font-mono text-xs")}>{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
