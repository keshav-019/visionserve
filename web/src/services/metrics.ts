import { queryOptions } from "@tanstack/react-query";
import {
  requestVolumeSeries,
  latencySeries,
  throughputSeries,
  queueDepthSeries,
  workerUtilSeries,
  batchSizeSeries,
  errorsByCode,
  confidenceHistogram,
  detectionCountHistogram,
  usageByModel,
  usageByOperation,
  quotas,
  benchmarks,
} from "@/mocks/data";
import { respond } from "./client";

export const overviewQueryOptions = () =>
  queryOptions({
    queryKey: ["metrics", "overview"],
    queryFn: () =>
      respond({
        totalRequests: 187_542,
        totalRequestsDelta: 12.4,
        successRate: 99.62,
        successRateDelta: 0.08,
        errorRate: 0.38,
        errorRateDelta: -0.11,
        avgLatencyMs: 52.4,
        avgLatencyDelta: -4.2,
        p95LatencyMs: 84.1,
        p95Delta: 2.8,
        imagesProcessed: 162_208,
        imagesDelta: 9.8,
        activeModels: 3,
        queueDepth: 14,
      }),
  });

export const requestVolumeQueryOptions = (range: "1h" | "24h" | "7d" | "30d") =>
  queryOptions({ queryKey: ["metrics", "volume", range], queryFn: () => respond(requestVolumeSeries(range)) });

export const latencyQueryOptions = () =>
  queryOptions({ queryKey: ["metrics", "latency"], queryFn: () => respond(latencySeries()) });

export const throughputQueryOptions = () =>
  queryOptions({ queryKey: ["metrics", "throughput"], queryFn: () => respond(throughputSeries()) });

export const queueQueryOptions = () =>
  queryOptions({ queryKey: ["metrics", "queue"], queryFn: () => respond(queueDepthSeries()) });

export const workerUtilQueryOptions = () =>
  queryOptions({ queryKey: ["metrics", "workers"], queryFn: () => respond(workerUtilSeries()) });

export const batchSizeQueryOptions = () =>
  queryOptions({ queryKey: ["metrics", "batch-size"], queryFn: () => respond(batchSizeSeries()) });

export const distributionsQueryOptions = () =>
  queryOptions({
    queryKey: ["metrics", "distributions"],
    queryFn: () => respond({ errorsByCode, confidenceHistogram, detectionCountHistogram, usageByModel, usageByOperation }),
  });

export const quotasQueryOptions = () =>
  queryOptions({ queryKey: ["metrics", "quotas"], queryFn: () => respond(quotas) });

export const benchmarksQueryOptions = () =>
  queryOptions({ queryKey: ["metrics", "benchmarks"], queryFn: () => respond(benchmarks) });
