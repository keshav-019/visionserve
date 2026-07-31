import { queryOptions } from "@tanstack/react-query";
import { results } from "@/mocks/data";
import { respond } from "./client";
import type { Operation } from "@/lib/types";

export interface ResultFilters {
  operation?: Operation | "all";
  modelId?: string | "all";
  search?: string;
}

export function listResults(filters: ResultFilters = {}) {
  let out = results;
  if (filters.operation && filters.operation !== "all") out = out.filter((r) => r.operation === filters.operation);
  if (filters.modelId && filters.modelId !== "all") out = out.filter((r) => r.modelId === filters.modelId);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    out = out.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.requestId.toLowerCase().includes(q) ||
        (r.jobId ?? "").toLowerCase().includes(q),
    );
  }
  return respond(out);
}

export function getResult(id: string) {
  return respond(results.find((r) => r.id === id));
}

export const resultsQueryOptions = (filters: ResultFilters = {}) =>
  queryOptions({ queryKey: ["results", filters], queryFn: () => listResults(filters) });

export const resultQueryOptions = (id: string) =>
  queryOptions({ queryKey: ["results", id], queryFn: () => getResult(id) });
