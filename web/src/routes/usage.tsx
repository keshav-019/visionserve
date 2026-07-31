import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { QuotaBar } from "@/components/shared/quota-bar";
import { BarTrend, ChartCard } from "@/components/shared/charts";
import { quotasQueryOptions, distributionsQueryOptions } from "@/services/metrics";
import { formatCompact } from "@/lib/format";

export const Route = createFileRoute("/usage")({
  head: () => ({
    meta: [
      { title: "Usage & Quotas — VisionServe" },
      {
        name: "description",
        content:
          "Request quotas, consumption by model and operation, and usage trends for your workspace.",
      },
      { property: "og:title", content: "Usage & Quotas — VisionServe" },
      {
        property: "og:description",
        content: "Quota consumption and usage breakdowns by model and operation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(quotasQueryOptions());
    void context.queryClient.ensureQueryData(distributionsQueryOptions());
  },
  component: UsagePage,
});

function UsagePage() {
  const { data: quotas } = useSuspenseQuery(quotasQueryOptions());
  const { data: distributions } = useSuspenseQuery(distributionsQueryOptions());

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Usage & quotas"
        description="How much of each quota the workspace has consumed in the current period."
      />

      <SectionCard title="Quotas" description="Limits reset per period; totals never reset">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {quotas.map((q) => (
            <QuotaBar key={q.id} quota={q} />
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Requests by model" description="All-time request distribution">
          <BarTrend
            data={distributions.usageByModel}
            xKey="model"
            series={[{ key: "requests", label: "Requests" }]}
            yFormatter={(v) => formatCompact(v)}
          />
        </ChartCard>
        <ChartCard title="Requests by operation" description="All-time operation distribution">
          <BarTrend
            data={distributions.usageByOperation}
            xKey="operation"
            series={[{ key: "requests", label: "Requests", color: "var(--chart-2)" }]}
            yFormatter={(v) => formatCompact(v)}
          />
        </ChartCard>
      </div>
    </div>
  );
}
