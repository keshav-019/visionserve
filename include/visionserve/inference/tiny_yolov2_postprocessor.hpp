#pragma once

#include "visionserve/inference/i_postprocessor.hpp"
#include "visionserve/inference/types.hpp"

namespace visionserve::inference {

// Adapts decodeTinyYolov2Output() + nonMaxSuppression() (see postprocess.hpp
// / nms.hpp — both kept as pure, independently unit-tested free functions)
// to IPostprocessor<DetectionResult, DetectionOptions>.
class TinyYolov2Postprocessor final : public IPostprocessor<DetectionResult, DetectionOptions> {
   public:
    [[nodiscard]] DetectionResult postprocess(const Tensor& rawOutput,
                                              const ImageMetadata& sourceImage,
                                              const DetectionOptions& options) const override;
};

}  // namespace visionserve::inference
