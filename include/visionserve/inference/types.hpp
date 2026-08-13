#pragma once

#include <string>
#include <vector>

#include "visionserve/inference/inference_timing.hpp"

namespace visionserve::inference {

// Top-left corner plus size, in the coordinate space of the *original*
// (pre-resize) image passed to IModel::run().
struct BoundingBox {
    float x;
    float y;
    float width;
    float height;
};

struct Detection {
    int classId;
    std::string label;
    float confidence;
    BoundingBox box;
};

struct DetectionOptions {
    float confidenceThreshold = 0.5F;
    float iouThreshold = 0.45F;
    int maxDetections = 100;
};

struct DetectionResult {
    std::vector<Detection> detections;
    InferenceTiming timing;
};

}  // namespace visionserve::inference
