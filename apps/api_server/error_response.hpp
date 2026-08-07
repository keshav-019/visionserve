#pragma once

#include <drogon/HttpResponse.h>
#include <json/json.h>

#include <string>
#include <string_view>

#include "visionserve/errors/error_code.hpp"

namespace visionserve::api {

// HTTP-specific adapter over visionserve::errors::ErrorCode: builds the
// standard response shape from the roadmap (Phase 2):
//   {"request_id": "req_...", "error": {"code": "...", "message": "...", "details": {}}}
drogon::HttpResponsePtr makeErrorResponse(
    const std::string& requestId, drogon::HttpStatusCode status, errors::ErrorCode code,
    std::string_view message, const Json::Value& details = Json::Value{Json::objectValue});

}  // namespace visionserve::api
