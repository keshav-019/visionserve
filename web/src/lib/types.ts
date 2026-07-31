/**
 * VisionServe domain types.
 * These mirror the shapes the real REST/gRPC gateway will return,
 * so the mock services can be swapped for real clients later.
 */

export type Environment = "development" | "staging" | "production";

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "expired";

export type ModelStatus =
  "loading" | "warming" | "healthy" | "degraded" | "failed" | "inactive" | "unloading";

export type DeploymentStatus = "active" | "rolling_out" | "paused" | "degraded" | "failed";

export type ComponentStatus =
  "operational" | "degraded" | "partial_outage" | "major_outage" | "maintenance";

export type BatchStatus =
  "queued" | "running" | "succeeded" | "partial_failure" | "failed" | "cancelled";

export type Operation =
  "detect" | "ocr" | "classify" | "metadata" | "resize" | "grayscale" | "segment";

export type Role = "owner" | "administrator" | "ml_engineer" | "developer" | "viewer";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  label: string;
  classId: number;
  confidence: number;
  box: BoundingBox;
}

export interface OcrRegion {
  text: string;
  confidence: number;
  box: BoundingBox;
}

export interface ClassificationPrediction {
  label: string;
  classId: number;
  confidence: number;
}

export interface InferenceTiming {
  uploadMs?: number;
  decodeMs: number;
  preprocessMs: number;
  queueWaitMs?: number;
  inferenceMs: number;
  postprocessMs: number;
  serializationMs?: number;
  totalMs: number;
}

export interface ModelVersion {
  id: string;
  modelId: string;
  version: string;
  status: ModelStatus;
  checksum: string;
  sizeBytes: number;
  inputShape: number[];
  runtime: string;
  createdAt: string;
  activatedAt?: string;
  requests: number;
  errorRate: number;
  avgLatencyMs: number;
}

export interface Model {
  id: string;
  name: string;
  description: string;
  task: Operation;
  status: ModelStatus;
  health: "healthy" | "degraded" | "unavailable";
  activeVersion: string;
  runtime: string;
  executionProvider: string;
  inputShape: number[];
  outputShape: string;
  labels: string[];
  checksum: string;
  sizeBytes: number;
  owner: string;
  environment: Environment;
  requests: number;
  avgLatencyMs: number;
  errorRate: number;
  createdAt: string;
  updatedAt: string;
  versions: ModelVersion[];
}

export interface InferenceJob {
  id: string;
  requestId: string;
  operation: Operation;
  modelId: string;
  modelVersion: string;
  status: JobStatus;
  progress: number;
  owner: string;
  environment: Environment;
  inputFile: string;
  inputSizeBytes: number;
  inputDimensions?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  queueWaitMs?: number;
  timing?: InferenceTiming;
  errorCode?: string;
  errorMessage?: string;
}

export interface JobEvent {
  ts: string;
  level: "info" | "warn" | "error";
  stage: string;
  message: string;
}

export interface BatchItem {
  n: number;
  filename: string;
  status: JobStatus;
  resultCount: number;
  inferenceMs: number;
  error?: string;
}

export interface Batch {
  id: string;
  modelId: string;
  modelVersion: string;
  status: BatchStatus;
  owner: string;
  environment: Environment;
  totalFiles: number;
  completed: number;
  failed: number;
  createdAt: string;
  completedAt?: string;
  durationMs?: number;
  maxParallelism: number;
  continueOnFailure: boolean;
  webhook?: string;
  items: BatchItem[];
}

export interface InferenceResult {
  id: string;
  requestId: string;
  jobId?: string;
  batchId?: string;
  operation: Operation;
  modelId: string;
  modelVersion: string;
  owner: string;
  environment: Environment;
  inputImage: string;
  inputWidth: number;
  inputHeight: number;
  createdAt: string;
  expiresAt: string;
  timing: InferenceTiming;
  detections?: Detection[];
  ocrRegions?: OcrRegion[];
  ocrText?: string;
  predictions?: ClassificationPrediction[];
}

export type ApiKeyStatus = "active" | "revoked" | "expired";

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  environment: Environment;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
  status: ApiKeyStatus;
  requests: number;
  errorRate: number;
  rateLimit: number;
  allowedOrigins?: string[];
  ipAllowlist?: string[];
}

export interface Deployment {
  id: string;
  name: string;
  modelId: string;
  version: string;
  environment: Environment;
  region: string;
  replicas: number;
  status: DeploymentStatus;
  trafficPct: number;
  errorRate: number;
  p95Ms: number;
  queueDepth: number;
  maxConcurrency: number;
  executionProvider: string;
  updatedAt: string;
}

export interface Webhook {
  id: string;
  name: string;
  endpoint: string;
  events: string[];
  status: "active" | "paused" | "failing";
  signingSecret: string;
  lastDeliveryAt?: string;
  failureRate: number;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: number;
  success: boolean;
  attempts: number;
  durationMs: number;
  deliveredAt: string;
  payload: Record<string, unknown>;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "suspended" | "invited";
  lastActiveAt?: string;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  invitedBy: string;
  sentAt: string;
  expiresAt: string;
  status: "pending" | "accepted" | "expired" | "revoked";
}

export interface AuditLog {
  id: string;
  ts: string;
  actor: string;
  action: string;
  resource: string;
  resourceType: string;
  environment: Environment;
  ip: string;
  userAgent: string;
  result: "success" | "denied" | "error";
  requestId: string;
  previousValue?: string;
  newValue?: string;
}

export interface StorageObject {
  id: string;
  name: string;
  type: "original" | "annotated" | "archive" | "metadata";
  owner: string;
  jobId?: string;
  batchId?: string;
  sizeBytes: number;
  createdAt: string;
  expiresAt: string;
  provider: string;
}

export interface Benchmark {
  id: string;
  modelId: string;
  hardwareProfile: string;
  imageSize: string;
  concurrency: number;
  requests: number;
  throughputRps: number;
  p95Ms: number;
  peakMemoryMb: number;
  createdAt: string;
  notes?: string;
}

export interface AppNotification {
  id: string;
  kind: "deployment" | "job_failed" | "quota" | "batch" | "storage" | "health" | "security";
  title: string;
  body: string;
  ts: string;
  read: boolean;
  href?: string;
}

export interface SystemComponent {
  id: string;
  name: string;
  status: ComponentStatus;
  lastCheckAt: string;
  responseMs: number;
  uptimePct: number;
  message?: string;
}

export interface Incident {
  id: string;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  startedAt: string;
  resolvedAt?: string;
  impact: string;
  updates: { ts: string; message: string }[];
}

export interface Quota {
  id: string;
  label: string;
  used: number;
  limit: number;
  unit: string;
  period: "daily" | "monthly" | "total";
}

export interface RetentionPolicy {
  id: string;
  resource: string;
  retentionDays: number;
  autoDelete: boolean;
  description: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  region: string;
  plan: string;
  defaultEnvironment: Environment;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobTitle: string;
}

export interface LimitSetting {
  id: string;
  label: string;
  description: string;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  unit: string;
  warnAbove?: number;
  category: string;
}

export interface TimePoint {
  t: string;
  [key: string]: string | number;
}
