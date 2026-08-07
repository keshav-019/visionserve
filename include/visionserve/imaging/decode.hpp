#pragma once

#include <opencv2/core.hpp>
#include <string_view>

namespace visionserve::imaging {

// Decodes an in-memory image buffer. Returns an empty cv::Mat (mat.empty())
// on failure — a corrupt file, truncated data, or a format OpenCV doesn't
// support — rather than throwing; decode failure is an expected, common
// outcome for untrusted input, not an exceptional one.
cv::Mat decode(std::string_view bytes);

}  // namespace visionserve::imaging
