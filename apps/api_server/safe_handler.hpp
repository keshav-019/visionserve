#pragma once

#include <drogon/HttpRequest.h>

#include <functional>
#include <string>
#include <utility>

#include "error_response.hpp"
#include "request_context.hpp"
#include "upload_pipeline.hpp"
#include "visionserve/errors/error_code.hpp"

namespace visionserve::api {

using Handler = std::function<void(const drogon::HttpRequestPtr&, ResponseCallback&&)>;

// Wraps a handler so an unexpected exception (e.g. OpenCV or ONNX Runtime
// throwing on a pathological-but-valid-looking input) becomes our structured
// 500 instead of crashing the process or falling through to Drogon's default
// error page. `callback` is copied (not moved) into the try block so it's
// still valid and callable from the catch blocks.
inline Handler makeSafe(Handler handler) {
    return [handler = std::move(handler)](const drogon::HttpRequestPtr& req, ResponseCallback&& callback) {
        const auto requestId = requestIdFor(req);
        try {
            handler(req, ResponseCallback{callback});
        } catch (const std::exception& e) {
            callback(makeErrorResponse(requestId, drogon::k500InternalServerError,
                                       errors::ErrorCode::InternalError,
                                       std::string{"unexpected error: "} + e.what()));
        } catch (...) {
            callback(makeErrorResponse(requestId, drogon::k500InternalServerError,
                                       errors::ErrorCode::InternalError, "unexpected error"));
        }
    };
}

}  // namespace visionserve::api
