import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { BarTrend, ChartCard } from "@/components/shared/charts";
import { benchmarksQueryOptions } from "@/services/metrics";
import { formatCompact, formatMs, formatNumber, formatRelative } from "@/lib/format";
import type { Benchmark } from "@/lib/types";

export const Route = createFileRoute("/benchmarks")({
  head: () => ({
    meta: [
      { title: "Benchmarks — VisionServe" },
      { name: "description", content: "Hardware and concurrency benchmarks for registered models: throughput, P95 latency, and peak memory." },
      { property: "og:title", content: "Benchmarks — VisionServe" },
      { property: "og:description", content: "Throughput, latency, and memory benchmarks for registered models." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(benchmarksQueryOptions());
  },
  component: BenchmarksPage,
});

const columns: ColumnDef<Benchmark, unknown>[] = [
  { accessorKey: "modelId", header: "Model", cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.modelId}</span> },
  { accessorKey: "hardwareProfile", header: "Hardware", cell: ({ row }) => <span className="font-mono text-xs">{row.original.hardwareProfile}</span> },
  { accessorKey: "imageSize", header: "Input", cell: ({ row }) => <span className="font-mono text-xs">{row.original.imageSize}</span> },
  { accessorKey: "concurrency", header: "Concurrency", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{row.original.concurrency}</span> },
  { accessorKey: "requests", header: "Requests", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{formatNumber(row.original.requests)}</span> },
  { accessorKey: "throughputRps", header: "Throughput", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{row.original.throughputRps.toFixed(1)} rps</span> },
  { accessorKey: "p95Ms", header: "P95", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{formatMs(row.original.p95Ms)}</span> },
  { accessorKey: "peakMemoryMb", header: "Peak memory", cell: ({ row }) => <span className="font-mono text-xs font-tnum">{formatCompact(row.original.peakMemoryMb)} MB</span> },
  { accessorKey: "createdAt", header: "Run", cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatRelative(row.original.createdAt)}</span> },
  { accessorKey: "notes", header: "Notes", cell: ({ row }) => <span className="max-w-48 truncate text-xs text-muted-foreground">{row.original.notes ?? "—"}</span> },
];

function BenchmarksPage() {
  const { data: benchmarks, isLoading } = useSuspenseQuery(benchmarksQueryOptions());
  const chartData = benchmarks.map((b) => ({ name: `${b.modelId} · c${b.concurrency}`, throughput: b.throughputRps }));

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Benchmarks"
        description="Load-test runs that establish throughput and latency baselines per hardware profile."
      />
      <ChartCard title="Throughput by run" description="Requests per second sustained during each benchmark">
        <BarTrend data={chartData} xKey="name" series={[{ key: "throughput", label: "Throughput (rps)" }]} layout="vertical" height={Math.max(220, benchmarks.length * 52)} />
      </ChartCard>
      <DataTable
        columns={columns}
        data={benchmarks}
        isLoading={isLoading}
        searchPlaceholder="Search benchmarks…"
        getRowId={(b) => b.id}
        emptyTitle="No benchmarks yet"
        emptyDescription="Run a load test from the CLI to record a baseline."
      />
    </div>
  );
}
