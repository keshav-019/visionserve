import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { truncateMiddle } from "@/lib/format";

export function CopyButton({
  value,
  label,
  className,
  size = "icon",
}: {
  value: string;
  label?: string;
  className?: string;
  size?: "icon" | "sm";
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // clipboard unavailable (permissions) — fall through, still show feedback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (size === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("size-7", className)}
        onClick={copy}
        aria-label={label ?? `Copy ${value}`}
      >
        {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" className={className} onClick={copy}>
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : (label ?? "Copy")}
    </Button>
  );
}

/** Monospace identifier chip with optional click-to-copy. */
export function IdChip({
  value,
  head = 12,
  tail = 6,
  copyable = true,
  className,
}: {
  value: string;
  head?: number;
  tail?: number;
  copyable?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-xs", className)}>
      <span className="rounded bg-muted px-1.5 py-0.5">{truncateMiddle(value, head, tail)}</span>
      {copyable && <CopyButton value={value} className="size-5 [&_svg]:size-3" />}
    </span>
  );
}
