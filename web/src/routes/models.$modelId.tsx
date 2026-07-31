import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Boxes, Rocket, Trash2, Unplug } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EnvBadge } from "@/components/shared/env-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DescriptionList } from "@/components/shared/description-list";
import { IdChip } from "@/components/shared/copy-button";
import { JsonView } from "@/components/shared/json-view";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { MetricCard } from "@/components/shared/metric-card";
import { AreaTrend, ChartCard, LineTrend } from "@/components/shared/charts";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { modelQueryOptions, deploymentsQueryOptions } from "@/services/models";
import { latencyQueryOptions, requestVolumeQueryOptions } from "@/services/metrics";
import { formatBytes, formatCompact, formatDateTime, formatMs, formatPercent } from "@/lib/format";
import type { ColumnDef } from "@tanstack/react-table";
import type { ModelVersion } from "@/lib/types";

export const Route = createFileRoute("/models/$modelId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.modelId} — Model Registry — VisionServe` },
      { name: "description", content: `Model ${params.modelId}: versions, runtime configuration, metrics, and deployment actions.` },
      { property: "og:title", content: `${params.modelId} — VisionServe` },
      { property: "og:description", content: "Model versions, runtime configuration, and metrics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context, params }) => {
    void context.queryClient.ensureQueryData(modelQueryOptions(params.modelId));
    void context.queryClient.ensureQueryData(deploymentsQueryOptions());
  },
  component: ModelDetailPage,
});

function ModelDetailPage() {
  const { modelId } = Route.useParams();
  const { data: model } = useSuspenseQuery(modelQueryOptions(modelId));
  const { data: deployments } = useSuspenseQuery(deploymentsQueryOptions());
  const { data: latency } = useSuspenseQuery(latencyQueryOptions());
  const { data: volume } = useSuspenseQuery(requestVolumeQueryOptions("24h"));

  if (!model) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <EmptyState
          icon={Boxes}
          title="Model not found"
          description={`No model with ID "${modelId}" exists in this workspace.`}
          action={{ label: "Back to registry", href: "/models" }}
        />
      </div>
    );
  }

  const modelDeployments = deployments.filter((d) => d.modelId === model.id);

  const versionColumns: ColumnDef<ModelVersion, unknown>[] = [
    { accessorKey: "version", header: "Version", cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.version}</span> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: "requests", header: "Requests", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{formatCompact(row.original.requests)}</span> },
    { accessorKey: "avgLatencyMs", header: "Latency", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{formatMs(row.original.avgLatencyMs)}</span> },
    { accessorKey: "errorRate", header: "Error rate", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{formatPercent(row.original.errorRate)}</span> },
    { accessorKey: "sizeBytes", header: "Size", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{formatBytes(row.original.sizeBytes)}</span> },
    { accessorKey: "createdAt", header: "Created", cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</span> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.status === "inactive" ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() =>
              toast.success(`Rolled back to ${model.name}@${row.original.version}`, {
                description: "Traffic is shifting to the selected version.",
              })
            }
          >
            Activate
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 text-muted-foreground">
        <Link to="/models">
          <ArrowLeft className="size-3.5" aria-hidden />
          Registry
        </Link>
      </Button>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono">{model.name}</span>
            <StatusBadge status={model.status} />
            <EnvBadge env={model.environment} />
          </span>
        }
        description={model.description}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.success("Deployment queued", { description: `${model.name}@${model.activeVersion} will roll out to eu-central-1.` })}
            >
              <Rocket className="size-3.5" aria-hidden />
              Deploy
            </Button>
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="outline">
                  <Unplug className="size-3.5" aria-hidden />
                  Unload
                </Button>
              }
              title={`Unload ${model.name}?`}
              description="Workers will release the session. In-flight requests finish; new requests will be rejected with MODEL_UNAVAILABLE until it is reloaded."
              confirmLabel="Unload model"
              onConfirm={() => toast.success("Model unloaded", { description: `${model.name} sessions released on all workers.` })}
            />
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="destructive">
                  <Trash2 className="size-3.5" aria-hidden />
                  Delete
                </Button>
              }
              title={`Delete ${model.name}?`}
              description="This permanently removes the model, all versions, and its deployment history. Results and jobs are retained."
              confirmLabel="Delete model"
              requireTyped={model.name}
              onConfirm={() => toast.success("Model deleted", { description: `${model.name} was removed from the registry.` })}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total requests" value={formatCompact(model.requests)} icon={undefined} hint="lifetime" />
        <MetricCard label="Avg latency" value={formatMs(model.avgLatencyMs)} hint="active version" />
        <MetricCard label="Error rate" value={formatPercent(model.errorRate)} deltaInvert hint="24h rolling" />
        <MetricCard label="Active version" value={`v${model.activeVersion}`} mono hint={`${model.versions.length} versions`} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="versions">Versions ({model.versions.length})</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Runtime configuration">
              <DescriptionList
                items={[
                  { term: "Task", value: model.task, mono: true },
                  { term: "Runtime", value: model.runtime, mono: true },
                  { term: "Execution provider", value: model.executionProvider, mono: true },
                  { term: "Input shape", value: `[${model.inputShape.join(" × ")}]`, mono: true },
                  { term: "Output shape", value: model.outputShape, mono: true },
                  { term: "Artifact size", value: formatBytes(model.sizeBytes), mono: true },
                  { term: "Checksum", value: <IdChip value={model.checksum} head={16} tail={8} /> },
                  { term: "Owner", value: model.owner, mono: true },
                  { term: "Created", value: formatDateTime(model.createdAt) },
                  { term: "Updated", value: formatDateTime(model.updatedAt) },
                ]}
              />
            </SectionCard>
            <div className="space-y-4">
              <SectionCard title={`Labels (${model.labels.length})`} description="Classes the model can emit">
                <div className="flex flex-wrap gap-1.5">
                  {model.labels.map((l) => (
                    <span key={l} className="rounded-md border bg-muted px-2 py-0.5 font-mono text-[11px]">{l}</span>
                  ))}
                </div>
              </SectionCard>
              <SectionCard title="Deployments" description={`${modelDeployments.length} active`}>
                {modelDeployments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Not deployed anywhere yet.</p>
                ) : (
                  <ul className="divide-y">
                    {modelDeployments.map((d) => (
                      <li key={d.id}>
                        <Link
                          to="/deployments/$deploymentId"
                          params={{ deploymentId: d.id }}
                          className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0 hover:bg-muted/40 rounded px-1 -mx-1"
                        >
                          <span className="font-mono text-xs">{d.name}</span>
                          <span className="flex items-center gap-2">
                            <EnvBadge env={d.environment} />
                            <StatusBadge status={d.status} />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="versions">
          <DataTable
            columns={versionColumns}
            data={model.versions}
            searchable={false}
            getRowId={(v) => v.id}
            emptyTitle="No versions"
            emptyDescription="Load a new version artifact to add one."
          />
        </TabsContent>

        <TabsContent value="metrics" className="grid gap-4 xl:grid-cols-2">
          <ChartCard title="Latency percentiles" description="Last 48 hours, all versions">
            <LineTrend
              data={latency}
              series={[
                { key: "p50", label: "p50" },
                { key: "avg", label: "avg", color: "var(--chart-3)" },
                { key: "p95", label: "p95", color: "var(--chart-4)" },
              ]}
              yFormatter={(v) => `${v.toFixed(0)} ms`}
            />
          </ChartCard>
          <ChartCard title="Request volume" description="Last 24 hours">
            <AreaTrend
              data={volume}
              series={[
                { key: "succeeded", label: "Succeeded" },
                { key: "failed", label: "Failed", color: "var(--chart-4)" },
              ]}
              yFormatter={(v) => formatCompact(v)}
            />
          </ChartCard>
        </TabsContent>

        <TabsContent value="json">
          <JsonView data={model} title={`${model.id}.json`} maxHeight={520} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
