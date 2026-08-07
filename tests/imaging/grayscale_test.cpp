#include "visionserve/imaging/grayscale.hpp"

#include <gtest/gtest.h>

#include <opencv2/core.hpp>

namespace visionserve::imaging {
namespace {

TEST(ToGrayscaleTest, ConvertsThreeChannelBgrToSingleChannel) {
    cv::Mat bgr(10, 10, CV_8UC3, cv::Scalar(10, 20, 30));
    const cv::Mat gray = toGrayscale(bgr);
    EXPECT_EQ(gray.channels(), 1);
    EXPECT_EQ(gray.cols, 10);
    EXPECT_EQ(gray.rows, 10);
}

// Regression test: before this module existed, the CLI's grayscale path
// unconditionally called cv::COLOR_BGR2GRAY regardless of input channel
// count, while the HTTP endpoint correctly branched on channels() (1/3/4).
// A 4-channel (BGRA) input fed through the CLI's old code path would hit
// OpenCV's "Invalid number of channels" assertion. This exercises exactly
// that case through the shared implementation both now use.
TEST(ToGrayscaleTest, ConvertsFourChannelBgraToSingleChannel) {
    cv::Mat bgra(10, 10, CV_8UC4, cv::Scalar(10, 20, 30, 255));
    const cv::Mat gray = toGrayscale(bgra);
    EXPECT_EQ(gray.channels(), 1);
    EXPECT_EQ(gray.cols, 10);
    EXPECT_EQ(gray.rows, 10);
}

TEST(ToGrayscaleTest, SingleChannelInputPassesThroughUnchanged) {
    cv::Mat gray(10, 10, CV_8UC1, cv::Scalar(42));
    const cv::Mat result = toGrayscale(gray);
    EXPECT_EQ(result.channels(), 1);
    EXPECT_EQ(result.at<uchar>(0, 0), 42);
}

}  // namespace
}  // namespace visionserve::imaging
