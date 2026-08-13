#pragma once

#include "visionserve/inference/i_preprocessor.hpp"

namespace visionserve::inference {

// Adapts preprocessForTinyYolov2() (see preprocess.hpp — kept as a pure,
// independently unit-tested free function) to IPreprocessor.
class TinyYolov2Preprocessor final : public IPreprocessor {
   public:
    [[nodiscard]] Tensor preprocess(const cv::Mat& decodedImage) const override;
};

}  // namespace visionserve::inference
