import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Images } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EnvBadge } from "@/components/shared/env-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DetectionOverlay } from "@/components/shared/detection-overlay";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { resultsQueryOptions, type ResultFilters } from "@/services/results";
import { modelsQueryOptions } from "@/services/models";
import { formatMs, formatRelative } from "@/lib/format";
import type { Operation } from "@/lib/types";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Results — VisionServe" },
      {
        name: "description",
        content:
          "Browse persisted inference results: annotated images, OCR text, classifications, and pipeline timings.",
      },
      { property: "og:title", content: "Results — VisionServe" },
      {
        property: "og:description",
        content: "Browse persisted inference results with annotated overlays.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(resultsQueryOptions());
    void context.queryClient.ensureQueryData(modelsQueryOptions());
  },
  component: ResultsPage,
});

function ResultsPage() {
  const [filters, setFilters] = useState<ResultFilters>({});
  const { data: resultList, isLoading } = useSuspenseQuery(resultsQueryOptions(filters));
  const { data: modelList } = useSuspenseQuery(modelsQueryOptions());

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Results"
        description="Persisted inference output. Originals and annotated images are retained per your retention policy."
        actions={
          <>
            <Select
              value={filters.operation ?? "all"}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, operation: v as Operation | "all" }))
              }
            >
              <SelectTrigger className="w-32 font-mono text-xs" aria-label="Filter by operation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["all", "detect", "ocr", "classify", "segment"].map((o) => (
                  <SelectItem key={o} value={o} className="font-mono text-xs">
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.modelId ?? "all"}
              onValueChange={(v) => setFilters((f) => ({ ...f, modelId: v }))}
            >
              <SelectTrigger className="w-40 font-mono text-xs" aria-label="Filter by model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-mono text-xs">
                  all models
                </SelectItem>
                {modelList.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="font-mono text-xs">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : resultList.length === 0 ? (
        <EmptyState
          icon={Images}
          title="No results found"
          description="Results appear after jobs succeed. Try the playground to generate one now."
          action={{ label: "Open playground", href: "/playground" }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resultList.map((r) => (
            <Link key={r.id} to="/results/$resultId" params={{ resultId: r.id }} className="group">
              <Card className="overflow-hidden transition-colors group-hover:border-primary/40">
                <div className="p-2 pb-0">
                  <DetectionOverlay
                    src={r.inputImage}
                    imageWidth={r.inputWidth}
                    imageHeight={r.inputHeight}
                    detections={r.detections}
                    ocrRegions={r.ocrRegions}
                    alt={`Result ${r.id}`}
                  />
                </div>
                <CardContent className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-xs font-medium group-hover:text-primary">
                      {r.id}
                    </span>
                    <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                      {r.operation}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-mono">
                      {r.modelId}@{r.modelVersion}
                    </span>
                    <EnvBadge env={r.environment} />
                  </div>
                  <div className="flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
                    <span>{formatRelative(r.createdAt)}</span>
                    <span className="font-mono font-tnum">{formatMs(r.timing.totalMs)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <StatusBadge status="succeeded" />
                    {r.detections && (
                      <span className="text-muted-foreground">
                        {r.detections.length} detections
                      </span>
                    )}
                    {r.ocrRegions && (
                      <span className="text-muted-foreground">
                        {r.ocrRegions.length} text regions
                      </span>
                    )}
                    {r.predictions && (
                      <span className="text-muted-foreground">
                        top-1: {r.predictions[0]?.label}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
