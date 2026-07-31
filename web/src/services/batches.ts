import { queryOptions } from "@tanstack/react-query";
import { batches } from "@/mocks/data";
import { respond } from "./client";
import type { BatchStatus } from "@/lib/types";

export interface BatchFilters {
  status?: BatchStatus | "all";
  modelId?: string | "all";
  search?: string;
}

export function listBatches(filters: BatchFilters = {}) {
  let out = batches;
  if (filters.status && filters.status !== "all") out = out.filter((b) => b.status === filters.status);
  if (filters.modelId && filters.modelId !== "all") out = out.filter((b) => b.modelId === filters.modelId);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    out = out.filter((b) => b.id.toLowerCase().includes(q) || b.owner.toLowerCase().includes(q));
  }
  return respond(out);
}

export function getBatch(id: string) {
  return respond(batches.find((b) => b.id === id));
}

export const batchesQueryOptions = (filters: BatchFilters = {}) =>
  queryOptions({ queryKey: ["batches", filters], queryFn: () => listBatches(filters) });

export const batchQueryOptions = (id: string) =>
  queryOptions({ queryKey: ["batches", id], queryFn: () => getBatch(id) });
