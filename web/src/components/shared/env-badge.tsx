import type { Environment } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<Environment, string> = {
  development: "border-info/30 bg-info/10 text-info",
  staging: "border-warning/40 bg-warning/10 text-warning",
  production: "border-success/30 bg-success/10 text-success",
};

export function EnvBadge({ env, className }: { env: Environment; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide uppercase",
        styles[env],
        className,
      )}
    >
      {env === "production" ? "prod" : env === "development" ? "dev" : "staging"}
    </span>
  );
}
