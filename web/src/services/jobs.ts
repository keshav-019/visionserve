import { queryOptions } from "@tanstack/react-query";
import { jobs, jobEventsFor } from "@/mocks/data";
import { respond } from "./client";
import type { InferenceJob, JobStatus, Operation } from "@/lib/types";

export interface JobFilters {
  status?: JobStatus | "all";
  operation?: Operation | "all";
  modelId?: string | "all";
  search?: string;
}

export function listJobs(filters: JobFilters = {}) {
  let out = jobs;
  if (filters.status && filters.status !== "all")
    out = out.filter((j) => j.status === filters.status);
  if (filters.operation && filters.operation !== "all")
    out = out.filter((j) => j.operation === filters.operation);
  if (filters.modelId && filters.modelId !== "all")
    out = out.filter((j) => j.modelId === filters.modelId);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    out = out.filter(
      (j) =>
        j.id.toLowerCase().includes(q) ||
        j.requestId.toLowerCase().includes(q) ||
        j.inputFile.toLowerCase().includes(q) ||
        j.modelId.toLowerCase().includes(q),
    );
  }
  return respond(out);
}

export function getJob(id: string) {
  return respond(jobs.find((j) => j.id === id));
}

export function getJobEvents(job: InferenceJob) {
  return respond(jobEventsFor(job));
}

export const jobsQueryOptions = (filters: JobFilters = {}) =>
  queryOptions({ queryKey: ["jobs", filters], queryFn: () => listJobs(filters) });

export const jobQueryOptions = (id: string) =>
  queryOptions({ queryKey: ["jobs", id], queryFn: () => getJob(id) });

export const jobEventsQueryOptions = (job: InferenceJob) =>
  queryOptions({ queryKey: ["jobs", job.id, "events"], queryFn: () => getJobEvents(job) });
