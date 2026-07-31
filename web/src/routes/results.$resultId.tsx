import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Images, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { EnvBadge } from "@/components/shared/env-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DetectionOverlay } from "@/components/shared/detection-overlay";
import { DescriptionList } from "@/components/shared/description-list";
import { IdChip } from "@/components/shared/copy-button";
import { TimingBreakdown } from "@/components/shared/timing-breakdown";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { JsonView } from "@/components/shared/json-view";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resultQueryOptions } from "@/services/results";
import { formatDateTime, formatMs, formatPercent, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/results/$resultId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.resultId} — Results — VisionServe` },
      {
        name: "description",
        content: `Inference result ${params.resultId}: annotated image, detections, OCR text, and timing.`,
      },
      { property: "og:title", content: `${params.resultId} — VisionServe` },
      {
        property: "og:description",
        content: "Annotated inference result with detections and timing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context, params }) => {
    void context.queryClient.ensureQueryData(resultQueryOptions(params.resultId));
  },
  component: ResultDetailPage,
});

function ResultDetailPage() {
  const { resultId } = Route.useParams();
  const { data: result } = useSuspenseQuery(resultQueryOptions(resultId));
  const [confidence, setConfidence] = useState(0.25);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedBox, setSelectedBox] = useState<number | null>(null);

  if (!result) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <EmptyState
          icon={Images}
          title="Result not found"
          description={`Result "${resultId}" doesn't exist or was removed by the retention cleanup.`}
          action={{ label: "Back to results", href: "/results" }}
        />
      </div>
    );
  }

  const filtered = result.detections?.filter((d) => d.confidence >= confidence) ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 text-muted-foreground">
        <Link to="/results">
          <ArrowLeft className="size-3.5" aria-hidden />
          Results
        </Link>
      </Button>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <IdChip value={result.id} head={14} tail={6} />
            <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              {result.operation}
            </span>
            <EnvBadge env={result.environment} />
          </span>
        }
        description={
          <span className="font-mono text-xs">
            {result.modelId}@{result.modelVersion} · {formatRelative(result.createdAt)} · expires{" "}
            {formatRelative(result.expiresAt)}
          </span>
        }
        actions={
          <>
            {result.jobId && (
              <Button asChild size="sm" variant="outline">
                <Link to="/jobs/$jobId" params={{ jobId: result.jobId }}>
                  Source job
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </Button>
            )}
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="destructive">
                  <Trash2 className="size-3.5" aria-hidden />
                  Delete
                </Button>
              }
              title="Delete this result?"
              description="The result JSON and annotated image are removed from storage immediately. The original upload is kept per retention policy."
              confirmLabel="Delete result"
              onConfirm={() =>
                toast.success("Result deleted", {
                  description: `${result.id} was removed from storage.`,
                })
              }
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <DetectionOverlay
            src={result.inputImage}
            imageWidth={result.inputWidth}
            imageHeight={result.inputHeight}
            detections={result.detections}
            ocrRegions={result.ocrRegions}
            showBoxes={showBoxes}
            showLabels={showLabels}
            minConfidence={confidence}
            selectedBox={selectedBox}
            onSelectBox={setSelectedBox}
            alt={`Annotated input for result ${result.id}`}
          />

          <SectionCard title="Overlay controls">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="res-conf">Confidence ≥</Label>
                  <span className="font-mono text-xs font-tnum">{confidence.toFixed(2)}</span>
                </div>
                <Slider
                  id="res-conf"
                  min={0.05}
                  max={0.95}
                  step={0.05}
                  value={[confidence]}
                  onValueChange={([v]) => setConfidence(v)}
                />
              </div>
              <div className="flex items-center justify-between sm:justify-center sm:gap-3">
                <Label htmlFor="res-boxes">Boxes</Label>
                <Switch id="res-boxes" checked={showBoxes} onCheckedChange={setShowBoxes} />
              </div>
              <div className="flex items-center justify-between sm:justify-center sm:gap-3">
                <Label htmlFor="res-labels">Labels</Label>
                <Switch id="res-labels" checked={showLabels} onCheckedChange={setShowLabels} />
              </div>
            </div>
          </SectionCard>

          {result.detections && (
            <SectionCard title={`Detections (${filtered.length})`}>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Label</TableHead>
                      <TableHead className="text-xs">Class</TableHead>
                      <TableHead className="text-xs">Confidence</TableHead>
                      <TableHead className="text-xs">Box (x, y, w, h)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((d, i) => (
                      <TableRow
                        key={i}
                        className={cn("cursor-pointer", selectedBox === i && "bg-accent/50")}
                        onClick={() => setSelectedBox(selectedBox === i ? null : i)}
                      >
                        <TableCell className="py-1.5 text-sm font-medium">{d.label}</TableCell>
                        <TableCell className="py-1.5 font-mono text-xs text-muted-foreground">
                          {d.classId}
                        </TableCell>
                        <TableCell className="py-1.5 font-mono text-xs font-tnum">
                          {formatPercent(d.confidence * 100, 1)}
                        </TableCell>
                        <TableCell className="py-1.5 font-mono text-xs text-muted-foreground">
                          {d.box.x}, {d.box.y}, {d.box.width}, {d.box.height}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          )}

          {result.ocrText && (
            <SectionCard title="Extracted text">
              <pre className="rounded-md border bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap">
                {result.ocrText}
              </pre>
            </SectionCard>
          )}

          {result.predictions && (
            <SectionCard title="Predictions">
              <ul className="space-y-2">
                {[...result.predictions]
                  .sort((a, b) => b.confidence - a.confidence)
                  .map((p, i) => (
                    <li key={p.label} className="space-y-1">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className={cn("font-medium", i === 0 && "text-primary")}>
                          {p.label}
                        </span>
                        <span className="font-mono font-tnum text-muted-foreground">
                          {formatPercent(p.confidence * 100, 1)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            i === 0 ? "bg-primary" : "bg-muted-foreground/40",
                          )}
                          style={{ width: `${p.confidence * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            </SectionCard>
          )}

          <Tabs defaultValue="json">
            <TabsList>
              <TabsTrigger value="json">Raw JSON</TabsTrigger>
              <TabsTrigger value="meta">Metadata</TabsTrigger>
            </TabsList>
            <TabsContent value="json" className="pt-3">
              <JsonView
                data={{ ...result, inputImage: "<image-binary>" }}
                title={`${result.id}.json`}
              />
            </TabsContent>
            <TabsContent value="meta" className="pt-3">
              <SectionCard>
                <DescriptionList
                  items={[
                    { term: "Result ID", value: <IdChip value={result.id} head={14} tail={6} /> },
                    {
                      term: "Request ID",
                      value: <IdChip value={result.requestId} head={14} tail={4} />,
                    },
                    { term: "Job", value: result.jobId ?? "—", mono: true },
                    { term: "Batch", value: result.batchId ?? "—", mono: true },
                    {
                      term: "Model",
                      value: `${result.modelId}@${result.modelVersion}`,
                      mono: true,
                    },
                    { term: "Owner", value: result.owner, mono: true },
                    {
                      term: "Input dimensions",
                      value: `${result.inputWidth} × ${result.inputHeight}`,
                      mono: true,
                    },
                    { term: "Created", value: formatDateTime(result.createdAt) },
                    { term: "Expires", value: formatDateTime(result.expiresAt) },
                  ]}
                />
              </SectionCard>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <SectionCard title="Timing" description={`Total ${formatMs(result.timing.totalMs)}`}>
            <TimingBreakdown timing={result.timing} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
