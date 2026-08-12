#include "image_endpoints.hpp"

#include <drogon/HttpAppFramework.h>
#include <drogon/MultiPart.h>

#include <functional>
#include <opencv2/core.hpp>
#include <opencv2/imgcodecs.hpp>
#include <optional>
#include <string>
#include <vector>

#include "error_response.hpp"
#include "request_context.hpp"
#include "safe_handler.hpp"
#include "upload_limits.hpp"
#include "upload_pipeline.hpp"
#include "visionserve/common/timing.hpp"
#include "visionserve/imaging/decode.hpp"
#include "visionserve/imaging/format.hpp"
#include "visionserve/imaging/grayscale.hpp"
#include "visionserve/imaging/resize.hpp"

namespace visionserve::api {
namespace {

using drogon::HttpRequestPtr;
using drogon::HttpResponsePtr;
using common::Stopwatch;
using errors::ErrorCode;

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
    const auto format = imaging::detectFormat(content);
    if (!format) {
        body["valid"] = false;
        body["reason"] = "unsupported_format";
        callback(drogon::HttpResponse::newHttpJsonResponse(body));
        return;
    }

    Stopwatch decodeWatch;
    cv::Mat image = imaging::decode(content);
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

    const auto target = imaging::computeResizeDimensions({decoded->mat.cols, decoded->mat.rows},
                                                         widthParam, heightParam);
    if (!target) {
        callback(makeErrorResponse(requestId, drogon::k400BadRequest, ErrorCode::InvalidRequest,
                                   "width/height must be positive integers"));
        return;
    }

    Stopwatch resizeWatch;
    const cv::Mat resized = imaging::resize(decoded->mat, *target);
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
    const cv::Mat gray = imaging::toGrayscale(decoded->mat);
    const double convertMs = convertWatch.elapsedMs();

    respondWithImage(callback, gray, *outputFormat, decoded->decodeMs, "X-Convert-Time-Ms",
                     convertMs);
}

}  // namespace

void registerImageEndpoints() {
    drogon::app().registerHandler("/images/metadata", makeSafe(&handleMetadata), {drogon::Post});
    drogon::app().registerHandler("/images/resize", makeSafe(&handleResize), {drogon::Post});
    drogon::app().registerHandler("/images/grayscale", makeSafe(&handleGrayscale), {drogon::Post});
    drogon::app().registerHandler("/images/validate", makeSafe(&handleValidate), {drogon::Post});
}

}  // namespace visionserve::api
