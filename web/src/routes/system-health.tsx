import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";

import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DescriptionList } from "@/components/shared/description-list";
import { EmptyState } from "@/components/shared/empty-state";
import { systemHealthQueryOptions } from "@/services/misc";
import { formatDateTime, formatMs, formatPercent, formatRelative } from "@/lib/format";

export const Route = createFileRoute("/system-health")({
  head: () => ({
    meta: [
      { title: "System Health — VisionServe" },
      {
        name: "description",
        content:
          "Component status, uptime, incident history, and build information for the VisionServe platform.",
      },
      { property: "og:title", content: "System Health — VisionServe" },
      { property: "og:description", content: "Component status, uptime, and incident history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(systemHealthQueryOptions());
  },
  component: HealthPage,
});

function HealthPage() {
  const { data } = useSuspenseQuery(systemHealthQueryOptions());
  const { components, incidents, build } = data;
  const allOperational = components.every((c) => c.status === "operational");
  const activeIncidents = incidents.filter((i) => i.status !== "resolved");

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="System health"
        description="Live component status, recent incidents, and the exact build serving this workspace."
        actions={
          <StatusBadge
            status={
              activeIncidents.length > 0 ? "degraded" : allOperational ? "operational" : "degraded"
            }
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard
            title="Components"
            description={`${components.length} subsystems checked continuously`}
          >
            <ul className="divide-y">
              {components.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{c.name}</p>
                    {c.message && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden text-right sm:block">
                      <p className="font-mono text-xs font-tnum">{formatMs(c.responseMs)}</p>
                      <p className="text-[10px] text-muted-foreground">response</p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="font-mono text-xs font-tnum">{formatPercent(c.uptimePct)}</p>
                      <p className="text-[10px] text-muted-foreground">90d uptime</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Incidents" description="Most recent first">
            {incidents.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No incidents"
                description="All systems have been quiet."
              />
            ) : (
              <ul className="space-y-4">
                {incidents.map((inc) => (
                  <li key={inc.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{inc.title}</p>
                      <StatusBadge
                        status={inc.status === "resolved" ? "succeeded" : "degraded"}
                        label={inc.status}
                      />
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {formatDateTime(inc.startedAt)} · impact: {inc.impact}
                      {inc.resolvedAt ? ` · resolved ${formatRelative(inc.resolvedAt)}` : ""}
                    </p>
                    <ol className="mt-3 space-y-2 border-l pl-3">
                      {inc.updates.map((u, i) => (
                        <li key={i} className="relative text-xs">
                          <span
                            className="absolute -left-[15px] top-1 size-1.5 rounded-full bg-muted-foreground/50"
                            aria-hidden
                          />
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {formatRelative(u.ts)}
                          </span>
                          <p className="text-muted-foreground">{u.message}</p>
                        </li>
                      ))}
                    </ol>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div>
          <SectionCard title="Build information" description="Binary currently serving requests">
            <DescriptionList
              columns={1}
              items={[
                { term: "Version", value: build.version, mono: true },
                { term: "Commit", value: build.commit, mono: true },
                { term: "Built", value: build.buildDate, mono: true },
                { term: "ONNX Runtime", value: build.onnxRuntime, mono: true },
                { term: "OpenCV", value: build.opencv, mono: true },
                { term: "Compiler", value: build.compiler, mono: true },
              ]}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
