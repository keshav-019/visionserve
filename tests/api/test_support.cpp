#include "test_support.hpp"

#include <drogon/HttpAppFramework.h>
#include <gtest/gtest.h>
#include <trantor/net/EventLoopThread.h>

#include <chrono>
#include <opencv2/imgcodecs.hpp>
#include <thread>

#include "app_setup.hpp"

namespace visionserve::api::testing_support {
namespace {

using namespace std::chrono_literals;

std::thread g_serverThread;
// HttpClient's synchronous sendRequest() refuses to run on its own loop's
// thread (it would deadlock waiting on itself), so it needs a loop distinct
// from both the test's main thread and the server's own loop thread.
trantor::EventLoopThread g_clientLoopThread;
drogon::HttpClientPtr g_client;

// Runs the real app (real routing, real advices — not handler functions
// called directly) on a background thread for the whole test binary, and a
// single HttpClient pointed at it for every test case across every
// *_test.cpp file linked into this target.
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

// Registering via a namespace-scope initializer (rather than from main())
// keeps every *_test.cpp file in this target free of its own main() —
// AddGlobalTestEnvironment only needs to run before RUN_ALL_TESTS(), not
// before InitGoogleTest().
[[maybe_unused]] ::testing::Environment* const kEnvironment =
    ::testing::AddGlobalTestEnvironment(new ApiServerEnvironment());

}  // namespace

drogon::HttpClientPtr client() {
    return g_client;
}

std::vector<uchar> makeSyntheticJpeg(int width, int height) {
    cv::Mat image(height, width, CV_8UC3, cv::Scalar(20, 120, 220));
    std::vector<uchar> encoded;
    cv::imencode(".jpg", image, encoded);
    return encoded;
}

drogon::HttpResponsePtr postFile(const std::string& path, const std::vector<uchar>& bytes,
                                 const std::string& fileName,
                                 const std::vector<std::pair<std::string, std::string>>& params) {
    std::vector<drogon::UploadFile> files;
    files.emplace_back(bytes.data(), bytes.size(), fileName);
    auto req = drogon::HttpRequest::newFileUploadRequest(files);
    req->setPath(path);
    for (const auto& [key, value] : params) {
        req->setParameter(key, value);
    }
    auto [result, resp] = g_client->sendRequest(req, 5.0);
    EXPECT_EQ(result, drogon::ReqResult::Ok);
    return resp;
}

}  // namespace visionserve::api::testing_support
