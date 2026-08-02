#include "image_endpoints.hpp"

#include <drogon/HttpAppFramework.h>
#include <drogon/MultiPart.h>

#include <cmath>
#include <cstdint>
#include <functional>
#include <opencv2/core.hpp>
#include <opencv2/imgcodecs.hpp>
#include <opencv2/imgproc.hpp>
#include <optional>
#include <string>
#include <vector>

#include "error_response.hpp"
#include "image_validation.hpp"
#include "request_context.hpp"
#include "timing.hpp"

namespace visionserve::api {
namespace {

using drogon::HttpRequestPtr;
using drogon::HttpResponsePtr;
using ResponseCallback = std::function<void(const HttpResponsePtr&)>;

struct UploadedImage {
    std::string_view content;
    std::string filename;
    std::string_view format;
};

// Shared across all four endpoints: parses the multipart body, extracts the
// first file part, and rejects malformed/missing/oversized/unrecognized
// uploads with a structured error. Returns nullopt after already invoking
// `callback` with that error; the caller should return immediately in that
// case.
std::optional<UploadedImage> extractUploadedImage(const HttpRequestPtr& req,
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
    const auto format = detectImageFormat(content);
    if (!format) {
        callback(makeErrorResponse(requestId, drogon::k415UnsupportedMediaType,
                                   ErrorCode::UnsupportedMediaType,
                                   "file is not a recognized image format (jpeg, png, bmp, webp)"));
        return std::nullopt;
    }
    return UploadedImage{content, file.getFileName(), *format};
}

struct DecodedImage {
    cv::Mat mat;
    double decodeMs;
};

// Decodes the uploaded bytes and enforces the pixel-count limit. Like
// extractUploadedImage(), returns nullopt after already responding with a
// structured error.
std::optional<DecodedImage> decodeUploadedImage(const UploadedImage& uploaded,
                                                const std::string& requestId,
                                                const ResponseCallback& callback) {
    Stopwatch watch;
    std::vector<uchar> buffer(uploaded.content.begin(), uploaded.content.end());
    cv::Mat image = cv::imdecode(buffer, cv::IMREAD_UNCHANGED);
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

std::optional<std::string> parseOutputFormat(drogon::MultiPartParser& parser,
                                             const std::string& requestId,
                                             const ResponseCallback& callback) {
    auto format = parser.getOptionalParameter<std::string>("format").value_or(std::string{"jpg"});
    if (format != "jpg" && format != "jpeg" && format != "png") {
        callback(makeErrorResponse(requestId, drogon::k400BadRequest, ErrorCode::InvalidRequest,
                                   "format must be 'jpg' or 'png'"));
        return std::nullopt;
    }
    return format;
}

// Encodes `mat` and responds with the raw image bytes (not JSON) — the most
// direct representation for a resize/grayscale result. Timing and output
// dimensions travel as response headers so the body stays pure image data.
void respondWithImage(const ResponseCallback& callback, const cv::Mat& mat,
                      const std::string& outputFormat, double decodeMs,
                      std::string_view processHeaderName, double processMs) {
    const bool png = (outputFormat == "png");

    Stopwatch encodeWatch;
    std::vector<uchar> encoded;
    cv::imencode(png ? ".png" : ".jpg", mat, encoded);
    const double encodeMs = encodeWatch.elapsedMs();

    auto resp = drogon::HttpResponse::newHttpResponse();
    resp->setStatusCode(drogon::k200OK);
    resp->setContentTypeCode(png ? drogon::CT_IMAGE_PNG : drogon::CT_IMAGE_JPG);
    resp->setBody(std::string(reinterpret_cast<const char*>(encoded.data()), encoded.size()));
    resp->addHeader("X-Output-Width", std::to_string(mat.cols));
    resp->addHeader("X-Output-Height", std::to_string(mat.rows));
    resp->addHeader("X-Decode-Time-Ms", std::to_string(decodeMs));
    resp->addHeader(std::string{processHeaderName}, std::to_string(processMs));
    resp->addHeader("X-Encode-Time-Ms", std::to_string(encodeMs));
    callback(resp);
}

void handleMetadata(const HttpRequestPtr& req, ResponseCallback&& callback) {
    const auto requestId = requestIdFor(req);
    Stopwatch total;

    drogon::MultiPartParser parser;
    auto uploaded = extractUploadedImage(req, parser, requestId, callback);
    if (!uploaded) {
        return;
    }
    auto decoded = decodeUploadedImage(*uploaded, requestId, callback);
    if (!decoded) {
        return;
    }

    Json::Value body;
    body["request_id"] = requestId;
    body["filename"] = uploaded->filename;
    body["format"] = std::string{uploaded->format};
    body["width"] = decoded->mat.cols;
    body["height"] = decoded->mat.rows;
    body["channels"] = decoded->mat.channels();
    body["file_size_bytes"] = static_cast<Json::UInt64>(uploaded->content.size());
    body["timing"]["decode_ms"] = decoded->decodeMs;
    body["timing"]["total_ms"] = total.elapsedMs();

    callback(drogon::HttpResponse::newHttpJsonResponse(body));
}

void handleValidate(const HttpRequestPtr& req, ResponseCallback&& callback) {
    const auto requestId = requestIdFor(req);

    // Deliberately not using extractUploadedImage(): a bad file signature or
    // failed decode is exactly what this endpoint exists to report, so those
    // become a 200 {"valid": false} result rather than a 4xx error. Malformed
    // requests (unparseable body, no file, oversized upload) are still hard
    // errors — those are about the request, not the image.
    drogon::MultiPartParser parser;
    if (parser.parse(req) != 0) {
        callback(makeErrorResponse(requestId, drogon::k400BadRequest, ErrorCode::InvalidRequest,
                                   "could not parse multipart/form-data body"));
        return;
    }
    const auto& files = parser.getFiles();
    if (files.empty()) {
        callback(makeErrorResponse(requestId, drogon::k400BadRequest, ErrorCode::MissingFile,
                                   "expected a file part named 'file'"));
        return;
    }
    const auto& file = files.front();
    if (file.fileLength() > maxUploadBytes()) {
        callback(makeErrorResponse(requestId, drogon::k413RequestEntityTooLarge,
                                   ErrorCode::FileTooLarge,
                                   "uploaded file exceeds the maximum allowed size (" +
                                       std::to_string(maxUploadBytes()) + " bytes)"));
        return;
    }

    Json::Value body;
    body["request_id"] = requestId;

    const auto content = file.fileContent();
    const auto format = detectImageFormat(content);
    if (!format) {
        body["valid"] = false;
        body["reason"] = "unsupported_format";
        callback(drogon::HttpResponse::newHttpJsonResponse(body));
        return;
    }

    Stopwatch decodeWatch;
    std::vector<uchar> buffer(content.begin(), content.end());
    cv::Mat image = cv::imdecode(buffer, cv::IMREAD_UNCHANGED);
    body["timing"]["decode_ms"] = decodeWatch.elapsedMs();

    if (image.empty()) {
        body["valid"] = false;
        body["reason"] = "decode_failed";
        callback(drogon::HttpResponse::newHttpJsonResponse(body));
        return;
    }

    const auto pixelCount =
        static_cast<std::uint64_t>(image.cols) * static_cast<std::uint64_t>(image.rows);
    if (pixelCount > maxImagePixels()) {
        body["valid"] = false;
        body["reason"] = "pixel_limit_exceeded";
        callback(drogon::HttpResponse::newHttpJsonResponse(body));
        return;
    }

    body["valid"] = true;
    body["reason"] = Json::Value{Json::nullValue};
    body["format"] = std::string{*format};
    body["width"] = image.cols;
    body["height"] = image.rows;
    callback(drogon::HttpResponse::newHttpJsonResponse(body));
}

void handleResize(const HttpRequestPtr& req, ResponseCallback&& callback) {
    const auto requestId = requestIdFor(req);

    drogon::MultiPartParser parser;
    auto uploaded = extractUploadedImage(req, parser, requestId, callback);
    if (!uploaded) {
        return;
    }

    const auto widthParam = parser.getOptionalParameter<int>("width");
    const auto heightParam = parser.getOptionalParameter<int>("height");
    if (!widthParam && !heightParam) {
        callback(makeErrorResponse(requestId, drogon::k400BadRequest, ErrorCode::InvalidRequest,
                                   "resize requires a 'width' and/or 'height' form field"));
        return;
    }
    const auto outputFormat = parseOutputFormat(parser, requestId, callback);
    if (!outputFormat) {
        return;
    }

    auto decoded = decodeUploadedImage(*uploaded, requestId, callback);
    if (!decoded) {
        return;
    }

    int targetWidth = decoded->mat.cols;
    int targetHeight = decoded->mat.rows;
    if (widthParam && heightParam) {
        targetWidth = *widthParam;
        targetHeight = *heightParam;
    } else if (widthParam) {
        targetWidth = *widthParam;
        targetHeight = static_cast<int>(
            std::llround(static_cast<double>(decoded->mat.rows) * targetWidth / decoded->mat.cols));
    } else {
        targetHeight = *heightParam;
        targetWidth = static_cast<int>(std::llround(static_cast<double>(decoded->mat.cols) *
                                                    targetHeight / decoded->mat.rows));
    }
    if (targetWidth <= 0 || targetHeight <= 0) {
        callback(makeErrorResponse(requestId, drogon::k400BadRequest, ErrorCode::InvalidRequest,
                                   "width/height must be positive integers"));
        return;
    }

    Stopwatch resizeWatch;
    cv::Mat resized;
    cv::resize(decoded->mat, resized, cv::Size(targetWidth, targetHeight), 0, 0, cv::INTER_AREA);
    const double resizeMs = resizeWatch.elapsedMs();

    respondWithImage(callback, resized, *outputFormat, decoded->decodeMs, "X-Resize-Time-Ms",
                     resizeMs);
}

void handleGrayscale(const HttpRequestPtr& req, ResponseCallback&& callback) {
    const auto requestId = requestIdFor(req);

    drogon::MultiPartParser parser;
    auto uploaded = extractUploadedImage(req, parser, requestId, callback);
    if (!uploaded) {
        return;
    }
    const auto outputFormat = parseOutputFormat(parser, requestId, callback);
    if (!outputFormat) {
        return;
    }
    auto decoded = decodeUploadedImage(*uploaded, requestId, callback);
    if (!decoded) {
        return;
    }

    Stopwatch convertWatch;
    cv::Mat gray;
    switch (decoded->mat.channels()) {
        case 1:
            gray = decoded->mat;
            break;
        case 4:
            cv::cvtColor(decoded->mat, gray, cv::COLOR_BGRA2GRAY);
            break;
        default:
            cv::cvtColor(decoded->mat, gray, cv::COLOR_BGR2GRAY);
            break;
    }
    const double convertMs = convertWatch.elapsedMs();

    respondWithImage(callback, gray, *outputFormat, decoded->decodeMs, "X-Convert-Time-Ms",
                     convertMs);
}

// Wraps a handler so an unexpected exception (e.g. OpenCV throwing on a
// pathological-but-signature-valid input) becomes our structured 500 instead
// of crashing the process or falling through to Drogon's default error page.
// `callback` is copied (not moved) into the try block so it's still valid and
// callable from the catch blocks.
using Handler = std::function<void(const HttpRequestPtr&, ResponseCallback&&)>;

Handler makeSafe(Handler handler) {
    return [handler = std::move(handler)](const HttpRequestPtr& req, ResponseCallback&& callback) {
        const auto requestId = requestIdFor(req);
        try {
            handler(req, ResponseCallback{callback});
        } catch (const std::exception& e) {
            callback(makeErrorResponse(requestId, drogon::k500InternalServerError,
                                       ErrorCode::InternalError,
                                       std::string{"unexpected error: "} + e.what()));
        } catch (...) {
            callback(makeErrorResponse(requestId, drogon::k500InternalServerError,
                                       ErrorCode::InternalError, "unexpected error"));
        }
    };
}

}  // namespace

void registerImageEndpoints() {
    drogon::app().registerHandler("/images/metadata", makeSafe(&handleMetadata), {drogon::Post});
    drogon::app().registerHandler("/images/resize", makeSafe(&handleResize), {drogon::Post});
    drogon::app().registerHandler("/images/grayscale", makeSafe(&handleGrayscale), {drogon::Post});
    drogon::app().registerHandler("/images/validate", makeSafe(&handleValidate), {drogon::Post});
}

}  // namespace visionserve::api
