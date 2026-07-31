import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Boxes, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EnvBadge } from "@/components/shared/env-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { modelsQueryOptions, type ModelFilters } from "@/services/models";
import { formatBytes, formatCompact, formatMs, formatPercent, formatRelative } from "@/lib/format";
import type { ModelStatus, Operation } from "@/lib/types";

export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Model Registry — VisionServe" },
      {
        name: "description",
        content:
          "Browse registered computer vision models, versions, runtimes, and health status in the VisionServe model registry.",
      },
      { property: "og:title", content: "Model Registry — VisionServe" },
      {
        property: "og:description",
        content: "Browse registered computer vision models, versions, and health status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(modelsQueryOptions());
  },
  component: ModelsPage,
});

function LoadModelDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [task, setTask] = useState<Operation>("detect");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" aria-hidden />
          Load model
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Load a model</DialogTitle>
          <DialogDescription>
            Register an ONNX model artifact. The scheduler will pull it onto workers and run a
            warm-up pass.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="lm-name">Model name</Label>
            <Input
              id="lm-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-detector-v2"
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lm-task">Task</Label>
            <Select value={task} onValueChange={(v) => setTask(v as Operation)}>
              <SelectTrigger id="lm-task" className="font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["detect", "ocr", "classify", "segment"].map((t) => (
                  <SelectItem key={t} value={t} className="font-mono text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lm-file">Artifact</Label>
            <Input id="lm-file" type="file" accept=".onnx" className="text-xs" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              setOpen(false);
              setName("");
              toast.success("Model load started", {
                description: "The scheduler is pulling the artifact. Track progress in Audit Log.",
              });
            }}
          >
            Start loading
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModelsPage() {
  const [filters, setFilters] = useState<ModelFilters>({});
  const { data: modelList, isLoading } = useSuspenseQuery(modelsQueryOptions(filters));
  const all = useSuspenseQuery(modelsQueryOptions()).data;

  const counts = useMemo(() => {
    const healthy = all.filter((m) => m.status === "healthy").length;
    return { total: all.length, healthy };
  }, [all]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Model registry"
        description={`${counts.total} registered models · ${counts.healthy} healthy`}
        actions={<LoadModelDialog />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search
            className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder="Search models…"
            className="pl-8"
            value={filters.search ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
            aria-label="Search models"
          />
        </div>
        <Select
          value={filters.task ?? "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, task: v as Operation | "all" }))}
        >
          <SelectTrigger className="w-36 font-mono text-xs" aria-label="Filter by task">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["all", "detect", "ocr", "classify", "segment", "resize", "grayscale", "metadata"].map(
              (t) => (
                <SelectItem key={t} value={t} className="font-mono text-xs">
                  {t}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) => setFilters((f) => ({ ...f, status: v as ModelStatus | "all" }))}
        >
          <SelectTrigger className="w-36 font-mono text-xs" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["all", "healthy", "warming", "loading", "degraded", "inactive", "failed"].map((s) => (
              <SelectItem key={s} value={s} className="font-mono text-xs">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : modelList.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No models match"
          description="Adjust the filters, or load a new ONNX model into the registry."
          secondaryHref="/api-reference"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modelList.map((m) => (
            <Link key={m.id} to="/models/$modelId" params={{ modelId: m.id }} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 px-4 pt-4 pb-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold group-hover:text-primary">
                      {m.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      v{m.activeVersion} · {m.runtime}
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  <p className="line-clamp-2 min-h-8 text-xs text-muted-foreground">
                    {m.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                      {m.task}
                    </span>
                    <EnvBadge env={m.environment} />
                    <span className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                      {formatBytes(m.sizeBytes)}
                    </span>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
                    <div>
                      <dt className="text-[10px] text-muted-foreground uppercase">Requests</dt>
                      <dd className="font-mono text-xs font-medium font-tnum">
                        {formatCompact(m.requests)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-muted-foreground uppercase">Latency</dt>
                      <dd className="font-mono text-xs font-medium font-tnum">
                        {formatMs(m.avgLatencyMs)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-muted-foreground uppercase">Errors</dt>
                      <dd className="font-mono text-xs font-medium font-tnum">
                        {formatPercent(m.errorRate)}
                      </dd>
                    </div>
                  </dl>
                  <p className="text-[11px] text-muted-foreground">
                    Updated {formatRelative(m.updatedAt)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
