#pragma once

#include <concepts>
#include <memory>
#include <utility>

#include "visionserve/common/timing.hpp"
#include "visionserve/inference/i_inference_session.hpp"
#include "visionserve/inference/i_model.hpp"
#include "visionserve/inference/i_postprocessor.hpp"
#include "visionserve/inference/i_preprocessor.hpp"
#include "visionserve/inference/image_metadata.hpp"
#include "visionserve/inference/inference_timing.hpp"
#include "visionserve/inference/model_metadata.hpp"

namespace visionserve::inference {

// Constrains PipelineModel's ResultT to types that carry an InferenceTiming
// field named `timing` — the structural contract PipelineModel::run() relies
// on to fill in per-stage measurements after calling the postprocessor.
template <typename T>
concept HasInferenceTiming = requires(T result) {
    { result.timing } -> std::same_as<InferenceTiming&>;
};

// The one IModel implementation: generically orchestrates
// preprocess -> infer -> postprocess for any task, measuring each stage.
// Nothing in this class is ONNX-specific or detection-specific — that all
// lives in the IPreprocessor/IInferenceSession/IPostprocessor it composes
// (see tiny_yolov2_{preprocessor,postprocessor}.hpp and
// onnx_inference_session.hpp for today's only implementations). A future
// OCR or classification model reuses this same orchestration by supplying
// its own preprocessor/postprocessor.
template <typename ResultT, typename OptionsT>
    requires HasInferenceTiming<ResultT>
class PipelineModel : public IModel<ResultT, OptionsT> {
   public:
    PipelineModel(ModelMetadata metadata, std::shared_ptr<IPreprocessor> preprocessor,
                  std::shared_ptr<IInferenceSession> session,
                  std::shared_ptr<IPostprocessor<ResultT, OptionsT>> postprocessor)
        : metadata_(std::move(metadata)),
          preprocessor_(std::move(preprocessor)),
          session_(std::move(session)),
          postprocessor_(std::move(postprocessor)) {}

    [[nodiscard]] const ModelMetadata& metadata() const override {
        return metadata_;
    }

    [[nodiscard]] bool isReady() const noexcept override {
        return session_->isReady();
    }

    [[nodiscard]] std::string_view loadError() const noexcept override {
        return session_->loadError();
    }

    [[nodiscard]] ResultT run(const cv::Mat& decodedImage, const OptionsT& options) const override {
        common::Stopwatch preStage;
        const Tensor input = preprocessor_->preprocess(decodedImage);
        const double preprocessMs = preStage.elapsedMs();

        common::Stopwatch inferStage;
        const Tensor output = session_->run(input);
        const double inferenceMs = inferStage.elapsedMs();

        common::Stopwatch postStage;
        const ImageMetadata sourceImage{decodedImage.cols, decodedImage.rows,
                                        decodedImage.channels()};
        ResultT result = postprocessor_->postprocess(output, sourceImage, options);
        const double postprocessMs = postStage.elapsedMs();

        result.timing.preprocessMs = preprocessMs;
        result.timing.inferenceMs = inferenceMs;
        result.timing.postprocessMs = postprocessMs;
        return result;
    }

   private:
    ModelMetadata metadata_;
    std::shared_ptr<IPreprocessor> preprocessor_;
    std::shared_ptr<IInferenceSession> session_;
    std::shared_ptr<IPostprocessor<ResultT, OptionsT>> postprocessor_;
};

}  // namespace visionserve::inference
