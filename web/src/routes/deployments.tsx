import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EnvBadge } from "@/components/shared/env-badge";
import { Button } from "@/components/ui/button";
import { deploymentsQueryOptions } from "@/services/models";
import { formatMs, formatPercent, formatRelative } from "@/lib/format";
import type { Deployment } from "@/lib/types";

export const Route = createFileRoute("/deployments")({
  head: () => ({
    meta: [
      { title: "Deployments — VisionServe" },
      { name: "description", content: "Manage model deployments across regions and environments: replicas, traffic, error rates, and queue depth." },
      { property: "og:title", content: "Deployments — VisionServe" },
      { property: "og:description", content: "Manage model deployments across regions and environments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(deploymentsQueryOptions());
  },
  component: DeploymentsPage,
});

const columns: ColumnDef<Deployment, unknown>[] = [
  { accessorKey: "name", header: "Deployment", cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.name}</span> },
  { accessorKey: "modelId", header: "Model", cell: ({ row }) => <span className="font-mono text-xs">{row.original.modelId}@{row.original.version}</span> },
  { accessorKey: "environment", header: "Env", cell: ({ row }) => <EnvBadge env={row.original.environment} /> },
  { accessorKey: "region", header: "Region", cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.region}</span> },
  { accessorKey: "replicas", header: "Replicas", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{row.original.replicas}</span> },
  { accessorKey: "trafficPct", header: "Traffic", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{row.original.trafficPct}%</span> },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: "p95Ms", header: "P95", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{formatMs(row.original.p95Ms)}</span> },
  { accessorKey: "errorRate", header: "Errors", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{formatPercent(row.original.errorRate)}</span> },
  { accessorKey: "queueDepth", header: "Queue", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{row.original.queueDepth}</span> },
  { accessorKey: "updatedAt", header: "Updated", cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelative(row.original.updatedAt)}</span> },
];

function DeploymentsPage() {
  const navigate = useNavigate();
  const { data: deployments, isLoading } = useSuspenseQuery(deploymentsQueryOptions());

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Deployments"
        description="Where each model version actually runs: replicas, traffic share, and rollout state."
        actions={
          <Button size="sm" onClick={() => toast.success("Deployment wizard opened", { description: "Pick a model version, region, and replica count." })}>
            <Plus className="size-4" aria-hidden />
            New deployment
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={deployments}
        isLoading={isLoading}
        searchPlaceholder="Search deployments…"
        searchable
        getRowId={(d) => d.id}
        onRowClick={(d) => navigate({ to: "/deployments/$deploymentId", params: { deploymentId: d.id } })}
        emptyTitle="No deployments"
        emptyDescription="Deploy a model version to start serving traffic."
      />
    </div>
  );
}
