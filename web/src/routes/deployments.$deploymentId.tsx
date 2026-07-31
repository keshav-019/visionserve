import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Pause, Rocket, Scale } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EnvBadge } from "@/components/shared/env-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DescriptionList } from "@/components/shared/description-list";
import { MetricCard } from "@/components/shared/metric-card";
import { ChartCard, LineTrend, AreaTrend } from "@/components/shared/charts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { deploymentQueryOptions } from "@/services/models";
import { latencyQueryOptions, queueQueryOptions } from "@/services/metrics";
import { formatDateTime, formatMs, formatPercent } from "@/lib/format";

export const Route = createFileRoute("/deployments/$deploymentId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.deploymentId} — Deployments — VisionServe` },
      { name: "description", content: `Deployment ${params.deploymentId}: replica health, traffic, latency, and scaling controls.` },
      { property: "og:title", content: `${params.deploymentId} — VisionServe` },
      { property: "og:description", content: "Deployment replica health, traffic, and scaling controls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context, params }) => {
    void context.queryClient.ensureQueryData(deploymentQueryOptions(params.deploymentId));
    void context.queryClient.ensureQueryData(latencyQueryOptions());
    void context.queryClient.ensureQueryData(queueQueryOptions());
  },
  component: DeploymentDetailPage,
});

function DeploymentDetailPage() {
  const { deploymentId } = Route.useParams();
  const { data: deployment } = useSuspenseQuery(deploymentQueryOptions(deploymentId));
  const { data: latency } = useSuspenseQuery(latencyQueryOptions());
  const { data: queue } = useSuspenseQuery(queueQueryOptions());
  const [replicas, setReplicas] = useState(deployment?.replicas ?? 1);

  if (!deployment) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <EmptyState
          icon={Rocket}
          title="Deployment not found"
          description={`No deployment with ID "${deploymentId}" exists.`}
          action={{ label: "Back to deployments", href: "/deployments" }}
        />
      </div>
    );
  }

  const dirty = replicas !== deployment.replicas;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 text-muted-foreground">
        <Link to="/deployments">
          <ArrowLeft className="size-3.5" aria-hidden />
          Deployments
        </Link>
      </Button>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono">{deployment.name}</span>
            <StatusBadge status={deployment.status} />
            <EnvBadge env={deployment.environment} />
          </span>
        }
        description={
          <span className="font-mono text-xs">
            {deployment.modelId}@{deployment.version} · {deployment.region} · updated {formatDateTime(deployment.updatedAt)}
          </span>
        }
        actions={
          deployment.status === "paused" ? (
            <Button size="sm" onClick={() => toast.success("Deployment resumed", { description: "Traffic is flowing to replicas again." })}>
              Resume
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.success("Deployment paused", { description: "New requests will queue until resumed." })}
            >
              <Pause className="size-3.5" aria-hidden />
              Pause
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Replicas" value={`${deployment.replicas}`} hint={`max concurrency ${deployment.maxConcurrency}`} />
        <MetricCard label="P95 latency" value={formatMs(deployment.p95Ms)} hint="last hour" />
        <MetricCard label="Error rate" value={formatPercent(deployment.errorRate)} deltaInvert hint="24h rolling" />
        <MetricCard label="Queue depth" value={`${deployment.queueDepth}`} hint="pending requests" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ChartCard title="Latency percentiles" description="Last 48 hours">
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
          <ChartCard title="Queue depth & wait" description="Last 60 minutes">
            <AreaTrend
              data={queue}
              series={[
                { key: "depth", label: "Queue depth" },
                { key: "waitMs", label: "Avg wait (ms)", color: "var(--chart-3)" },
              ]}
            />
          </ChartCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Scaling" description="Adjust replica count for this deployment">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="replicas">Replicas</Label>
                  <span className="font-mono text-xs font-tnum">{replicas}</span>
                </div>
                <Slider id="replicas" min={1} max={16} step={1} value={[replicas]} onValueChange={([v]) => setReplicas(v)} />
                <p className="text-[11px] text-muted-foreground">
                  Each replica handles up to {Math.floor(deployment.maxConcurrency / Math.max(1, deployment.replicas))} concurrent requests.
                </p>
              </div>
              <Button
                size="sm"
                className="w-full"
                disabled={!dirty}
                onClick={() =>
                  toast.success("Scaling started", { description: `Rolling ${deployment.name} from ${deployment.replicas} to ${replicas} replicas.` })
                }
              >
                <Scale className="size-3.5" aria-hidden />
                Apply {replicas} replicas
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Configuration">
            <DescriptionList
              columns={1}
              items={[
                { term: "Model", value: `${deployment.modelId}@${deployment.version}`, mono: true },
                { term: "Execution provider", value: deployment.executionProvider, mono: true },
                { term: "Region", value: deployment.region, mono: true },
                { term: "Traffic share", value: `${deployment.trafficPct}%`, mono: true },
                { term: "Max concurrency", value: `${deployment.maxConcurrency} requests`, mono: true },
                { term: "Last updated", value: formatDateTime(deployment.updatedAt) },
              ]}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
