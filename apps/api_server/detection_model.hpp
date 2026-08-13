#pragma once

#include "visionserve/inference/i_model.hpp"
#include "visionserve/inference/types.hpp"

namespace visionserve::api {

// The task-specific IModel specialization for object detection — what
// detect_endpoint.cpp and detection_registry.hpp actually depend on. Adding
// a second task (OCR, classification, ...) means adding its own
// IModel<XResult, XOptions> alias here, not touching this one.
using IDetectionModel = inference::IModel<inference::DetectionResult, inference::DetectionOptions>;

}  // namespace visionserve::api
