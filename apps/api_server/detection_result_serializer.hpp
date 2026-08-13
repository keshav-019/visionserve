#pragma once

#include "result_serializer.hpp"
#include "visionserve/inference/types.hpp"

namespace visionserve::api {

// Renders a DetectionResult's detections into the documented JSON shape:
// [{"class_id", "label", "confidence", "box": {"x","y","width","height"}}, ...]
class DetectionResultSerializer final : public IResultSerializer<inference::DetectionResult> {
   public:
    [[nodiscard]] Json::Value serialize(const inference::DetectionResult& result) const override;
};

}  // namespace visionserve::api
