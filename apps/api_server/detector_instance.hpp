#pragma once

#include "visionserve/inference/detector.hpp"

namespace visionserve::api {

// Process-wide Detector, constructed on first access and shared across every
// /v1/detect request (ONNX Runtime sessions are safe to run concurrently
// from multiple threads). app_setup.cpp calls this once during
// configureVisionServeApp() so the model load happens eagerly at startup —
// not lazily on the first request — and GET /ready reflects the real result.
inference::Detector& detectorInstance();

}  // namespace visionserve::api
