#include "visionserve/inference/postprocess.hpp"

#include <gtest/gtest.h>

#include <cmath>
#include <cstddef>
#include <string>
#include <vector>

#include "tiny_yolov2_constants.hpp"

namespace visionserve::inference {
namespace {

using tiny_yolov2::kAnchors;
using tiny_yolov2::kCellSize;
using tiny_yolov2::kChannelsPerCell;
using tiny_yolov2::kClassLabels;
using tiny_yolov2::kGridSize;
using tiny_yolov2::kInputSize;
using tiny_yolov2::kNumClasses;
using tiny_yolov2::kValuesPerBox;

float referenceSigmoid(float x) {
    return 1.0F / (1.0F + std::exp(-x));
}

std::size_t rawOffset(int x, int y, int channel) {
    constexpr auto channelStride = static_cast<std::size_t>(kGridSize) * static_cast<std::size_t>(kGridSize);
    return (static_cast<std::size_t>(channel) * channelStride) + (static_cast<std::size_t>(y) * static_cast<std::size_t>(kGridSize)) +
          static_cast<std::size_t>(x);
}

std::vector<float> zeroedOutput() {
    return std::vector<float>(static_cast<std::size_t>(kChannelsPerCell) * kGridSize * kGridSize, 0.0F);
}

// Writes one box's raw (tx, ty, tw, th, objectness) plus a one-hot-ish class
// score vector (classScore at `classIndex`, everything else 0) into `raw` at
// grid cell (cx, cy), box index `box`.
void writeBox(std::vector<float>& raw, int cx, int cy, int box, float tx, float ty, float tw, float th,
             float objectness, int classIndex, float classScore) {
    const int channel = box * kValuesPerBox;
    raw[rawOffset(cx, cy, channel + 0)] = tx;
    raw[rawOffset(cx, cy, channel + 1)] = ty;
    raw[rawOffset(cx, cy, channel + 2)] = tw;
    raw[rawOffset(cx, cy, channel + 3)] = th;
    raw[rawOffset(cx, cy, channel + 4)] = objectness;
    raw[rawOffset(cx, cy, channel + 5 + classIndex)] = classScore;
}

TEST(PostprocessTest, EmptyOutputYieldsNoDetections) {
    const auto raw = zeroedOutput();
    // objectness=0 -> sigmoid(0)=0.5, classProb ~= 1/20 -> score ~0.025, below any
    // reasonable threshold.
    const auto detections =
        decodeTinyYolov2Output(raw, imaging::Dimensions{kInputSize, kInputSize}, 0.5F);
    EXPECT_TRUE(detections.empty());
}

TEST(PostprocessTest, DecodesASingleConfidentBoxWithExpectedGeometry) {
    auto raw = zeroedOutput();
    constexpr int cx = 5;
    constexpr int cy = 7;
    constexpr int box = 2;
    constexpr int classIndex = 9;  // "cow"
    constexpr float tx = 0.2F;
    constexpr float ty = -0.3F;
    constexpr float tw = 0.1F;
    constexpr float th = -0.2F;
    constexpr float objectness = 5.0F;
    constexpr float classScore = 8.0F;
    writeBox(raw, cx, cy, box, tx, ty, tw, th, objectness, classIndex, classScore);

    const auto detections =
        decodeTinyYolov2Output(raw, imaging::Dimensions{kInputSize, kInputSize}, 0.5F);
    ASSERT_EQ(detections.size(), 1U);

    const auto& detection = detections.front();
    EXPECT_EQ(detection.classId, classIndex);
    EXPECT_EQ(detection.label, std::string{kClassLabels[classIndex]});

    // Reference softmax over {classScore, 0, 0, ..., 0} (kNumClasses-1 zeros).
    const float sumExp = std::exp(classScore - classScore) + (static_cast<float>(kNumClasses) - 1.0F) *
                                                                  std::exp(0.0F - classScore);
    const float expectedClassProb = 1.0F / sumExp;
    const float expectedScore = referenceSigmoid(objectness) * expectedClassProb;
    EXPECT_NEAR(detection.confidence, expectedScore, 1e-4F);

    const float centerX = (static_cast<float>(cx) + referenceSigmoid(tx)) * kCellSize;
    const float centerY = (static_cast<float>(cy) + referenceSigmoid(ty)) * kCellSize;
    const float width = std::exp(tw) * kCellSize * kAnchors[static_cast<std::size_t>(box) * 2];
    const float height = std::exp(th) * kCellSize * kAnchors[(static_cast<std::size_t>(box) * 2) + 1];
    const float expectedLeft = centerX - (width / 2.0F);
    const float expectedTop = centerY - (height / 2.0F);

    EXPECT_NEAR(detection.box.x, expectedLeft, 1e-2F);
    EXPECT_NEAR(detection.box.y, expectedTop, 1e-2F);
    EXPECT_NEAR(detection.box.width, width, 1e-2F);
    EXPECT_NEAR(detection.box.height, height, 1e-2F);
}

TEST(PostprocessTest, LowConfidenceBoxIsFilteredByThreshold) {
    // Every untouched cell in a zeroed tensor scores the same:
    // sigmoid(0) * (1/kNumClasses) = 0.5 * 0.05 = 0.025 — that's the
    // "background" every other assertion in this file relies on staying
    // below its thresholds. This box is deliberately set apart from that
    // background (score ~0.376, computed from the same formulas as
    // DecodesASingleConfidentBoxWithExpectedGeometry above) so a threshold
    // between the two isolates exactly it, and a threshold above both
    // filters everything.
    auto raw = zeroedOutput();
    writeBox(raw, 0, 0, 0, 0.0F, 0.0F, 0.0F, 0.0F, 1.0F, 0, 3.0F);

    const auto strict =
        decodeTinyYolov2Output(raw, imaging::Dimensions{kInputSize, kInputSize}, 0.5F);
    EXPECT_TRUE(strict.empty());

    const auto lenient =
        decodeTinyYolov2Output(raw, imaging::Dimensions{kInputSize, kInputSize}, 0.1F);
    EXPECT_EQ(lenient.size(), 1U);
}

TEST(PostprocessTest, CoordinatesAreRemappedToOriginalImageSize) {
    auto raw = zeroedOutput();
    // Dead-center cell/box so the box comfortably avoids edge clamping, then
    // scale into a much larger "original" image and check the ratio holds.
    writeBox(raw, 6, 6, 0, 0.0F, 0.0F, 0.0F, 0.0F, 10.0F, 0, 10.0F);

    const imaging::Dimensions original416{kInputSize, kInputSize};
    const imaging::Dimensions original832{kInputSize * 2, kInputSize * 2};

    const auto atModelScale = decodeTinyYolov2Output(raw, original416, 0.5F);
    const auto atDoubleScale = decodeTinyYolov2Output(raw, original832, 0.5F);
    ASSERT_EQ(atModelScale.size(), 1U);
    ASSERT_EQ(atDoubleScale.size(), 1U);

    EXPECT_NEAR(atDoubleScale.front().box.x, atModelScale.front().box.x * 2.0F, 1e-2F);
    EXPECT_NEAR(atDoubleScale.front().box.y, atModelScale.front().box.y * 2.0F, 1e-2F);
    EXPECT_NEAR(atDoubleScale.front().box.width, atModelScale.front().box.width * 2.0F, 1e-2F);
    EXPECT_NEAR(atDoubleScale.front().box.height, atModelScale.front().box.height * 2.0F, 1e-2F);
}

TEST(PostprocessTest, BoxesAreClampedToImageBounds) {
    auto raw = zeroedOutput();
    // Top-left cell with a huge box (large tw/th) pushes the box well past
    // (0,0) and past the image's far edge.
    writeBox(raw, 0, 0, 0, 0.0F, 0.0F, 5.0F, 5.0F, 10.0F, 0, 10.0F);

    const auto detections =
        decodeTinyYolov2Output(raw, imaging::Dimensions{kInputSize, kInputSize}, 0.5F);
    ASSERT_EQ(detections.size(), 1U);
    const auto& box = detections.front().box;

    EXPECT_GE(box.x, 0.0F);
    EXPECT_GE(box.y, 0.0F);
    EXPECT_LE(box.x + box.width, static_cast<float>(kInputSize) + 1e-2F);
    EXPECT_LE(box.y + box.height, static_cast<float>(kInputSize) + 1e-2F);
}

}  // namespace
}  // namespace visionserve::inference
