#pragma once

#include <memory>
#include <string>
#include <string_view>

#include "visionserve/inference/i_inference_session.hpp"

namespace visionserve::inference {

// The only IInferenceSession implementation today: an ONNX Runtime session
// over a single-input/single-output graph, loaded once at construction.
// Generic across any such model — nothing here is tiny-yolov2-specific;
// what the input/output tensors mean is entirely up to the IPreprocessor
// and IPostprocessor on either side of it.
//
// ONNX Runtime guarantees Session::Run is safe to call concurrently from
// multiple threads on the same session, so one instance is shared across
// every request rather than one per request.
class OnnxInferenceSession final : public IInferenceSession {
   public:
    explicit OnnxInferenceSession(const std::string& modelPath);
    ~OnnxInferenceSession() override;

    OnnxInferenceSession(const OnnxInferenceSession&) = delete;
    OnnxInferenceSession& operator=(const OnnxInferenceSession&) = delete;
    OnnxInferenceSession(OnnxInferenceSession&&) noexcept;
    OnnxInferenceSession& operator=(OnnxInferenceSession&&) noexcept;

    [[nodiscard]] Tensor run(const Tensor& input) const override;
    [[nodiscard]] bool isReady() const noexcept override;
    [[nodiscard]] std::string_view loadError() const noexcept override;

   private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

}  // namespace visionserve::inference
