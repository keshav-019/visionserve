#include <gtest/gtest.h>

#include <string>
#include <vector>

#include "test_support.hpp"

namespace {

using visionserve::api::testing_support::client;
using visionserve::api::testing_support::makeSyntheticJpeg;
using visionserve::api::testing_support::postFile;

TEST(DetectEndpointTest, ReturnsWellFormedResponseForAValidImage) {
    auto resp = postFile("/v1/detect", makeSyntheticJpeg(64, 48), "test.jpg");
    ASSERT_TRUE(resp);
    ASSERT_EQ(resp->statusCode(), drogon::k200OK);
    auto json = resp->getJsonObject();
    ASSERT_TRUE(json);
    EXPECT_FALSE((*json)["request_id"].asString().empty());
    EXPECT_FALSE((*json)["model"].asString().empty());
    EXPECT_FALSE((*json)["version"].asString().empty());
    EXPECT_TRUE((*json)["detections"].isArray());
    ASSERT_TRUE((*json).isMember("timing"));
    EXPECT_TRUE((*json)["timing"]["inference_ms"].isNumeric());
    EXPECT_TRUE((*json)["timing"]["total_ms"].isNumeric());
}

TEST(DetectEndpointTest, EachDetectionHasTheDocumentedShape) {
    // A near-zero threshold forces the raw grid to produce plenty of
    // low-confidence "detections" against a synthetic (non-photographic)
    // image, which is enough to exercise the response schema without
    // depending on the model recognizing anything real.
    auto resp = postFile("/v1/detect", makeSyntheticJpeg(64, 48), "test.jpg",
                         {{"confidence_threshold", "0.001"}});
    ASSERT_TRUE(resp);
    ASSERT_EQ(resp->statusCode(), drogon::k200OK);
    auto json = resp->getJsonObject();
    ASSERT_TRUE(json);
    const auto& detections = (*json)["detections"];
    ASSERT_GT(detections.size(), 0U);
    const auto& first = detections[0];
    EXPECT_TRUE(first["class_id"].isInt());
    EXPECT_TRUE(first["label"].isString());
    EXPECT_TRUE(first["confidence"].isNumeric());
    EXPECT_TRUE(first["box"]["x"].isNumeric());
    EXPECT_TRUE(first["box"]["y"].isNumeric());
    EXPECT_TRUE(first["box"]["width"].isNumeric());
    EXPECT_TRUE(first["box"]["height"].isNumeric());
}

TEST(DetectEndpointTest, MaxDetectionsCapsTheResultCount) {
    auto resp = postFile("/v1/detect", makeSyntheticJpeg(64, 48), "test.jpg",
                         {{"confidence_threshold", "0.001"}, {"max_detections", "3"}});
    ASSERT_TRUE(resp);
    ASSERT_EQ(resp->statusCode(), drogon::k200OK);
    auto json = resp->getJsonObject();
    ASSERT_TRUE(json);
    EXPECT_LE((*json)["detections"].size(), 3U);
}

TEST(DetectEndpointTest, IncludeTimingFalseOmitsTheTimingBlock) {
    auto resp = postFile("/v1/detect", makeSyntheticJpeg(64, 48), "test.jpg",
                         {{"include_timing", "0"}});
    ASSERT_TRUE(resp);
    ASSERT_EQ(resp->statusCode(), drogon::k200OK);
    auto json = resp->getJsonObject();
    ASSERT_TRUE(json);
    EXPECT_FALSE((*json).isMember("timing"));
}

TEST(DetectEndpointTest, OutOfRangeThresholdsAreClampedNotRejected) {
    auto resp = postFile("/v1/detect", makeSyntheticJpeg(64, 48), "test.jpg",
                         {{"confidence_threshold", "5.0"}});
    ASSERT_TRUE(resp);
    // Clamped to 1.0 rather than erroring — an out-of-range value is a
    // client misunderstanding of the scale, not a malformed request.
    EXPECT_EQ(resp->statusCode(), drogon::k200OK);
}

TEST(DetectEndpointTest, RejectsMissingFile) {
    auto req = drogon::HttpRequest::newHttpRequest();
    req->setMethod(drogon::Post);
    req->setPath("/v1/detect");
    auto [result, resp] = client()->sendRequest(req, 5.0);
    ASSERT_EQ(result, drogon::ReqResult::Ok);
    ASSERT_TRUE(resp);
    EXPECT_EQ(resp->statusCode(), drogon::k400BadRequest);
    auto json = resp->getJsonObject();
    ASSERT_TRUE(json);
    EXPECT_EQ((*json)["error"]["code"].asString(), "INVALID_REQUEST");
}

TEST(DetectEndpointTest, RejectsCorruptImage) {
    std::vector<uchar> fakeJpeg{0xFF, 0xD8, 0xFF};
    for (int i = 0; i < 20; ++i) {
        fakeJpeg.push_back(static_cast<uchar>(i));
    }
    auto resp = postFile("/v1/detect", fakeJpeg, "fake.jpg");
    ASSERT_TRUE(resp);
    EXPECT_EQ(resp->statusCode(), drogon::k400BadRequest);
    auto json = resp->getJsonObject();
    ASSERT_TRUE(json);
    EXPECT_EQ((*json)["error"]["code"].asString(), "INVALID_IMAGE");
}

}  // namespace
