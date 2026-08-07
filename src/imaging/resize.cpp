#include "visionserve/imaging/resize.hpp"

#include <cmath>
#include <opencv2/imgproc.hpp>

namespace visionserve::imaging {

std::optional<Dimensions> computeResizeDimensions(Dimensions source, std::optional<int> targetWidth,
                                                  std::optional<int> targetHeight) {
    if (!targetWidth && !targetHeight) {
        return std::nullopt;
    }

    int width = source.width;
    int height = source.height;
    if (targetWidth && targetHeight) {
        width = *targetWidth;
        height = *targetHeight;
    } else if (targetWidth) {
        width = *targetWidth;
        height = static_cast<int>(
            std::llround(static_cast<double>(source.height) * width / source.width));
    } else {
        height = *targetHeight;
        width = static_cast<int>(
            std::llround(static_cast<double>(source.width) * height / source.height));
    }

    if (width <= 0 || height <= 0) {
        return std::nullopt;
    }
    return Dimensions{width, height};
}

cv::Mat resize(const cv::Mat& image, Dimensions target) {
    cv::Mat resized;
    cv::resize(image, resized, cv::Size(target.width, target.height), 0, 0, cv::INTER_AREA);
    return resized;
}

}  // namespace visionserve::imaging
