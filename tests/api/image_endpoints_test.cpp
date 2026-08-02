#include <drogon/HttpAppFramework.h>
#include <drogon/HttpClient.h>
#include <gtest/gtest.h>
#include <trantor/net/EventLoopThread.h>

#include <chrono>
#include <cstdint>
#include <opencv2/core.hpp>
#include <opencv2/imgcodecs.hpp>
#include <string>
#include <thread>
#include <utility>
#include <vector>

#include "app_setup.hpp"

namespace {

using namespace std::chrono_literals;

// gtest_discover_tests() runs each TEST() below as its own process invocation
// (via --gtest_filter), each binding this same fixed port — fine as long as
// ctest runs them serially (the default, and what CI does). Parallelizing
// this binary's tests (ctest -j) would need an ephemeral/PID-derived port
// instead.
constexpr std::uint16_t kTestPort = 18099;

std::thread g_serverThread;
// HttpClient's synchronous sendRequest() refuses to run on its own loop's
// thread (it would deadlock waiting on itself), so it needs a loop distinct
// from both the test's main thread and the server's own loop thread.
trantor::EventLoopThread g_clientLoopThread;
drogon::HttpClientPtr g_client;

std::vector<uchar> makeSyntheticJpeg(int width = 64, int height = 48) {
    cv::Mat image(height, width, CV_8UC3, cv::Scalar(20, 120, 220));
    std::vector<uchar> encoded;
    cv::imencode(".jpg", image, encoded);
    return encoded;
}

// Runs the real app (real routing, real advices — not handler functions
// called directly) on a background thread for the whole test binary, and a
// single HttpClient pointed at it for every test case.
class ApiServerEnvironment : public ::testing::Environment {
   public:
    void SetUp() override {
        visionserve::api::configureVisionServeApp();
        g_serverThread = std::thread(
            [] { drogon::app().addListener("127.0.0.1", kTestPort).setThreadNum(1).run(); });

        g_clientLoopThread.run();
        g_client = drogon::HttpClient::newHttpClient(
            "http://127.0.0.1:" + std::to_string(kTestPort), g_clientLoopThread.getLoop());

        const auto deadline = std::chrono::steady_clock::now() + 5s;
        while (std::chrono::steady_clock::now() < deadline) {
            auto req = drogon::HttpRequest::newHttpRequest();
            req->setPath("/health");
            auto [result, resp] = g_client->sendRequest(req, 1.0);
            if (result == drogon::ReqResult::Ok && resp) {
                return;
            }
            std::this_thread::sleep_for(50ms);
        }
        FAIL() << "server did not become ready within 5s";
    }

    void TearDown() override {
        drogon::app().quit();
        if (g_serverThread.joinable()) {
            g_serverThread.join();
        }
    }
};

drogon::HttpResponsePtr postFile(
    const std::string &path, const std::vector<uchar> &bytes, const std::string &fileName,
    const std::vector<std::pair<std::string, std::string>> &params = {}) {
    std::vector<drogon::UploadFile> files;
    files.emplace_back(bytes.data(), bytes.size(), fileName);
    auto req = drogon::HttpRequest::newFileUploadRequest(files);
    req->setPath(path);
    for (const auto &[key, value] : params) {
        req->setParameter(key, value);
    }
    auto [result, resp] = g_client->sendRequest(req, 5.0);
    EXPECT_EQ(result, drogon::ReqResult::Ok);
    return resp;
}

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
    auto [result, resp] = g_client->sendRequest(req, 5.0);
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
    auto [result, resp] = g_client->sendRequest(req, 5.0);
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
    auto [result, resp] = g_client->sendRequest(req, 5.0);
    ASSERT_EQ(result, drogon::ReqResult::Ok);
    ASSERT_TRUE(resp);
    EXPECT_EQ(resp->statusCode(), drogon::k204NoContent);
    EXPECT_EQ(resp->getHeader("Access-Control-Allow-Origin"), "*");
}

}  // namespace

int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);
    ::testing::AddGlobalTestEnvironment(new ApiServerEnvironment());
    return RUN_ALL_TESTS();
}
