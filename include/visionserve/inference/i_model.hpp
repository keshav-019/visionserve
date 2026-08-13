#pragma once

#include <opencv2/core.hpp>
#include <string_view>

#include "visionserve/inference/model_metadata.hpp"

namespace visionserve::inference {

// A runnable, registered model for one task: image in, typed result out.
// Controllers depend only on this interface (resolved from a
// ModelRegistry<IModel<ResultT, OptionsT>>), never on ONNX Runtime or any
// other runtime-specific type — see PipelineModel for the one implementation
// today, which composes an IPreprocessor + IInferenceSession +
// IPostprocessor.
template <typename ResultT, typename OptionsT>
class IModel {
   public:
    virtual ~IModel() = default;

    [[nodiscard]] virtual const ModelMetadata& metadata() const = 0;
    [[nodiscard]] virtual bool isReady() const noexcept = 0;
    [[nodiscard]] virtual std::string_view loadError() const noexcept = 0;

    [[nodiscard]] virtual ResultT run(const cv::Mat& decodedImage,
                                      const OptionsT& options) const = 0;
};

}  // namespace visionserve::inference
