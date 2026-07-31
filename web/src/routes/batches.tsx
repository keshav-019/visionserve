import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EnvBadge } from "@/components/shared/env-badge";
import { IdChip } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { batchesQueryOptions, type BatchFilters } from "@/services/batches";
import { modelsQueryOptions } from "@/services/models";
import { formatDuration, formatNumber, formatRelative } from "@/lib/format";
import type { Batch, BatchStatus } from "@/lib/types";

export const Route = createFileRoute("/batches")({
  head: () => ({
    meta: [
      { title: "Batches — VisionServe" },
      { name: "description", content: "Run and monitor bulk inference over large image sets with parallelism controls, failure handling, and completion webhooks." },
      { property: "og:title", content: "Batches — VisionServe" },
      { property: "og:description", content: "Run and monitor bulk inference over large image sets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(batchesQueryOptions());
    void context.queryClient.ensureQueryData(modelsQueryOptions());
  },
  component: BatchesPage,
});

function BatchesPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<BatchFilters>({});
  const { data: batchList, isLoading } = useSuspenseQuery(batchesQueryOptions(filters));
  const { data: modelList } = useSuspenseQuery(modelsQueryOptions());

  const columns: ColumnDef<Batch, unknown>[] = [
    { accessorKey: "id", header: "Batch ID", cell: ({ row }) => <IdChip value={row.original.id} head={10} tail={4} copyable={false} /> },
    {
      accessorKey: "modelId",
      header: "Model",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.modelId}@{row.original.modelVersion}</span>,
    },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: "progress",
      header: "Progress",
      cell: ({ row }) => {
        const b = row.original;
        const pct = Math.round(((b.completed + b.failed) / b.totalFiles) * 100);
        return (
          <div className="w-36">
            <div className="flex justify-between font-mono text-[11px] font-tnum text-muted-foreground">
              <span>{formatNumber(b.completed)} ok</span>
              <span>{b.failed > 0 ? `${b.failed} failed` : pct + "%"}</span>
            </div>
            <Progress value={pct} className="mt-1 h-1.5" />
          </div>
        );
      },
    },
    { accessorKey: "totalFiles", header: "Files", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{formatNumber(row.original.totalFiles)}</span> },
    { accessorKey: "durationMs", header: "Duration", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{formatDuration(row.original.durationMs)}</span> },
    { accessorKey: "environment", header: "Env", cell: ({ row }) => <EnvBadge env={row.original.environment} /> },
    { accessorKey: "owner", header: "Owner", cell: ({ row }) => <span className="max-w-36 truncate font-mono text-xs text-muted-foreground">{row.original.owner}</span> },
    { accessorKey: "createdAt", header: "Created", cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelative(row.original.createdAt)}</span> },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Batches"
        description="Bulk inference over large image sets with parallelism controls and completion webhooks."
        actions={
          <Button
            size="sm"
            onClick={() => toast.success("Batch created", { description: "Upload a manifest of image URLs to start processing." })}
          >
            <Plus className="size-4" aria-hidden />
            New batch
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={batchList}
        isLoading={isLoading}
        searchPlaceholder="Search by ID or owner…"
        getRowId={(b) => b.id}
        onRowClick={(b) => navigate({ to: "/batches/$batchId", params: { batchId: b.id } })}
        toolbar={
          <>
            <Select value={filters.status ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, status: v as BatchStatus | "all" }))}>
              <SelectTrigger className="w-40 font-mono text-xs" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["all", "queued", "running", "succeeded", "partial_failure", "failed", "cancelled"].map((s) => (
                  <SelectItem key={s} value={s} className="font-mono text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.modelId ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, modelId: v }))}>
              <SelectTrigger className="w-40 font-mono text-xs" aria-label="Filter by model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-mono text-xs">all models</SelectItem>
                {modelList.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="font-mono text-xs">{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        emptyTitle="No batches yet"
        emptyDescription="Create a batch to process hundreds of images in one go."
      />
    </div>
  );
}
