#pragma once

#include <span>
#include <vector>

#include "visionserve/imaging/resize.hpp"
#include "visionserve/inference/types.hpp"

namespace visionserve::inference {

// Decodes a raw tiny-yolov2 output tensor (125x13x13, channel-major:
// index = channel*169 + y*13 + x — the model's native NCHW layout with the
// leading batch dimension of 1 dropped) into detections, applying the
// combined-confidence threshold (objectness * best class probability) but
// NOT non-max suppression — see nonMaxSuppression() for that. Box
// coordinates are remapped from the model's 416x416 input space into
// `originalSize` pixel coordinates and clamped to the image bounds.
//
// Pure function — no ONNX Runtime or file I/O involved — so it's directly
// unit-testable against synthetic tensors.
std::vector<Detection> decodeTinyYolov2Output(std::span<const float> rawOutput,
                                              imaging::Dimensions originalSize,
                                              float confidenceThreshold);

}  // namespace visionserve::inference
