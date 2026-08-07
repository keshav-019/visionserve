#include "visionserve/imaging/resize.hpp"

#include <gtest/gtest.h>

#include <opencv2/core.hpp>

namespace visionserve::imaging {
namespace {

TEST(ComputeResizeDimensionsTest, NoneGivenReturnsNullopt) {
    EXPECT_EQ(computeResizeDimensions({100, 50}, std::nullopt, std::nullopt), std::nullopt);
}

TEST(ComputeResizeDimensionsTest, BothGivenIgnoresAspectRatio) {
    const auto result = computeResizeDimensions({100, 50}, 30, 90);
    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result->width, 30);
    EXPECT_EQ(result->height, 90);
}

TEST(ComputeResizeDimensionsTest, WidthOnlyPreservesAspectRatio) {
    // 200x100 source (2:1), width=50 -> height=25
    const auto result = computeResizeDimensions({200, 100}, 50, std::nullopt);
    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result->width, 50);
    EXPECT_EQ(result->height, 25);
}

TEST(ComputeResizeDimensionsTest, HeightOnlyPreservesAspectRatio) {
    // 200x100 source (2:1), height=50 -> width=100
    const auto result = computeResizeDimensions({200, 100}, std::nullopt, 50);
    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result->width, 100);
    EXPECT_EQ(result->height, 50);
}

TEST(ComputeResizeDimensionsTest, WidthOnlyRoundsToNearestInteger) {
    // 3x1 source, width=2 -> height = round(1 * 2/3) = round(0.666...) = 1
    const auto result = computeResizeDimensions({3, 1}, 2, std::nullopt);
    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result->width, 2);
    EXPECT_EQ(result->height, 1);
}

TEST(ComputeResizeDimensionsTest, RejectsZeroTarget) {
    EXPECT_EQ(computeResizeDimensions({100, 50}, 0, std::nullopt), std::nullopt);
    EXPECT_EQ(computeResizeDimensions({100, 50}, std::nullopt, 0), std::nullopt);
}

TEST(ComputeResizeDimensionsTest, RejectsNegativeTarget) {
    EXPECT_EQ(computeResizeDimensions({100, 50}, -10, std::nullopt), std::nullopt);
}

TEST(ComputeResizeDimensionsTest, RejectsWhenDerivedDimensionRoundsToZero) {
    // 1000x1 source, width=1 -> derived height = round(1 * 1/1000) = 0, which
    // must be rejected even though the *explicit* target (width=1) was valid.
    EXPECT_EQ(computeResizeDimensions({1000, 1}, 1, std::nullopt), std::nullopt);
}

TEST(ResizeTest, ProducesRequestedDimensions) {
    cv::Mat image(50, 100, CV_8UC3, cv::Scalar(10, 20, 30));
    const cv::Mat resized = resize(image, Dimensions{25, 10});
    EXPECT_EQ(resized.cols, 25);
    EXPECT_EQ(resized.rows, 10);
    EXPECT_EQ(resized.channels(), 3);
}

}  // namespace
}  // namespace visionserve::imaging
