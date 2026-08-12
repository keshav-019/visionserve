#pragma once

#include <drogon/HttpRequest.h>
#include <drogon/HttpResponse.h>
#include <drogon/MultiPart.h>

#include <functional>
#include <opencv2/core.hpp>
#include <optional>
#include <string>
#include <string_view>

namespace visionserve::api {

using ResponseCallback = std::function<void(const drogon::HttpResponsePtr&)>;

struct UploadedImage {
    std::string_view content;
    std::string filename;
    std::string_view format;
};

struct DecodedImage {
    cv::Mat mat;
    double decodeMs;
};

// Shared by every endpoint that accepts an image upload (images/* and
// v1/detect): parses the multipart body, extracts the first file part, and
// rejects malformed/missing/oversized/unrecognized uploads with a structured
// error. Returns nullopt after already invoking `callback` with that error;
// the caller should return immediately in that case.
std::optional<UploadedImage> extractUploadedImage(const drogon::HttpRequestPtr& req,
                                                  drogon::MultiPartParser& parser,
                                                  const std::string& requestId,
                                                  const ResponseCallback& callback);

// Decodes the uploaded bytes and enforces the pixel-count limit. Like
// extractUploadedImage(), returns nullopt after already responding with a
// structured error.
std::optional<DecodedImage> decodeUploadedImage(const UploadedImage& uploaded,
                                                const std::string& requestId,
                                                const ResponseCallback& callback);

}  // namespace visionserve::api
