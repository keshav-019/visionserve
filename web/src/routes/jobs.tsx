import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ListChecks } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EnvBadge } from "@/components/shared/env-badge";
import { IdChip } from "@/components/shared/copy-button";
import { EmptyState } from "@/components/shared/empty-state";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { jobsQueryOptions, type JobFilters } from "@/services/jobs";
import { modelsQueryOptions } from "@/services/models";
import { formatBytes, formatMs, formatRelative } from "@/lib/format";
import type { InferenceJob, JobStatus, Operation } from "@/lib/types";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Jobs — VisionServe" },
      { name: "description", content: "Track asynchronous inference jobs: queue position, progress, latency, and failures across all models and environments." },
      { property: "og:title", content: "Jobs — VisionServe" },
      { property: "og:description", content: "Track asynchronous inference jobs across all models and environments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(jobsQueryOptions());
    void context.queryClient.ensureQueryData(modelsQueryOptions());
  },
  component: JobsPage,
});

function JobsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<JobFilters>({});
  const { data: jobList, isLoading } = useSuspenseQuery(jobsQueryOptions(filters));
  const { data: modelList } = useSuspenseQuery(modelsQueryOptions());

  const columns: ColumnDef<InferenceJob, unknown>[] = [
    {
      accessorKey: "id",
      header: "Job ID",
      cell: ({ row }) => <IdChip value={row.original.id} head={10} tail={4} copyable={false} />,
    },
    {
      accessorKey: "operation",
      header: "Operation",
      cell: ({ row }) => <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px]">{row.original.operation}</span>,
    },
    {
      accessorKey: "modelId",
      header: "Model",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.modelId}@{row.original.modelVersion}
        </span>
      ),
    },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      accessorKey: "progress",
      header: "Progress",
      cell: ({ row }) => (
        <div className="flex w-24 items-center gap-2">
          <Progress value={row.original.progress} className="h-1.5" />
          <span className="font-mono text-[11px] font-tnum text-muted-foreground">{row.original.progress}%</span>
        </div>
      ),
    },
    {
      id: "latency",
      header: "Latency",
      cell: ({ row }) => <span className="font-mono text-xs font-tnum">{formatMs(row.original.timing?.totalMs)}</span>,
    },
    { accessorKey: "inputSizeBytes", header: "Input", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{formatBytes(row.original.inputSizeBytes)}</span> },
    { accessorKey: "environment", header: "Env", cell: ({ row }) => <EnvBadge env={row.original.environment} /> },
    { accessorKey: "owner", header: "Owner", cell: ({ row }) => <span className="max-w-40 truncate font-mono text-xs text-muted-foreground">{row.original.owner}</span> },
    { accessorKey: "createdAt", header: "Created", cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelative(row.original.createdAt)}</span> },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <PageHeader title="Jobs" description="Every asynchronous inference request, from queue admission to result persistence." />

      <DataTable
        columns={columns}
        data={jobList}
        isLoading={isLoading}
        searchPlaceholder="Search by ID, request, file, model…"
        pageSize={12}
        getRowId={(j) => j.id}
        onRowClick={(j) => navigate({ to: "/jobs/$jobId", params: { jobId: j.id } })}
        toolbar={
          <>
            <Select value={filters.status ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, status: v as JobStatus | "all" }))}>
              <SelectTrigger className="w-32 font-mono text-xs" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["all", "queued", "running", "succeeded", "failed", "cancelled", "expired"].map((s) => (
                  <SelectItem key={s} value={s} className="font-mono text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.operation ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, operation: v as Operation | "all" }))}>
              <SelectTrigger className="w-32 font-mono text-xs" aria-label="Filter by operation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["all", "detect", "ocr", "classify", "resize", "grayscale", "metadata", "segment"].map((o) => (
                  <SelectItem key={o} value={o} className="font-mono text-xs">{o}</SelectItem>
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
        emptyTitle="No jobs match"
        emptyDescription="Try different filters, or submit a job from the playground."
      />

      {jobList.length === 0 && !isLoading && (
        <EmptyState
          icon={ListChecks}
          title="Nothing queued"
          description="Jobs appear here as soon as you submit inference work through the API or playground."
          action={{ label: "Open playground", href: "/playground" }}
        />
      )}
    </div>
  );
}
