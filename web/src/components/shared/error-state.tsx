import { AlertTriangle, CloudOff, Lock, ShieldAlert, type LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const icons: Record<string, LucideIcon> = {
  generic: AlertTriangle,
  offline: CloudOff,
  permission: Lock,
  rateLimit: ShieldAlert,
};

export function ErrorState({
  kind = "generic",
  title = "Something went wrong",
  message = "The request failed. You can retry, or contact support with the request ID if the problem persists.",
  requestId,
  onRetry,
}: {
  kind?: "generic" | "offline" | "permission" | "rateLimit";
  title?: string;
  message?: string;
  requestId?: string;
  onRetry?: () => void;
}) {
  const Icon = icons[kind];
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex size-11 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10">
        <Icon className="size-5 text-destructive" aria-hidden />
      </div>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground text-balance">{message}</p>
      {requestId && (
        <p className="mt-2 font-mono text-xs text-muted-foreground">request_id: {requestId}</p>
      )}
      <div className="mt-5 flex items-center gap-2">
        {onRetry && (
          <Button size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
        <Button asChild variant="ghost" size="sm">
          <Link to="/system-health">Check system health</Link>
        </Button>
      </div>
    </div>
  );
}

export function PermissionDenied({ resource }: { resource?: string }) {
  return (
    <ErrorState
      kind="permission"
      title="Permission denied"
      message={`Your role does not allow access to ${resource ?? "this resource"}. Ask an administrator to update your permissions in Access Control.`}
    />
  );
}
