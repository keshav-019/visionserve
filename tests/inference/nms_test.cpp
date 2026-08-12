#include "visionserve/inference/nms.hpp"

#include <gtest/gtest.h>

namespace visionserve::inference {
namespace {

Detection makeDetection(int classId, float confidence, BoundingBox box) {
    Detection detection;
    detection.classId = classId;
    detection.label = "test";
    detection.confidence = confidence;
    detection.box = box;
    return detection;
}

TEST(NmsTest, SuppressesLowerConfidenceOverlapOfSameClass) {
    std::vector<Detection> detections{
        makeDetection(0, 0.9F, BoundingBox{0.0F, 0.0F, 10.0F, 10.0F}),
        makeDetection(0, 0.6F, BoundingBox{1.0F, 1.0F, 10.0F, 10.0F}),  // heavy overlap, same class
    };
    const auto result = nonMaxSuppression(std::move(detections), 0.5F, 100);
    ASSERT_EQ(result.size(), 1U);
    EXPECT_FLOAT_EQ(result.front().confidence, 0.9F);
}

TEST(NmsTest, KeepsOverlappingBoxesOfDifferentClasses) {
    std::vector<Detection> detections{
        makeDetection(0, 0.9F, BoundingBox{0.0F, 0.0F, 10.0F, 10.0F}),
        makeDetection(1, 0.8F,
                      BoundingBox{0.0F, 0.0F, 10.0F, 10.0F}),  // identical box, different class
    };
    const auto result = nonMaxSuppression(std::move(detections), 0.5F, 100);
    EXPECT_EQ(result.size(), 2U);
}

TEST(NmsTest, KeepsNonOverlappingBoxesOfSameClass) {
    std::vector<Detection> detections{
        makeDetection(0, 0.9F, BoundingBox{0.0F, 0.0F, 10.0F, 10.0F}),
        makeDetection(0, 0.8F, BoundingBox{100.0F, 100.0F, 10.0F, 10.0F}),
    };
    const auto result = nonMaxSuppression(std::move(detections), 0.5F, 100);
    EXPECT_EQ(result.size(), 2U);
}

TEST(NmsTest, TruncatesToMaxDetectionsHighestConfidenceFirst) {
    std::vector<Detection> detections{
        makeDetection(0, 0.5F, BoundingBox{0.0F, 0.0F, 1.0F, 1.0F}),
        makeDetection(1, 0.9F, BoundingBox{50.0F, 50.0F, 1.0F, 1.0F}),
        makeDetection(2, 0.7F, BoundingBox{100.0F, 100.0F, 1.0F, 1.0F}),
    };
    const auto result = nonMaxSuppression(std::move(detections), 0.5F, 2);
    ASSERT_EQ(result.size(), 2U);
    EXPECT_FLOAT_EQ(result[0].confidence, 0.9F);
    EXPECT_FLOAT_EQ(result[1].confidence, 0.7F);
}

TEST(NmsTest, EmptyInputYieldsEmptyOutput) {
    const auto result = nonMaxSuppression({}, 0.5F, 100);
    EXPECT_TRUE(result.empty());
}

}  // namespace
}  // namespace visionserve::inference
