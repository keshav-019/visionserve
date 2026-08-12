#pragma once

#include <vector>

#include "visionserve/inference/types.hpp"

namespace visionserve::inference {

// Greedy non-max suppression, applied per class: detections are sorted by
// confidence (descending), and any lower-confidence detection whose box
// overlaps an already-kept detection of the *same class* by more than
// `iouThreshold` is dropped. The result is then truncated to
// `maxDetections` (highest confidence first, across all classes).
std::vector<Detection> nonMaxSuppression(std::vector<Detection> detections, float iouThreshold,
                                         int maxDetections);

}  // namespace visionserve::inference
