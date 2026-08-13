#pragma once

#include "visionserve/inference/image_metadata.hpp"
#include "visionserve/inference/tensor.hpp"

namespace visionserve::inference {

// Decodes a raw inference-session output Tensor into a task-specific typed
// result (e.g. DetectionResult). Parameterized on the result type and the
// per-request options type, since those genuinely differ per task — unlike
// IPreprocessor/IInferenceSession, which stay identical across every task
// that feeds a single-input/single-output image tensor through ONNX Runtime.
template <typename ResultT, typename OptionsT>
class IPostprocessor {
   public:
    virtual ~IPostprocessor() = default;

    [[nodiscard]] virtual ResultT postprocess(const Tensor& rawOutput,
                                              const ImageMetadata& sourceImage,
                                              const OptionsT& options) const = 0;
};

}  // namespace visionserve::inference
