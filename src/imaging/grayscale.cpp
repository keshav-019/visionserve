#include "visionserve/imaging/grayscale.hpp"

#include <opencv2/imgproc.hpp>

namespace visionserve::imaging {

cv::Mat toGrayscale(const cv::Mat& image) {
    if (image.channels() == 1) {
        return image;
    }
    cv::Mat gray;
    cv::cvtColor(image, gray, image.channels() == 4 ? cv::COLOR_BGRA2GRAY : cv::COLOR_BGR2GRAY);
    return gray;
}

}  // namespace visionserve::imaging
