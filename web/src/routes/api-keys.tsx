import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { KeyRound, Plus } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EnvBadge } from "@/components/shared/env-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CopyButton } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiKeysQueryOptions, createApiKey } from "@/services/apiKeys";
import { formatCompact, formatDateTime, formatPercent, formatRelative } from "@/lib/format";
import type { ApiKey, Environment } from "@/lib/types";

export const Route = createFileRoute("/api-keys")({
  head: () => ({
    meta: [
      { title: "API Keys — VisionServe" },
      { name: "description", content: "Create and manage API keys, scopes, rate limits, and per-key usage." },
      { property: "og:title", content: "API Keys — VisionServe" },
      { property: "og:description", content: "Create and manage API keys, scopes, and rate limits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(apiKeysQueryOptions());
  },
  component: ApiKeysPage,
});

const ALL_SCOPES = ["inference:run", "jobs:read", "jobs:write", "batches:write", "results:read", "models:read"];

function ApiKeysPage() {
  const { data: keys, isLoading } = useSuspenseQuery(apiKeysQueryOptions());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<Environment>("production");
  const [scopes, setScopes] = useState<string[]>(["inference:run", "results:read"]);
  const [creating, setCreating] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const toggleScope = (scope: string) =>
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));

  const handleCreate = async () => {
    setCreating(true);
    const res = await createApiKey({ name: name.trim() || "Untitled key", environment, scopes });
    setCreating(false);
    setCreatedSecret(res.key);
    toast.success("API key created", { description: "Copy the secret now — it will not be shown again." });
  };

  const closeDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setCreatedSecret(null);
      setName("");
      setScopes(["inference:run", "results:read"]);
    }
  };

  const columns: ColumnDef<ApiKey, unknown>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="text-xs font-medium">{row.original.name}</span> },
    { accessorKey: "prefix", header: "Prefix", cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.prefix}…</span> },
    { accessorKey: "environment", header: "Env", cell: ({ row }) => <EnvBadge env={row.original.environment} /> },
    {
      accessorKey: "scopes",
      header: "Scopes",
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {row.original.scopes.slice(0, 2).join(", ")}
          {row.original.scopes.length > 2 ? ` +${row.original.scopes.length - 2}` : ""}
        </span>
      ),
    },
    { accessorKey: "requests", header: "Requests", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{formatCompact(row.original.requests)}</span> },
    { accessorKey: "errorRate", header: "Errors", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{formatPercent(row.original.errorRate)}</span> },
    { accessorKey: "rateLimit", header: "Rate limit", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{row.original.rateLimit}/min</span> },
    {
      accessorKey: "lastUsedAt",
      header: "Last used",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.lastUsedAt ? formatRelative(row.original.lastUsedAt) : "never"}</span>,
    },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.status === "active" ? (
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive">
                Revoke
              </Button>
            }
            title={`Revoke "${row.original.name}"?`}
            description="Requests signed with this key will start failing immediately. This cannot be undone."
            confirmLabel="Revoke key"
            onConfirm={() => toast.success("Key revoked", { description: `${row.original.prefix}… can no longer authenticate.` })}
          />
        ) : null,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="API keys"
        description="Keys authenticate REST and gRPC calls. Secrets are shown once at creation."
        actions={
          <Dialog open={dialogOpen} onOpenChange={closeDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" aria-hidden />
                Create key
              </Button>
            </DialogTrigger>
            <DialogContent>
              {createdSecret ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <KeyRound className="size-4" aria-hidden />
                      Save your secret
                    </DialogTitle>
                    <DialogDescription>This is the only time the full key is displayed.</DialogDescription>
                  </DialogHeader>
                  <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
                    <code className="flex-1 break-all font-mono text-xs">{createdSecret}</code>
                    <CopyButton value={createdSecret} aria-label="Copy API key secret" />
                  </div>
                  <DialogFooter>
                    <Button onClick={() => closeDialog(false)}>Done</Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Create API key</DialogTitle>
                    <DialogDescription>Choose an environment and the minimum scopes the key needs.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="key-name">Name</Label>
                      <Input id="key-name" placeholder="e.g. production-backend" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="key-env">Environment</Label>
                      <Select value={environment} onValueChange={(v) => setEnvironment(v as Environment)}>
                        <SelectTrigger id="key-env">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="production">Production</SelectItem>
                          <SelectItem value="staging">Staging</SelectItem>
                          <SelectItem value="development">Development</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Scopes</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {ALL_SCOPES.map((scope) => (
                          <label key={scope} className="flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs">
                            <Checkbox checked={scopes.includes(scope)} onCheckedChange={() => toggleScope(scope)} aria-label={scope} />
                            <span className="font-mono">{scope}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => closeDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={creating || scopes.length === 0}>
                      {creating ? "Creating…" : "Create key"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        }
      />
      <DataTable
        columns={columns}
        data={keys}
        isLoading={isLoading}
        searchPlaceholder="Search keys…"
        getRowId={(k) => k.id}
        emptyTitle="No API keys"
        emptyDescription="Create a key to start calling the inference API."
      />
      <p className="text-xs text-muted-foreground">
        Keys created before {formatDateTime("2026-01-01T00:00:00Z")} use the legacy rate-limit tier and should be rotated.
      </p>
    </div>
  );
}
