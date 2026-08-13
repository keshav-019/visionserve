#pragma once

#include <cstdint>
#include <vector>

namespace visionserve::inference {

// A flat, row-major numeric buffer plus its shape (e.g. {1, 3, 416, 416} for
// an NCHW image tensor) — the common currency IPreprocessor produces and
// IInferenceSession consumes/returns, so neither has to know anything about
// what the numbers mean.
struct Tensor {
    std::vector<float> data;
    std::vector<std::int64_t> shape;
};

}  // namespace visionserve::inference
