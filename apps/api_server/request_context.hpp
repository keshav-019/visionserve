#pragma once

#include <drogon/HttpRequest.h>

#include <string>
#include <string_view>

namespace visionserve::api {

inline constexpr std::string_view kRequestIdAttribute = "visionserve_request_id";

// "req_" followed by a UUID. Generated once per request in a pre-routing
// advice (see main.cpp) and stashed on the request's attribute store so every
// handler and the CORS/logging advices can read the same value back.
std::string generateRequestId();

// Reads the request ID stashed by the pre-routing advice. Falls back to
// generating a fresh one if called before that advice ran (shouldn't happen
// in practice, but avoids ever returning an empty request_id).
std::string requestIdFor(const drogon::HttpRequestPtr& req);

}  // namespace visionserve::api
