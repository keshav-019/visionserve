import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ListChecks, RotateCw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, SectionCard } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EnvBadge } from "@/components/shared/env-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DescriptionList } from "@/components/shared/description-list";
import { IdChip } from "@/components/shared/copy-button";
import { TimingBreakdown } from "@/components/shared/timing-breakdown";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { JsonView } from "@/components/shared/json-view";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { resultsQueryOptions } from "@/services/results";
import { jobEventsQueryOptions, jobQueryOptions } from "@/services/jobs";
import { formatBytes, formatDateTime, formatMs, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/jobs/$jobId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.jobId} — Jobs — VisionServe` },
      {
        name: "description",
        content: `Inference job ${params.jobId}: status, events, timing breakdown, and result.`,
      },
      { property: "og:title", content: `${params.jobId} — VisionServe` },
      {
        property: "og:description",
        content: "Inference job status, events, and timing breakdown.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context, params }) => {
    void context.queryClient.ensureQueryData(jobQueryOptions(params.jobId));
    void context.queryClient.ensureQueryData(resultsQueryOptions());
  },
  component: JobDetailPage,
});

function JobDetailPage() {
  const { jobId } = Route.useParams();
  const navigate = useNavigate();
  const { data: job } = useSuspenseQuery(jobQueryOptions(jobId));
  const { data: allResults } = useSuspenseQuery(resultsQueryOptions());
  const { data: events } = useSuspenseQuery(
    job ? jobEventsQueryOptions(job) : { queryKey: ["noop"], queryFn: () => Promise.resolve([]) },
  );

  if (!job) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <EmptyState
          icon={ListChecks}
          title="Job not found"
          description={`No job with ID "${jobId}" exists, or it has been purged by the retention policy.`}
          action={{ label: "Back to jobs", href: "/jobs" }}
        />
      </div>
    );
  }

  const result = allResults.find((r) => r.jobId === job.id);
  const cancellable = job.status === "queued" || job.status === "running";

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 text-muted-foreground">
        <Link to="/jobs">
          <ArrowLeft className="size-3.5" aria-hidden />
          Jobs
        </Link>
      </Button>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <IdChip value={job.id} head={16} tail={8} />
            <StatusBadge status={job.status} />
            <EnvBadge env={job.environment} />
          </span>
        }
        description={
          <span className="font-mono text-xs">
            {job.operation} on {job.modelId}@{job.modelVersion} · submitted{" "}
            {formatRelative(job.createdAt)}
          </span>
        }
        actions={
          <>
            {cancellable && (
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="outline">
                    <XCircle className="size-3.5" aria-hidden />
                    Cancel job
                  </Button>
                }
                title="Cancel this job?"
                description="The worker will stop processing at the next checkpoint. Already-computed partial results are discarded."
                confirmLabel="Cancel job"
                onConfirm={() =>
                  toast.success("Job cancelled", {
                    description: `${job.id} was removed from the worker.`,
                  })
                }
              />
            )}
            {job.status === "failed" && (
              <Button
                size="sm"
                onClick={() =>
                  toast.success("Job re-queued", {
                    description: "A new job was created with the same input.",
                  })
                }
              >
                <RotateCw className="size-3.5" aria-hidden />
                Retry
              </Button>
            )}
            {result && (
              <Button asChild size="sm" variant="outline">
                <Link to="/results/$resultId" params={{ resultId: result.id }}>
                  View result
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </Button>
            )}
          </>
        }
      />

      {(job.status === "running" || job.status === "queued") && (
        <div className="rounded-lg border bg-card px-4 py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">
              {job.status === "queued" ? "Waiting for a worker…" : "Processing…"}
            </span>
            <span className="font-mono font-tnum text-muted-foreground">{job.progress}%</span>
          </div>
          <Progress value={job.progress} className="mt-2 h-1.5" />
        </div>
      )}

      {job.errorCode && (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
          role="alert"
        >
          <p className="font-mono text-xs font-semibold text-destructive">{job.errorCode}</p>
          <p className="mt-1 text-sm text-muted-foreground">{job.errorMessage}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Details">
            <DescriptionList
              columns={3}
              items={[
                { term: "Job ID", value: <IdChip value={job.id} head={12} tail={6} /> },
                { term: "Request ID", value: <IdChip value={job.requestId} head={12} tail={4} /> },
                { term: "Operation", value: job.operation, mono: true },
                { term: "Model", value: `${job.modelId}@${job.modelVersion}`, mono: true },
                { term: "Owner", value: job.owner, mono: true },
                { term: "Environment", value: job.environment, mono: true },
                { term: "Input file", value: job.inputFile, mono: true },
                {
                  term: "Input size",
                  value: job.inputDimensions
                    ? `${formatBytes(job.inputSizeBytes)} · ${job.inputDimensions}`
                    : formatBytes(job.inputSizeBytes),
                  mono: true,
                },
                { term: "Queue wait", value: formatMs(job.queueWaitMs), mono: true },
                { term: "Created", value: formatDateTime(job.createdAt) },
                { term: "Started", value: formatDateTime(job.startedAt) },
                { term: "Completed", value: formatDateTime(job.completedAt) },
                { term: "Result expires", value: formatDateTime(job.expiresAt) },
              ]}
            />
          </SectionCard>

          <SectionCard title="Events" description="Lifecycle log for this job">
            <ol className="relative space-y-4 border-l pl-5">
              {events.map((e, i) => (
                <li key={i} className="relative">
                  <span
                    className={cn(
                      "absolute top-1 -left-[26.5px] size-2.5 rounded-full border-2 border-background",
                      e.level === "error"
                        ? "bg-destructive"
                        : e.level === "warn"
                          ? "bg-warning"
                          : "bg-primary",
                    )}
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {formatDateTime(e.ts)}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase">
                      {e.stage}
                    </span>
                  </div>
                  <p className={cn("mt-0.5 text-sm", e.level === "error" && "text-destructive")}>
                    {e.message}
                  </p>
                </li>
              ))}
            </ol>
          </SectionCard>

          <JsonView data={{ ...job, events }} title={`${job.id}.json`} maxHeight={360} />
        </div>

        <div className="space-y-4">
          {job.timing && (
            <SectionCard title="Timing breakdown" description="End-to-end pipeline timing">
              <TimingBreakdown timing={job.timing} />
            </SectionCard>
          )}
          <SectionCard title="Next steps">
            <div className="flex flex-col gap-2">
              {result ? (
                <Button asChild variant="outline" size="sm" className="justify-start">
                  <Link to="/results/$resultId" params={{ resultId: result.id }}>
                    Open annotated result
                    <ArrowRight className="ml-auto size-3.5" aria-hidden />
                  </Link>
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No persisted result — the job{" "}
                  {job.status === "succeeded" ? "has expired" : "has not produced output yet"}.
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => navigate({ to: "/playground" })}
              >
                Run similar input in playground
                <ArrowRight className="ml-auto size-3.5" aria-hidden />
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
