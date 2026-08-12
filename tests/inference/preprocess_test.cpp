#include "visionserve/inference/preprocess.hpp"

#include <gtest/gtest.h>

#include <opencv2/core.hpp>

#include "tiny_yolov2_constants.hpp"

namespace visionserve::inference {
namespace {

using tiny_yolov2::kInputSize;

TEST(PreprocessTest, ProducesATensorOfTheExpectedSize) {
    const cv::Mat bgr(100, 200, CV_8UC3, cv::Scalar(10, 20, 30));
    const auto tensor = preprocessForTinyYolov2(bgr);
    EXPECT_EQ(tensor.size(), static_cast<std::size_t>(3 * kInputSize * kInputSize));
}

TEST(PreprocessTest, ConvertsBgrToRgbChannelOrder) {
    // OpenCV stores BGR: B=10, G=20, R=30. The tensor is channel-major RGB,
    // so channel 0 (R) should read back ~30, channel 2 (B) ~10.
    const cv::Mat bgr(kInputSize, kInputSize, CV_8UC3, cv::Scalar(10, 20, 30));
    const auto tensor = preprocessForTinyYolov2(bgr);

    const auto channelStride =
        static_cast<std::size_t>(kInputSize) * static_cast<std::size_t>(kInputSize);
    const std::size_t midPixel = channelStride / 2;

    EXPECT_NEAR(tensor[(0 * channelStride) + midPixel], 30.0F, 1.0F);  // R
    EXPECT_NEAR(tensor[(1 * channelStride) + midPixel], 20.0F, 1.0F);  // G
    EXPECT_NEAR(tensor[(2 * channelStride) + midPixel], 10.0F, 1.0F);  // B
}

TEST(PreprocessTest, HandlesGrayscaleInput) {
    const cv::Mat gray(kInputSize, kInputSize, CV_8UC1, cv::Scalar(128));
    const auto tensor = preprocessForTinyYolov2(gray);
    ASSERT_EQ(tensor.size(), static_cast<std::size_t>(3 * kInputSize * kInputSize));

    const auto channelStride =
        static_cast<std::size_t>(kInputSize) * static_cast<std::size_t>(kInputSize);
    const std::size_t midPixel = channelStride / 2;
    EXPECT_NEAR(tensor[(0 * channelStride) + midPixel], 128.0F, 1.0F);
    EXPECT_NEAR(tensor[(1 * channelStride) + midPixel], 128.0F, 1.0F);
    EXPECT_NEAR(tensor[(2 * channelStride) + midPixel], 128.0F, 1.0F);
}

TEST(PreprocessTest, HandlesBgraInput) {
    const cv::Mat bgra(kInputSize, kInputSize, CV_8UC4, cv::Scalar(10, 20, 30, 255));
    const auto tensor = preprocessForTinyYolov2(bgra);
    EXPECT_EQ(tensor.size(), static_cast<std::size_t>(3 * kInputSize * kInputSize));
}

}  // namespace
}  // namespace visionserve::inference
