import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { FlaskConical, Loader2, Play, RotateCcw } from "lucide-react";

import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { UploadZone, type UploadedImage } from "@/components/shared/upload-zone";
import { DetectionOverlay } from "@/components/shared/detection-overlay";
import { TimingBreakdown } from "@/components/shared/timing-breakdown";
import { StatusBadge } from "@/components/shared/status-badge";
import { EnvBadge } from "@/components/shared/env-badge";
import { JsonView } from "@/components/shared/json-view";
import { EmptyState } from "@/components/shared/empty-state";
import { IdChip } from "@/components/shared/copy-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { modelsQueryOptions } from "@/services/models";
import { playgroundSamples, runPlaygroundInference, type PlaygroundSample } from "@/lib/playground";
import { formatMs, formatPercent } from "@/lib/format";
import type { InferenceResult, Model } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/playground")({
  head: () => ({
    meta: [
      { title: "Playground — VisionServe" },
      {
        name: "description",
        content: "Test computer vision models interactively: upload an image, run detection, OCR, or classification, and inspect overlays, timings, and raw JSON.",
      },
      { property: "og:title", content: "Playground — VisionServe" },
      { property: "og:description", content: "Upload an image and test detection, OCR, and classification models interactively." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(modelsQueryOptions());
  },
  component: PlaygroundPage,
});

const STAGES = ["Queued", "Preprocessing", "Running inference", "Postprocessing"];

function SampleGallery({ onPick }: { onPick: (s: PlaygroundSample) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Or try a sample</p>
      <div className="flex flex-wrap gap-2">
        {playgroundSamples.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onPick(s)}
            className="group relative size-14 overflow-hidden rounded-md border transition-all hover:border-primary hover:ring-2 hover:ring-ring/40"
            title={`${s.name} — best for ${s.bestFor}`}
            aria-label={`Use sample ${s.name}`}
          >
            <img src={s.src} alt={s.name} className="size-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}

function PredictionsList({ result }: { result: InferenceResult }) {
  const preds = [...(result.predictions ?? [])].sort((a, b) => b.confidence - a.confidence);
  return (
    <ul className="space-y-2">
      {preds.map((p, i) => (
        <li key={p.label} className="space-y-1">
          <div className="flex items-baseline justify-between text-xs">
            <span className={cn("font-medium", i === 0 && "text-primary")}>{p.label}</span>
            <span className="font-mono font-tnum text-muted-foreground">{formatPercent(p.confidence * 100, 1)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", i === 0 ? "bg-primary" : "bg-muted-foreground/40")}
              style={{ width: `${p.confidence * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function PlaygroundPage() {
  const { data: modelList } = useSuspenseQuery(modelsQueryOptions());
  const [modelId, setModelId] = useState(modelList[0]?.id ?? "");
  const model: Model | undefined = useMemo(() => modelList.find((m) => m.id === modelId), [modelList, modelId]);

  const [image, setImage] = useState<UploadedImage | null>(null);
  const [sampleKey, setSampleKey] = useState<string | undefined>();
  const [confidence, setConfidence] = useState(0.25);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedBox, setSelectedBox] = useState<number | null>(null);

  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const pickSample = (s: PlaygroundSample) => {
    setImage({ url: s.src, name: s.name, width: s.width, height: s.height, format: "JPEG" });
    setSampleKey(s.key);
    // Snap to the model that fits this sample best, if available
    const best = modelList.find((m) => m.task === s.bestFor);
    if (best) setModelId(best.id);
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    setRunning(false);
    setResult(null);
    setSelectedBox(null);
  };

  const run = () => {
    if (!model || !image || running) return;
    reset();
    setRunning(true);
    STAGES.forEach((_, i) => {
      timers.current.push(setTimeout(() => setStage(i), i * 380));
    });
    timers.current.push(
      setTimeout(() => {
        setResult(runPlaygroundInference(model, image, sampleKey));
        setRunning(false);
      }, STAGES.length * 380 + 350),
    );
  };

  const filteredDetections = result?.detections?.filter((d) => d.confidence >= confidence) ?? [];
  const filteredRegions = result?.ocrRegions?.filter((r) => r.confidence >= confidence) ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Playground"
        description="Run a model against any image and inspect detections, timings, and the raw response."
      />

      <div className="grid gap-4 xl:grid-cols-5">
        {/* Configuration */}
        <div className="space-y-4 xl:col-span-2">
          <SectionCard title="Input" description="Image to run inference on">
            <div className="space-y-3">
              <UploadZone
                value={image}
                onChange={(img) => {
                  setImage(img);
                  if (!img) setSampleKey(undefined);
                  else if (img.file) setSampleKey(undefined);
                }}
                compact
              />
              <SampleGallery onPick={pickSample} />
            </div>
          </SectionCard>

          <SectionCard title="Model" description="Model and version to execute">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pg-model">Model</Label>
                <Select value={modelId} onValueChange={setModelId}>
                  <SelectTrigger id="pg-model" className="font-mono text-xs">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelList.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="font-mono text-xs">
                        {m.name}@{m.activeVersion} · {m.task}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {model && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs">
                  <StatusBadge status={model.status} />
                  <span className="font-mono">{model.task}</span>
                  <EnvBadge env={model.environment} />
                  <span className="ml-auto font-mono text-muted-foreground font-tnum">~{formatMs(model.avgLatencyMs)}</span>
                </div>
              )}
              {model && (model.status === "inactive" || model.status === "failed") && (
                <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                  This model is not serving in {model.environment}. Inference may fail or be queued until it becomes healthy.
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Options">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pg-conf">Confidence threshold</Label>
                  <span className="font-mono text-xs font-tnum">{confidence.toFixed(2)}</span>
                </div>
                <Slider
                  id="pg-conf"
                  min={0.05}
                  max={0.95}
                  step={0.05}
                  value={[confidence]}
                  onValueChange={([v]) => setConfidence(v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="pg-boxes">Show bounding boxes</Label>
                <Switch id="pg-boxes" checked={showBoxes} onCheckedChange={setShowBoxes} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="pg-labels">Show labels</Label>
                <Switch id="pg-labels" checked={showLabels} onCheckedChange={setShowLabels} />
              </div>
            </div>
          </SectionCard>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={run} disabled={!model || !image || running}>
              {running ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Play className="size-4" aria-hidden />}
              {running ? "Running…" : "Run inference"}
            </Button>
            <Button variant="outline" onClick={reset} disabled={running && stage < 1} aria-label="Reset playground">
              <RotateCcw className="size-4" aria-hidden />
            </Button>
          </div>
        </div>

        {/* Output */}
        <div className="xl:col-span-3">
          {running && (
            <SectionCard title="Running inference">
              <ol className="space-y-3 py-2">
                {STAGES.map((label, i) => (
                  <li key={label} className="flex items-center gap-3 text-sm">
                    {i < stage ? (
                      <span className="flex size-5 items-center justify-center rounded-full bg-success/15 text-success text-[10px] font-bold">✓</span>
                    ) : i === stage ? (
                      <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
                    ) : (
                      <span className="size-5 rounded-full border" aria-hidden />
                    )}
                    <span className={cn(i > stage && "text-muted-foreground")}>{label}</span>
                  </li>
                ))}
              </ol>
            </SectionCard>
          )}

          {!running && !result && (
            <div className="flex h-full min-h-96 items-center justify-center rounded-lg border border-dashed">
              <EmptyState
                icon={FlaskConical}
                title="No result yet"
                description="Pick a sample or upload an image, choose a model, then run inference to see the annotated output here."
              />
            </div>
          )}

          {!running && result && (
            <Tabs defaultValue="visual" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <TabsList>
                  <TabsTrigger value="visual">Visual</TabsTrigger>
                  <TabsTrigger value="timing">Timing</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <IdChip value={result.requestId} head={12} tail={4} />
                  <span className="font-mono font-tnum">{formatMs(result.timing.totalMs)}</span>
                </div>
              </div>

              <TabsContent value="visual" className="space-y-4">
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
                  alt="Inference input with annotations"
                />

                {result.detections && (
                  <SectionCard
                    title={`Detections (${filteredDetections.length})`}
                    description={`Threshold ${confidence.toFixed(2)} · sorted by confidence`}
                  >
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Label</TableHead>
                            <TableHead className="text-xs">Confidence</TableHead>
                            <TableHead className="text-xs">Box (x, y, w, h)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDetections.map((d, i) => (
                            <TableRow
                              key={i}
                              className={cn("cursor-pointer", selectedBox === i && "bg-accent/50")}
                              onClick={() => setSelectedBox(selectedBox === i ? null : i)}
                            >
                              <TableCell className="py-1.5 text-sm font-medium">{d.label}</TableCell>
                              <TableCell className="py-1.5 font-mono text-xs font-tnum">{formatPercent(d.confidence * 100, 1)}</TableCell>
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
                  <SectionCard title="Extracted text" description={`${filteredRegions.length} regions above threshold`}>
                    <pre className="rounded-md border bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap">{result.ocrText}</pre>
                  </SectionCard>
                )}

                {result.predictions && (
                  <SectionCard title="Top predictions">
                    <PredictionsList result={result} />
                  </SectionCard>
                )}
              </TabsContent>

              <TabsContent value="timing">
                <SectionCard title="Pipeline timing" description="Where the request spent its time">
                  <TimingBreakdown timing={result.timing} />
                </SectionCard>
              </TabsContent>

              <TabsContent value="json">
                <JsonView data={{ ...result, inputImage: "<image-binary>" }} title={`${result.id}.json`} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
