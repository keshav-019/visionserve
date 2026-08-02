#pragma once

#include <drogon/HttpResponse.h>
#include <json/json.h>

#include <string>
#include <string_view>

namespace visionserve::api {

// Mirrors the standard error response shape from the roadmap (Phase 2):
//   {"request_id": "req_...", "error": {"code": "...", "message": "...", "details": {}}}
enum class ErrorCode {
    InvalidRequest,        // malformed request: bad multipart body, bad parameters
    MissingFile,           // no file part in the upload
    UnsupportedMediaType,  // declared/detected type isn't an allowed image format
    FileTooLarge,          // upload exceeds the configured per-file limit
    PixelLimitExceeded,    // decoded image exceeds the configured pixel-count limit
    InvalidImage,          // file signature or OpenCV decode failed
    InternalError,         // anything unexpected; never crash the process
};

std::string_view errorCodeName(ErrorCode code);

drogon::HttpResponsePtr makeErrorResponse(
    const std::string& requestId, drogon::HttpStatusCode status, ErrorCode code,
    std::string_view message, const Json::Value& details = Json::Value{Json::objectValue});

}  // namespace visionserve::api
