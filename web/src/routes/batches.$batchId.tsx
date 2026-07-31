import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Layers, Webhook, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EnvBadge } from "@/components/shared/env-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DescriptionList } from "@/components/shared/description-list";
import { IdChip } from "@/components/shared/copy-button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { MetricCard } from "@/components/shared/metric-card";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { batchQueryOptions } from "@/services/batches";
import { formatDateTime, formatDuration, formatMs, formatNumber, formatPercent } from "@/lib/format";
import type { BatchItem } from "@/lib/types";

export const Route = createFileRoute("/batches/$batchId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.batchId} — Batches — VisionServe` },
      { name: "description", content: `Batch ${params.batchId}: per-item progress, failures, and completion details.` },
      { property: "og:title", content: `${params.batchId} — VisionServe` },
      { property: "og:description", content: "Batch per-item progress and completion details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context, params }) => {
    void context.queryClient.ensureQueryData(batchQueryOptions(params.batchId));
  },
  component: BatchDetailPage,
});

const itemColumns: ColumnDef<BatchItem, unknown>[] = [
  { accessorKey: "n", header: "#", cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.n}</span> },
  { accessorKey: "filename", header: "File", cell: ({ row }) => <span className="font-mono text-xs">{row.original.filename}</span> },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: "resultCount", header: "Results", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{row.original.resultCount}</span> },
  { accessorKey: "inferenceMs", header: "Inference", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{formatMs(row.original.inferenceMs)}</span> },
  { accessorKey: "error", header: "Error", cell: ({ row }) => (row.original.error ? <span className="font-mono text-xs text-destructive">{row.original.error}</span> : <span className="text-muted-foreground">—</span>) },
];

function BatchDetailPage() {
  const { batchId } = Route.useParams();
  const { data: batch } = useSuspenseQuery(batchQueryOptions(batchId));

  if (!batch) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <EmptyState
          icon={Layers}
          title="Batch not found"
          description={`No batch with ID "${batchId}" exists in this workspace.`}
          action={{ label: "Back to batches", href: "/batches" }}
        />
      </div>
    );
  }

  const done = batch.completed + batch.failed;
  const pct = Math.round((done / batch.totalFiles) * 100);
  const failureRate = done > 0 ? (batch.failed / done) * 100 : 0;
  const running = batch.status === "running" || batch.status === "queued";

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 text-muted-foreground">
        <Link to="/batches">
          <ArrowLeft className="size-3.5" aria-hidden />
          Batches
        </Link>
      </Button>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <IdChip value={batch.id} head={14} tail={6} />
            <StatusBadge status={batch.status} />
            <EnvBadge env={batch.environment} />
          </span>
        }
        description={
          <span className="font-mono text-xs">
            {batch.modelId}@{batch.modelVersion} · {formatNumber(batch.totalFiles)} files · by {batch.owner}
          </span>
        }
        actions={
          <>
            {running && (
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="outline">
                    <XCircle className="size-3.5" aria-hidden />
                    Cancel batch
                  </Button>
                }
                title="Cancel this batch?"
                description={`${formatNumber(batch.totalFiles - done)} unprocessed files will be skipped. Completed results remain available.`}
                confirmLabel="Cancel batch"
                onConfirm={() => toast.success("Batch cancelled", { description: "Remaining files were dequeued." })}
              />
            )}
            {(batch.status === "succeeded" || batch.status === "partial_failure") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.success("Archive prepared", { description: "A download link will be delivered by email shortly." })}
              >
                <Download className="size-3.5" aria-hidden />
                Download archive
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Completed" value={`${formatNumber(batch.completed)} / ${formatNumber(batch.totalFiles)}`} hint={`${pct}% of files`} />
        <MetricCard label="Failed" value={formatNumber(batch.failed)} deltaInvert hint={formatPercent(failureRate, 1) + " failure rate"} />
        <MetricCard label="Duration" value={formatDuration(batch.durationMs ?? (running ? Date.now() - new Date(batch.createdAt).getTime() : 0))} hint={running ? "still running" : "total"} />
        <MetricCard label="Parallelism" value={`${batch.maxParallelism}`} hint={batch.continueOnFailure ? "continues on failure" : "stops on first failure"} />
      </div>

      <div className="rounded-lg border bg-card px-4 py-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">{running ? "Processing files…" : "Processing complete"}</span>
          <span className="font-mono font-tnum text-muted-foreground">{pct}%</span>
        </div>
        <Progress value={pct} className="mt-2 h-1.5" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title={`Sample items (${batch.items.length} of ${formatNumber(batch.totalFiles)})`} description="First files in the manifest">
            <DataTable columns={itemColumns} data={batch.items} searchable={false} pageSize={12} getRowId={(i) => String(i.n)} />
          </SectionCard>
        </div>
        <div className="space-y-4">
          <SectionCard title="Configuration">
            <DescriptionList
              columns={1}
              items={[
                { term: "Model", value: `${batch.modelId}@${batch.modelVersion}`, mono: true },
                { term: "Max parallelism", value: `${batch.maxParallelism} workers`, mono: true },
                { term: "Continue on failure", value: batch.continueOnFailure ? "yes" : "no", mono: true },
                { term: "Created", value: formatDateTime(batch.createdAt) },
                { term: "Completed", value: formatDateTime(batch.completedAt) },
              ]}
            />
          </SectionCard>
          {batch.webhook && (
            <SectionCard title="Completion webhook">
              <div className="flex items-start gap-2">
                <Webhook className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <p className="font-mono text-xs break-all">{batch.webhook}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Receives <span className="font-mono">batch.completed</span> / <span className="font-mono">batch.failed</span> with HMAC signature.
                  </p>
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
