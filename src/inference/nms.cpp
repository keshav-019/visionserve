#include "visionserve/inference/nms.hpp"

#include <algorithm>
#include <cstddef>

namespace visionserve::inference {
namespace {

float intersectionOverUnion(const BoundingBox& a, const BoundingBox& b) {
    const float interLeft = std::max(a.x, b.x);
    const float interTop = std::max(a.y, b.y);
    const float interRight = std::min(a.x + a.width, b.x + b.width);
    const float interBottom = std::min(a.y + a.height, b.y + b.height);

    const float interWidth = std::max(0.0F, interRight - interLeft);
    const float interHeight = std::max(0.0F, interBottom - interTop);
    const float interArea = interWidth * interHeight;

    const float unionArea = (a.width * a.height) + (b.width * b.height) - interArea;
    if (unionArea <= 0.0F) {
        return 0.0F;
    }
    return interArea / unionArea;
}

}  // namespace

std::vector<Detection> nonMaxSuppression(std::vector<Detection> detections, float iouThreshold,
                                         int maxDetections) {
    std::sort(detections.begin(), detections.end(),
              [](const Detection& a, const Detection& b) { return a.confidence > b.confidence; });

    std::vector<Detection> kept;
    std::vector<bool> suppressed(detections.size(), false);

    for (std::size_t i = 0; i < detections.size(); ++i) {
        if (suppressed[i]) {
            continue;
        }
        kept.push_back(detections[i]);
        for (std::size_t j = i + 1; j < detections.size(); ++j) {
            if (suppressed[j] || detections[j].classId != detections[i].classId) {
                continue;
            }
            if (intersectionOverUnion(detections[i].box, detections[j].box) > iouThreshold) {
                suppressed[j] = true;
            }
        }
    }

    if (maxDetections >= 0 && kept.size() > static_cast<std::size_t>(maxDetections)) {
        kept.resize(static_cast<std::size_t>(maxDetections));
    }
    return kept;
}

}  // namespace visionserve::inference
