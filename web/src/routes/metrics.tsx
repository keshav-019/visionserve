import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";
import { AreaTrend, BarTrend, ChartCard, LineTrend } from "@/components/shared/charts";
import {
  overviewQueryOptions,
  latencyQueryOptions,
  throughputQueryOptions,
  queueQueryOptions,
  workerUtilQueryOptions,
  batchSizeQueryOptions,
  distributionsQueryOptions,
} from "@/services/metrics";
import { formatCompact, formatMs, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/metrics")({
  head: () => ({
    meta: [
      { title: "Metrics — VisionServe" },
      {
        name: "description",
        content:
          "Platform observability: throughput, latency percentiles, queue depth, worker utilization, and error distributions.",
      },
      { property: "og:title", content: "Metrics — VisionServe" },
      {
        property: "og:description",
        content: "Throughput, latency, queue depth, and error distributions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(overviewQueryOptions());
    void context.queryClient.ensureQueryData(latencyQueryOptions());
    void context.queryClient.ensureQueryData(throughputQueryOptions());
    void context.queryClient.ensureQueryData(queueQueryOptions());
    void context.queryClient.ensureQueryData(workerUtilQueryOptions());
    void context.queryClient.ensureQueryData(batchSizeQueryOptions());
    void context.queryClient.ensureQueryData(distributionsQueryOptions());
  },
  component: MetricsPage,
});

function MetricsPage() {
  const { data: overview } = useSuspenseQuery(overviewQueryOptions());
  const { data: latency } = useSuspenseQuery(latencyQueryOptions());
  const { data: throughput } = useSuspenseQuery(throughputQueryOptions());
  const { data: queue } = useSuspenseQuery(queueQueryOptions());
  const { data: workers } = useSuspenseQuery(workerUtilQueryOptions());
  const { data: batchSize } = useSuspenseQuery(batchSizeQueryOptions());
  const { data: distributions } = useSuspenseQuery(distributionsQueryOptions());

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Metrics"
        description="Live platform telemetry across all environments, refreshed every 30 seconds."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Requests (24h)"
          value={formatCompact(overview.totalRequests)}
          delta={overview.totalRequestsDelta}
        />
        <MetricCard
          label="Success rate"
          value={formatPercent(overview.successRate)}
          delta={overview.successRateDelta}
        />
        <MetricCard
          label="Avg latency"
          value={formatMs(overview.avgLatencyMs)}
          delta={overview.avgLatencyDelta}
          deltaInvert
        />
        <MetricCard
          label="P95 latency"
          value={formatMs(overview.p95LatencyMs)}
          delta={overview.p95Delta}
          deltaInvert
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Throughput" description="Requests per second, last 60 minutes">
          <AreaTrend
            data={throughput}
            series={[{ key: "rps", label: "Requests/s" }]}
            yFormatter={(v) => `${v.toFixed(0)} rps`}
          />
        </ChartCard>
        <ChartCard title="Latency percentiles" description="Last 48 hours">
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
        <ChartCard title="Queue depth" description="Pending jobs and average wait, last 60 minutes">
          <AreaTrend
            data={queue}
            series={[
              { key: "depth", label: "Depth" },
              { key: "waitMs", label: "Avg wait (ms)", color: "var(--chart-3)" },
            ]}
          />
        </ChartCard>
        <ChartCard title="Worker utilization" description="CPU, memory, and active workers">
          <LineTrend
            data={workers}
            series={[
              { key: "cpu", label: "CPU %" },
              { key: "memory", label: "Memory %", color: "var(--chart-3)" },
              { key: "workers", label: "Workers", color: "var(--chart-4)" },
            ]}
            yFormatter={(v) => v.toFixed(0)}
          />
        </ChartCard>
        <ChartCard
          title="Dynamic batching"
          description="Average fused batch size and requests saved"
        >
          <AreaTrend
            data={batchSize}
            series={[
              { key: "avgBatch", label: "Avg batch size" },
              { key: "saved", label: "Requests saved", color: "var(--chart-3)" },
            ]}
          />
        </ChartCard>
        <ChartCard title="Errors by code" description="Last 7 days">
          <BarTrend
            data={distributions.errorsByCode}
            xKey="code"
            layout="vertical"
            series={[{ key: "count", label: "Errors", color: "var(--destructive)" }]}
            height={Math.max(220, distributions.errorsByCode.length * 40)}
          />
        </ChartCard>
        <ChartCard title="Detection confidence" description="Distribution of detection confidences">
          <BarTrend
            data={distributions.confidenceHistogram}
            xKey="bucket"
            series={[{ key: "detections", label: "Detections" }]}
            yFormatter={(v) => formatCompact(v)}
          />
        </ChartCard>
        <ChartCard title="Detections per image" description="How many boxes a typical image yields">
          <BarTrend
            data={distributions.detectionCountHistogram}
            xKey="bucket"
            series={[{ key: "images", label: "Images", color: "var(--chart-2)" }]}
            yFormatter={(v) => formatCompact(v)}
          />
        </ChartCard>
      </div>
    </div>
  );
}
