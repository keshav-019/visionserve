#pragma once

#include <string_view>

namespace visionserve::telemetry {

// Configures the global spdlog logger: level from VISIONSERVE_LOG_LEVEL
// (trace/debug/info/warn/error/critical/off, default "info"), stdout sink.
// Call once at process startup, before the first log call.
void initLogger();

// Emits one structured JSON log line for a completed HTTP request, e.g.:
//   {"level":"info","event":"http_request","method":"POST","path":"/images/metadata",
//    "status":200,"request_id":"req_...","duration_ms":12.34}
// This is the Phase 2 "structured JSON logs" foundation — service/environment/
// build-version fields and job/model correlation IDs get added as those
// subsystems exist (Phases 8/13).
void logRequest(std::string_view method, std::string_view path, int statusCode,
                std::string_view requestId, double durationMs);

// Emits one structured JSON log line reporting whether a model finished
// loading, e.g.:
//   {"level":"info","event":"model_load","model_path":"models/tinyyolov2-8.onnx",
//    "success":true,"error":""}
// Logged at "info" on success, "error" on failure.
void logModelLoad(std::string_view modelPath, bool success, std::string_view error);

}  // namespace visionserve::telemetry
