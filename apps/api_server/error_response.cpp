#include "error_response.hpp"

namespace visionserve::api {

drogon::HttpResponsePtr makeErrorResponse(const std::string& requestId,
                                          drogon::HttpStatusCode status, errors::ErrorCode code,
                                          std::string_view message, const Json::Value& details) {
    Json::Value body;
    body["request_id"] = requestId;
    body["error"]["code"] = std::string{errors::errorCodeName(code)};
    body["error"]["message"] = std::string{message};
    body["error"]["details"] = details;

    auto resp = drogon::HttpResponse::newHttpJsonResponse(body);
    resp->setStatusCode(status);
    return resp;
}

}  // namespace visionserve::api
