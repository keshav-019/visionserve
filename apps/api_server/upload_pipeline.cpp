#include "upload_pipeline.hpp"

#include <opencv2/imgcodecs.hpp>

#include "error_response.hpp"
#include "upload_limits.hpp"
#include "visionserve/common/timing.hpp"
#include "visionserve/imaging/decode.hpp"
#include "visionserve/imaging/format.hpp"

namespace visionserve::api {

using common::Stopwatch;
using errors::ErrorCode;

std::optional<UploadedImage> extractUploadedImage(const drogon::HttpRequestPtr& req,
                                                  drogon::MultiPartParser& parser,
                                                  const std::string& requestId,
                                                  const ResponseCallback& callback) {
    if (parser.parse(req) != 0) {
        callback(makeErrorResponse(requestId, drogon::k400BadRequest, ErrorCode::InvalidRequest,
                                   "could not parse multipart/form-data body"));
        return std::nullopt;
    }
    const auto& files = parser.getFiles();
    if (files.empty()) {
        callback(makeErrorResponse(requestId, drogon::k400BadRequest, ErrorCode::MissingFile,
                                   "expected a file part named 'file'"));
        return std::nullopt;
    }
    const auto& file = files.front();
    if (file.fileLength() > maxUploadBytes()) {
        callback(makeErrorResponse(requestId, drogon::k413RequestEntityTooLarge,
                                   ErrorCode::FileTooLarge,
                                   "uploaded file exceeds the maximum allowed size (" +
                                       std::to_string(maxUploadBytes()) + " bytes)"));
        return std::nullopt;
    }

    const auto content = file.fileContent();
    const auto format = imaging::detectFormat(content);
    if (!format) {
        callback(makeErrorResponse(requestId, drogon::k415UnsupportedMediaType,
                                   ErrorCode::UnsupportedMediaType,
                                   "file is not a recognized image format (jpeg, png, bmp, webp)"));
        return std::nullopt;
    }
    return UploadedImage{content, file.getFileName(), *format};
}

std::optional<DecodedImage> decodeUploadedImage(const UploadedImage& uploaded,
                                                const std::string& requestId,
                                                const ResponseCallback& callback) {
    Stopwatch watch;
    cv::Mat image = imaging::decode(uploaded.content);
    const double decodeMs = watch.elapsedMs();

    if (image.empty()) {
        callback(makeErrorResponse(requestId, drogon::k400BadRequest, ErrorCode::InvalidImage,
                                   "could not decode image"));
        return std::nullopt;
    }

    const auto pixelCount =
        static_cast<std::uint64_t>(image.cols) * static_cast<std::uint64_t>(image.rows);
    if (pixelCount > maxImagePixels()) {
        callback(makeErrorResponse(requestId, drogon::k400BadRequest, ErrorCode::PixelLimitExceeded,
                                   "decoded image exceeds the maximum allowed pixel count (" +
                                       std::to_string(maxImagePixels()) + ")"));
        return std::nullopt;
    }
    return DecodedImage{std::move(image), decodeMs};
}

}  // namespace visionserve::api
