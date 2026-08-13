#pragma once

namespace visionserve::api {

// Registers POST /v1/detect on the global drogon::app() instance. Serves
// object-detection requests against the default model in
// detectionModelRegistry() (see detection_registry.hpp) — 503 with
// ErrorCode::ModelNotReady if it hasn't loaded successfully.
void registerDetectEndpoint();

}  // namespace visionserve::api
