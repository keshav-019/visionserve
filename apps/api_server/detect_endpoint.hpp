#pragma once

namespace visionserve::api {

// Registers POST /v1/detect on the global drogon::app() instance. Serves
// object-detection requests against the process-wide Detector (see
// detector_instance.hpp) — 503 with ErrorCode::ModelNotReady if the model
// hasn't loaded successfully.
void registerDetectEndpoint();

}  // namespace visionserve::api
