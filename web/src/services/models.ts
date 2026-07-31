import { queryOptions } from "@tanstack/react-query";
import { models, deployments } from "@/mocks/data";
import { respond } from "./client";
import type { ModelStatus, Operation } from "@/lib/types";

export interface ModelFilters {
  task?: Operation | "all";
  status?: ModelStatus | "all";
  search?: string;
}

export function listModels(filters: ModelFilters = {}) {
  let out = models;
  if (filters.task && filters.task !== "all") out = out.filter((m) => m.task === filters.task);
  if (filters.status && filters.status !== "all")
    out = out.filter((m) => m.status === filters.status);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    out = out.filter(
      (m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q),
    );
  }
  return respond(out);
}

export function getModel(id: string) {
  return respond(models.find((m) => m.id === id));
}

export function listDeployments() {
  return respond(deployments);
}

export function getDeployment(id: string) {
  return respond(deployments.find((d) => d.id === id));
}

export const modelsQueryOptions = (filters: ModelFilters = {}) =>
  queryOptions({ queryKey: ["models", filters], queryFn: () => listModels(filters) });

export const modelQueryOptions = (id: string) =>
  queryOptions({ queryKey: ["models", id], queryFn: () => getModel(id) });

export const deploymentsQueryOptions = () =>
  queryOptions({ queryKey: ["deployments"], queryFn: listDeployments });

export const deploymentQueryOptions = (id: string) =>
  queryOptions({ queryKey: ["deployments", id], queryFn: () => getDeployment(id) });
