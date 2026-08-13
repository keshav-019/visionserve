#pragma once

#include <string_view>

#include "visionserve/inference/tensor.hpp"

namespace visionserve::inference {

// A loaded model runtime session: Tensor in, Tensor out. Deliberately
// runtime-agnostic — nothing in this interface mentions ONNX Runtime, so a
// future non-ONNX backend could implement it without touching any code that
// only depends on IInferenceSession (see OnnxInferenceSession for the only
// implementation today).
class IInferenceSession {
   public:
    virtual ~IInferenceSession() = default;

    [[nodiscard]] virtual Tensor run(const Tensor& input) const = 0;

    // True once the session has loaded successfully; false if construction
    // failed (missing/corrupt model file, unsupported graph, ...).
    [[nodiscard]] virtual bool isReady() const noexcept = 0;

    // Human-readable reason isReady() is false; empty once loaded.
    [[nodiscard]] virtual std::string_view loadError() const noexcept = 0;
};

}  // namespace visionserve::inference
