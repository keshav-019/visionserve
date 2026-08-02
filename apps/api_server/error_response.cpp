#include "error_response.hpp"

namespace visionserve::api {

std::string_view errorCodeName(ErrorCode code) {
    switch (code) {
        case ErrorCode::InvalidRequest:
            return "INVALID_REQUEST";
        case ErrorCode::MissingFile:
            return "MISSING_FILE";
        case ErrorCode::UnsupportedMediaType:
            return "UNSUPPORTED_MEDIA_TYPE";
        case ErrorCode::FileTooLarge:
            return "FILE_TOO_LARGE";
        case ErrorCode::PixelLimitExceeded:
            return "PIXEL_LIMIT_EXCEEDED";
        case ErrorCode::InvalidImage:
            return "INVALID_IMAGE";
        case ErrorCode::InternalError:
            return "INTERNAL_ERROR";
    }
    return "UNKNOWN_ERROR";
}

drogon::HttpResponsePtr makeErrorResponse(const std::string& requestId,
                                          drogon::HttpStatusCode status, ErrorCode code,
                                          std::string_view message, const Json::Value& details) {
    Json::Value body;
    body["request_id"] = requestId;
    body["error"]["code"] = std::string{errorCodeName(code)};
    body["error"]["message"] = std::string{message};
    body["error"]["details"] = details;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(body);
    resp->setStatusCode(status);
    return resp;
}

}  // namespace visionserve::api
