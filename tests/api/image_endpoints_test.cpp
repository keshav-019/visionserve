#include <gtest/gtest.h>

#include <cstdint>
#include <opencv2/core.hpp>
#include <opencv2/imgcodecs.hpp>
#include <string>
#include <vector>

#include "test_support.hpp"

namespace {

using visionserve::api::testing_support::client;
using visionserve::api::testing_support::makeSyntheticJpeg;
using visionserve::api::testing_support::postFile;

TEST(ImageEndpointsTest, MetadataReturnsDimensions) {
    auto resp = postFile("/images/metadata", makeSyntheticJpeg(64, 48), "test.jpg");
    ASSERT_TRUE(resp);
    EXPECT_EQ(resp->statusCode(), drogon::k200OK);
    auto json = resp->getJsonObject();
    ASSERT_TRUE(json);
    EXPECT_EQ((*json)["width"].asInt(), 64);
    EXPECT_EQ((*json)["height"].asInt(), 48);
    EXPECT_EQ((*json)["format"].asString(), "jpeg");
    EXPECT_FALSE((*json)["request_id"].asString().empty());
}

TEST(ImageEndpointsTest, MetadataRejectsMissingFile) {
    auto req = drogon::HttpRequest::newHttpRequest();
    req->setMethod(drogon::Post);
    req->setPath("/images/metadata");
    auto [result, resp] = client()->sendRequest(req, 5.0);
    ASSERT_EQ(result, drogon::ReqResult::Ok);
    ASSERT_TRUE(resp);
    EXPECT_EQ(resp->statusCode(), drogon::k400BadRequest);
    auto json = resp->getJsonObject();
    ASSERT_TRUE(json);
    EXPECT_EQ((*json)["error"]["code"].asString(), "INVALID_REQUEST");
}

TEST(ImageEndpointsTest, MetadataRejectsUnsupportedFormat) {
    const std::vector<uchar> notAnImage{'h', 'e', 'l', 'l', 'o'};
    auto resp = postFile("/images/metadata", notAnImage, "not-an-image.txt");
    ASSERT_TRUE(resp);
    EXPECT_EQ(resp->statusCode(), drogon::k415UnsupportedMediaType);
    auto json = resp->getJsonObject();
    ASSERT_TRUE(json);
    EXPECT_EQ((*json)["error"]["code"].asString(), "UNSUPPORTED_MEDIA_TYPE");
}

TEST(ImageEndpointsTest, MetadataRejectsCorruptImageWithValidSignature) {
    std::vector<uchar> fakeJpeg{0xFF, 0xD8, 0xFF};
    for (int i = 0; i < 20; ++i) {
        fakeJpeg.push_back(static_cast<uchar>(i));
    }
    auto resp = postFile("/images/metadata", fakeJpeg, "fake.jpg");
    ASSERT_TRUE(resp);
    EXPECT_EQ(resp->statusCode(), drogon::k400BadRequest);
    auto json = resp->getJsonObject();
    ASSERT_TRUE(json);
    EXPECT_EQ((*json)["error"]["code"].asString(), "INVALID_IMAGE");
}

TEST(ImageEndpointsTest, ValidateReportsValidTrue) {
    auto resp = postFile("/images/validate", makeSyntheticJpeg(), "test.jpg");
    ASSERT_TRUE(resp);
    EXPECT_EQ(resp->statusCode(), drogon::k200OK);
    auto json = resp->getJsonObject();
    ASSERT_TRUE(json);
    EXPECT_TRUE((*json)["valid"].asBool());
}

TEST(ImageEndpointsTest, ValidateReportsValidFalseForCorruptImage) {
    std::vector<uchar> fakeJpeg{0xFF, 0xD8, 0xFF};
    for (int i = 0; i < 20; ++i) {
        fakeJpeg.push_back(static_cast<uchar>(i));
    }
    auto resp = postFile("/images/validate", fakeJpeg, "fake.jpg");
    ASSERT_TRUE(resp);
    EXPECT_EQ(resp->statusCode(), drogon::k200OK);  // validate never hard-errors on a bad image
    auto json = resp->getJsonObject();
    ASSERT_TRUE(json);
    EXPECT_FALSE((*json)["valid"].asBool());
    EXPECT_EQ((*json)["reason"].asString(), "decode_failed");
}

TEST(ImageEndpointsTest, ResizeReturnsImageBytesWithCorrectDimensions) {
    auto resp =
        postFile("/images/resize", makeSyntheticJpeg(64, 48), "test.jpg", {{"width", "32"}});
    ASSERT_TRUE(resp);
    EXPECT_EQ(resp->statusCode(), drogon::k200OK);
    EXPECT_EQ(resp->getHeader("X-Output-Width"), "32");
    EXPECT_EQ(resp->getHeader("X-Output-Height"), "24");  // aspect ratio preserved: 48*32/64

    const std::vector<uchar> body(resp->body().begin(), resp->body().end());
    const cv::Mat decoded = cv::imdecode(body, cv::IMREAD_UNCHANGED);
    ASSERT_FALSE(decoded.empty());
    EXPECT_EQ(decoded.cols, 32);
    EXPECT_EQ(decoded.rows, 24);
}

TEST(ImageEndpointsTest, ResizeRejectsMissingDimensions) {
    auto resp = postFile("/images/resize", makeSyntheticJpeg(), "test.jpg");
    ASSERT_TRUE(resp);
    EXPECT_EQ(resp->statusCode(), drogon::k400BadRequest);
}

TEST(ImageEndpointsTest, GrayscaleReturnsSingleChannelImage) {
    auto resp = postFile("/images/grayscale", makeSyntheticJpeg(64, 48), "test.jpg");
    ASSERT_TRUE(resp);
    EXPECT_EQ(resp->statusCode(), drogon::k200OK);

    const std::vector<uchar> body(resp->body().begin(), resp->body().end());
    const cv::Mat decoded = cv::imdecode(body, cv::IMREAD_UNCHANGED);
    ASSERT_FALSE(decoded.empty());
    EXPECT_EQ(decoded.channels(), 1);
}

TEST(ImageEndpointsTest, EveryResponseCarriesRequestIdHeader) {
    auto req = drogon::HttpRequest::newHttpRequest();
    req->setPath("/health");
    auto [result, resp] = client()->sendRequest(req, 5.0);
    ASSERT_EQ(result, drogon::ReqResult::Ok);
    ASSERT_TRUE(resp);
    EXPECT_FALSE(resp->getHeader("X-Request-Id").empty());
}

TEST(ImageEndpointsTest, CorsPreflightStillWorks) {
    auto req = drogon::HttpRequest::newHttpRequest();
    req->setMethod(drogon::Options);
    req->setPath("/images/metadata");
    req->addHeader("Origin", "http://localhost:8080");
    req->addHeader("Access-Control-Request-Method", "POST");
    auto [result, resp] = client()->sendRequest(req, 5.0);
    ASSERT_EQ(result, drogon::ReqResult::Ok);
    ASSERT_TRUE(resp);
    EXPECT_EQ(resp->statusCode(), drogon::k204NoContent);
    EXPECT_EQ(resp->getHeader("Access-Control-Allow-Origin"), "*");
}

}  // namespace
