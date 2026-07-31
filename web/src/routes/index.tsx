import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Activity, ArrowRight, Gauge, HeartPulse, ListChecks, Timer, Zap } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { AreaTrend, ChartCard, LineTrend } from "@/components/shared/charts";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EnvBadge } from "@/components/shared/env-badge";
import { QuotaBar } from "@/components/shared/quota-bar";
import { IdChip } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  latencyQueryOptions,
  overviewQueryOptions,
  quotasQueryOptions,
  requestVolumeQueryOptions,
} from "@/services/metrics";
import { jobsQueryOptions } from "@/services/jobs";
import { deploymentsQueryOptions } from "@/services/models";
import { systemHealthQueryOptions } from "@/services/misc";
import { formatCompact, formatMs, formatPercent, formatRelative } from "@/lib/format";
import type { InferenceJob } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — VisionServe" },
      {
        name: "description",
        content: "Real-time overview of inference traffic, latency, model deployments, and quota usage across your VisionServe workspace.",
      },
      { property: "og:title", content: "Dashboard — VisionServe" },
      {
        property: "og:description",
        content: "Real-time overview of inference traffic, latency, model deployments, and quota usage across your VisionServe workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(overviewQueryOptions());
    void context.queryClient.ensureQueryData(requestVolumeQueryOptions("24h"));
    void context.queryClient.ensureQueryData(latencyQueryOptions());
    void context.queryClient.ensureQueryData(jobsQueryOptions());
    void context.queryClient.ensureQueryData(deploymentsQueryOptions());
    void context.queryClient.ensureQueryData(quotasQueryOptions());
    void context.queryClient.ensureQueryData(systemHealthQueryOptions());
  },
  component: DashboardPage,
});

const recentJobColumns: ColumnDef<InferenceJob, unknown>[] = [
  {
    accessorKey: "id",
    header: "Job ID",
    cell: ({ row }) => <IdChip value={row.original.id} head={10} tail={4} copyable={false} />,
  },
  {
    accessorKey: "operation",
    header: "Operation",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.operation}</span>,
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
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "latency",
    header: "Latency",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-tnum">{formatMs(row.original.timing?.totalMs)}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">{formatRelative(row.original.createdAt)}</span>
    ),
  },
];

function DashboardPage() {
  const navigate = useNavigate();
  const [volumeRange, setVolumeRange] = useState<"1h" | "24h" | "7d" | "30d">("24h");

  const { data: overview } = useSuspenseQuery(overviewQueryOptions());
  const { data: volume } = useSuspenseQuery(requestVolumeQueryOptions(volumeRange));
  const { data: latency } = useSuspenseQuery(latencyQueryOptions());
  const { data: jobs } = useSuspenseQuery(jobsQueryOptions());
  const { data: deployments } = useSuspenseQuery(deploymentsQueryOptions());
  const { data: quotas } = useSuspenseQuery(quotasQueryOptions());
  const { data: health } = useQuery(systemHealthQueryOptions());

  const degraded = health?.components.filter((c) => c.status !== "operational") ?? [];
  const openIncidents = health?.incidents.filter((i) => i.status !== "resolved") ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Overview"
        description="Inference traffic, latency, and platform health across all environments."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/system-health">
                <HeartPulse className="size-3.5" aria-hidden />
                Status
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/playground">
                Open playground
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Requests today" value={formatCompact(overview.totalRequests)} delta={overview.totalRequestsDelta} icon={Zap} hint="vs yesterday" />
        <MetricCard label="Success rate" value={formatPercent(overview.successRate)} delta={overview.successRateDelta} icon={Activity} hint="24h rolling" />
        <MetricCard label="Avg latency" value={formatMs(overview.avgLatencyMs)} delta={overview.avgLatencyDelta} deltaInvert icon={Timer} hint="end-to-end" />
        <MetricCard label="P95 latency" value={formatMs(overview.p95LatencyMs)} delta={overview.p95Delta} deltaInvert icon={Gauge} hint="SLO 75 ms" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Request volume"
          description="Succeeded vs failed requests"
          actions={
            <ToggleGroup
              type="single"
              size="sm"
              value={volumeRange}
              onValueChange={(v) => v && setVolumeRange(v as typeof volumeRange)}
              aria-label="Time range"
            >
              {(["1h", "24h", "7d", "30d"] as const).map((r) => (
                <ToggleGroupItem key={r} value={r} className="px-2 font-mono text-[11px]">
                  {r}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          }
        >
          <AreaTrend
            data={volume}
            series={[
              { key: "succeeded", label: "Succeeded" },
              { key: "failed", label: "Failed", color: "var(--chart-4)" },
            ]}
            yFormatter={(v) => formatCompact(v)}
          />
        </ChartCard>
        <ChartCard title="Latency percentiles" description="End-to-end inference latency, last 48 hours">
          <LineTrend
            data={latency}
            series={[
              { key: "p50", label: "p50" },
              { key: "avg", label: "avg", color: "var(--chart-3)" },
              { key: "p95", label: "p95", color: "var(--chart-4)" },
              { key: "p99", label: "p99", color: "var(--chart-5)" },
            ]}
            yFormatter={(v) => `${v.toFixed(0)} ms`}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Deployments"
          description={`${deployments.length} active across environments`}
          actions={
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link to="/deployments">View all</Link>
            </Button>
          }
        >
          <ul className="divide-y">
            {deployments.map((d) => (
              <li key={d.id}>
                <Link
                  to="/deployments/$deploymentId"
                  params={{ deploymentId: d.id }}
                  className="flex items-center gap-3 py-2 first:pt-0 last:pb-0 hover:bg-muted/40 rounded-md px-1 -mx-1 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs font-medium">{d.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <EnvBadge env={d.environment} />
                      <span>{d.replicas} replicas</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={d.status} />
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground font-tnum">p95 {formatMs(d.p95Ms)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Quota usage"
          description="Current period consumption"
          actions={
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link to="/usage">Details</Link>
            </Button>
          }
        >
          <div className="space-y-4">
            {quotas.slice(0, 4).map((q) => (
              <QuotaBar key={q.id} quota={q} />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="System status"
          description={degraded.length === 0 ? "All components operational" : `${degraded.length} component(s) need attention`}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StatusBadge status={degraded.length === 0 ? "operational" : "degraded"} label={degraded.length === 0 ? "All systems operational" : "Partial degradation"} />
            </div>
            {degraded.map((c) => (
              <div key={c.id} className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium">{c.name}</p>
                  <StatusBadge status={c.status} />
                </div>
                {c.message && <p className="mt-1 text-[11px] text-muted-foreground">{c.message}</p>}
              </div>
            ))}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{openIncidents.length} open incident{openIncidents.length === 1 ? "" : "s"}</span>
              <Link to="/system-health" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                Status page <ArrowRight className="size-3" aria-hidden />
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>

      <section aria-labelledby="recent-jobs-heading">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="recent-jobs-heading" className="flex items-center gap-2 text-sm font-medium">
            <ListChecks className="size-4 text-muted-foreground" aria-hidden />
            Recent jobs
          </h2>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
            <Link to="/jobs">View all jobs</Link>
          </Button>
        </div>
        <DataTable
          columns={recentJobColumns}
          data={jobs.slice(0, 8)}
          searchable={false}
          pageSize={8}
          getRowId={(j) => j.id}
          onRowClick={(j) => navigate({ to: "/jobs/$jobId", params: { jobId: j.id } })}
          emptyTitle="No jobs yet"
          emptyDescription="Submit your first inference job from the playground or the API."
        />
      </section>
    </div>
  );
}
