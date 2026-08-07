#pragma once

#include <opencv2/core.hpp>
#include <optional>

namespace visionserve::imaging {

struct Dimensions {
    int width;
    int height;
};

// Computes the output dimensions for a resize given the source size and an
// optional target width/height. If both are given, the result is exactly
// (targetWidth, targetHeight) — no aspect-ratio preservation. If only one is
// given, the other is derived to preserve the source's aspect ratio. Returns
// nullopt if neither target is given, or if the computed result would be
// non-positive (e.g. a zero-height source, or a target that rounds to 0).
//
// This is pure arithmetic (no OpenCV calls) so it's unit-testable without a
// real image, and it's the single source of truth for the aspect-ratio math
// that used to be duplicated between the image CLI and the HTTP resize
// endpoint.
std::optional<Dimensions> computeResizeDimensions(Dimensions source, std::optional<int> targetWidth,
                                                  std::optional<int> targetHeight);

// Resizes `image` to `target` using cv::INTER_AREA — matches the
// interpolation already in use by both the CLI and the HTTP endpoint prior
// to this extraction. Best suited to downscaling; revisit if/when upscaling
// quality matters (INTER_CUBIC/INTER_LINEAR are the usual choices there).
cv::Mat resize(const cv::Mat& image, Dimensions target);

}  // namespace visionserve::imaging
