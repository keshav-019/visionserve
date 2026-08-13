#pragma once

#include "detection_model.hpp"
#include "visionserve/inference/model_registry.hpp"

namespace visionserve::api {

// The process-wide detection model registry, built on first access and
// shared across every /v1/detect request. Currently holds exactly one
// model ("tiny-yolov2", also the default) — see detection_registry.cpp for
// the composition root that wires its IPreprocessor/IInferenceSession/
// IPostprocessor together. Forced to build eagerly during
// configureVisionServeApp() (not lazily on first request) so GET /ready
// reflects the real load outcome immediately at startup.
inference::ModelRegistry<IDetectionModel>& detectionModelRegistry();

}  // namespace visionserve::api
