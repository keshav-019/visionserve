import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

export function CodeBlock({
  code,
  language,
  title,
  className,
  maxHeight,
}: {
  code: string;
  language?: string;
  title?: string;
  className?: string;
  maxHeight?: number;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border bg-muted/40", className)}>
      <div className="flex items-center justify-between border-b bg-muted/60 px-3 py-1.5">
        <span className="font-mono text-[11px] text-muted-foreground">
          {title ?? language ?? "code"}
        </span>
        <CopyButton value={code} label={`Copy ${language ?? "code"}`} />
      </div>
      <pre
        className="overflow-auto p-3 font-mono text-xs leading-relaxed text-foreground"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function InlineCode({ children }: { children: string }) {
  return (
    <code className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
      {children}
    </code>
  );
}
