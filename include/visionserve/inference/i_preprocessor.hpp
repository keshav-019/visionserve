#pragma once

#include <opencv2/core.hpp>

#include "visionserve/inference/tensor.hpp"

namespace visionserve::inference {

// Converts a decoded image into the numeric Tensor an IInferenceSession
// consumes. Implementations own whatever model-specific resizing,
// normalization, and layout conversion their model needs (see
// TinyYolov2Preprocessor).
class IPreprocessor {
   public:
    virtual ~IPreprocessor() = default;

    [[nodiscard]] virtual Tensor preprocess(const cv::Mat& decodedImage) const = 0;
};

}  // namespace visionserve::inference
