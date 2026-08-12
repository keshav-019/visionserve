#pragma once

#include <string>
#include <vector>

namespace visionserve::inference {

// Top-left corner plus size, in the coordinate space of the *original*
// (pre-resize) image passed to Detector::detect().
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

struct DetectionTiming {
    double preprocessMs = 0.0;
    double inferenceMs = 0.0;
    double postprocessMs = 0.0;
};

struct DetectionResult {
    std::vector<Detection> detections;
    DetectionTiming timing;
};

}  // namespace visionserve::inference
