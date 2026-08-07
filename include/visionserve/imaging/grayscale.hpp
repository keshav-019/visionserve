#pragma once

#include <opencv2/core.hpp>

namespace visionserve::imaging {

// Converts to single-channel grayscale, handling the channel counts OpenCV's
// imread/imdecode can actually produce: 1 (already grayscale, returned as-is
// via cv::Mat's reference-counted assignment), 4 (BGRA), and everything else
// — 3 (BGR) in practice — via cv::COLOR_BGR2GRAY.
cv::Mat toGrayscale(const cv::Mat& image);

}  // namespace visionserve::imaging
