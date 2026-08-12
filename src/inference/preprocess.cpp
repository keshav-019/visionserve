#include "visionserve/inference/preprocess.hpp"

#include <opencv2/imgproc.hpp>

#include "tiny_yolov2_constants.hpp"
#include "visionserve/imaging/resize.hpp"

namespace visionserve::inference {
namespace {

using tiny_yolov2::kInputSize;

cv::Mat toRgb(const cv::Mat& image) {
    cv::Mat rgb;
    switch (image.channels()) {
        case 1:
            cv::cvtColor(image, rgb, cv::COLOR_GRAY2RGB);
            break;
        case 4:
            cv::cvtColor(image, rgb, cv::COLOR_BGRA2RGB);
            break;
        default:
            cv::cvtColor(image, rgb, cv::COLOR_BGR2RGB);
            break;
    }
    return rgb;
}

}  // namespace

std::vector<float> preprocessForTinyYolov2(const cv::Mat& decodedImage) {
    const cv::Mat resized = imaging::resize(decodedImage, {kInputSize, kInputSize});
    const cv::Mat rgb = toRgb(resized);

    cv::Mat floatImage;
    rgb.convertTo(floatImage, CV_32FC3);

    std::vector<float> tensor(3ULL * kInputSize * kInputSize);
    const auto channelStride = static_cast<std::size_t>(kInputSize) * static_cast<std::size_t>(kInputSize);

    for (int y = 0; y < kInputSize; ++y) {
        const auto* row = floatImage.ptr<cv::Vec3f>(y);
        for (int x = 0; x < kInputSize; ++x) {
            const cv::Vec3f& pixel = row[x];
            const auto pixelIndex = static_cast<std::size_t>(y) * static_cast<std::size_t>(kInputSize) +
                                    static_cast<std::size_t>(x);
            tensor[(0 * channelStride) + pixelIndex] = pixel[0];  // R
            tensor[(1 * channelStride) + pixelIndex] = pixel[1];  // G
            tensor[(2 * channelStride) + pixelIndex] = pixel[2];  // B
        }
    }
    return tensor;
}

}  // namespace visionserve::inference
