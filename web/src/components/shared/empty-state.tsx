import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryHref,
  secondaryLabel = "Read the documentation",
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick?: () => void; href?: string };
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="flex size-11 items-center justify-center rounded-lg border bg-muted">
        <Icon className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground text-balance">{description}</p>
      {(action || secondaryHref) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action &&
            (action.href ? (
              <Button asChild size="sm">
                <Link to={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <Button size="sm" onClick={action.onClick}>
                {action.label}
              </Button>
            ))}
          {secondaryHref && (
            <Button asChild variant="ghost" size="sm">
              <Link to={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
