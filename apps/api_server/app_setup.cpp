#include "app_setup.hpp"

#include <drogon/HttpAppFramework.h>
#include <drogon/HttpResponse.h>

#include <algorithm>
#include <chrono>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

#include "image_endpoints.hpp"
#include "request_context.hpp"
#include "upload_limits.hpp"
#include "visionserve/common/timing.hpp"
#include "visionserve/config/env.hpp"
#include "visionserve/telemetry/logger.hpp"

namespace visionserve::api {
namespace {

constexpr std::string_view kServiceName{"visionserve-api"};
constexpr std::string_view kVersion{"0.1.0"};

const auto kStartTime = std::chrono::steady_clock::now();

Json::Value makeStatusBody(std::string_view status) {
    Json::Value body;
    body["status"] = std::string{status};
    body["service"] = std::string{kServiceName};
    body["version"] = std::string{kVersion};
    return body;
}

// Comma-separated list of allowed browser origins for the web/ frontend, e.g.
// "https://visionserve.vercel.app,http://localhost:8080". Defaults to "*" (open) so the
// local dev server and preview deployments work out of the box; tighten this in production
// via the VISIONSERVE_CORS_ORIGINS environment variable (see Phase 21 security hardening).
const std::vector<std::string> &allowedOrigins() {
    static const std::vector<std::string> origins =
        config::getEnvListOr("VISIONSERVE_CORS_ORIGINS", {"*"});
    return origins;
}

std::optional<std::string> resolveAllowedOrigin(const std::string &requestOrigin) {
    const auto &origins = allowedOrigins();
    if (std::find(origins.begin(), origins.end(), "*") != origins.end()) {
        return "*";
    }
    if (requestOrigin.empty()) {
        return std::nullopt;
    }
    if (std::find(origins.begin(), origins.end(), requestOrigin) != origins.end()) {
        return requestOrigin;
    }
    return std::nullopt;
}

void applyCorsHeaders(const drogon::HttpRequestPtr &req, const drogon::HttpResponsePtr &resp) {
    const auto origin = resolveAllowedOrigin(req->getHeader("Origin"));
    if (!origin) {
        return;
    }
    resp->addHeader("Access-Control-Allow-Origin", *origin);
    if (*origin != "*") {
        resp->addHeader("Vary", "Origin");
    }
}

void registerCors() {
    drogon::app().registerPreRoutingAdvice([](const drogon::HttpRequestPtr &req,
                                              drogon::AdviceCallback &&adviceCallback,
                                              drogon::AdviceChainCallback &&adviceChainCallback) {
        if (req->method() != drogon::Options) {
            adviceChainCallback();
            return;
        }
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k204NoContent);
        applyCorsHeaders(req, resp);
        resp->addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        resp->addHeader("Access-Control-Allow-Headers",
                        req->getHeader("Access-Control-Request-Headers").empty()
                            ? "Content-Type, Authorization"
                            : req->getHeader("Access-Control-Request-Headers"));
        adviceCallback(resp);
    });

    drogon::app().registerPostHandlingAdvice(
        [](const drogon::HttpRequestPtr &req, const drogon::HttpResponsePtr &resp) {
            applyCorsHeaders(req, resp);
        });
}

// Every request gets a "req_<uuid>" ID, generated once here before routing and
// stashed on the request's attribute store (visionserve::api::requestIdFor()
// reads it back). Also stamped onto every response as X-Request-Id so it's
// visible even for endpoints that don't echo it in a JSON body.
void registerRequestId() {
    drogon::app().registerPreRoutingAdvice([](const drogon::HttpRequestPtr &req) {
        req->attributes()->insert(std::string{kRequestIdAttribute}, generateRequestId());
    });

    drogon::app().registerPostHandlingAdvice(
        [](const drogon::HttpRequestPtr &req, const drogon::HttpResponsePtr &resp) {
            resp->addHeader("X-Request-Id", requestIdFor(req));
        });
}

// Stashes the request's arrival time in a pre-routing advice, then emits one
// structured JSON log line per completed request via visionserve::telemetry.
constexpr std::string_view kRequestStartAttribute = "visionserve_request_start";

void registerRequestLogging() {
    drogon::app().registerPreRoutingAdvice([](const drogon::HttpRequestPtr &req) {
        req->attributes()->insert(std::string{kRequestStartAttribute}, common::Stopwatch{});
    });

    drogon::app().registerPostHandlingAdvice(
        [](const drogon::HttpRequestPtr &req, const drogon::HttpResponsePtr &resp) {
            const auto &stopwatch =
                req->attributes()->get<common::Stopwatch>(std::string{kRequestStartAttribute});
            telemetry::logRequest(req->methodString(), req->path(),
                                  static_cast<int>(resp->statusCode()), requestIdFor(req),
                                  stopwatch.elapsedMs());
        });
}

void registerSystemEndpoints() {
    // GET /health — liveness: process is running.
    drogon::app().registerHandler(
        "/health",
        [](const drogon::HttpRequestPtr &,
           std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
            auto resp = drogon::HttpResponse::newHttpJsonResponse(makeStatusBody("ok"));
            callback(resp);
        },
        {drogon::Get});

    // GET /ready — readiness: process can accept inference requests.
    // No model/queue subsystems exist yet, so readiness mirrors liveness for now.
    drogon::app().registerHandler(
        "/ready",
        [](const drogon::HttpRequestPtr &,
           std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
            auto resp = drogon::HttpResponse::newHttpJsonResponse(makeStatusBody("ready"));
            callback(resp);
        },
        {drogon::Get});

    // GET /version
    drogon::app().registerHandler(
        "/version",
        [](const drogon::HttpRequestPtr &,
           std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
            Json::Value body;
            body["service"] = std::string{kServiceName};
            body["version"] = std::string{kVersion};
            const auto uptimeSeconds = std::chrono::duration_cast<std::chrono::seconds>(
                                           std::chrono::steady_clock::now() - kStartTime)
                                           .count();
            body["uptime_seconds"] = static_cast<Json::Int64>(uptimeSeconds);
            auto resp = drogon::HttpResponse::newHttpJsonResponse(body);
            callback(resp);
        },
        {drogon::Get});
}

}  // namespace

void configureVisionServeApp() {
    telemetry::initLogger();

    registerRequestId();
    registerRequestLogging();
    registerCors();
    registerSystemEndpoints();
    registerImageEndpoints();

    // A little above the per-file limit (maxUploadBytes(), 10 MiB by default) to leave
    // room for multipart boundaries/headers/form fields around the file.
    drogon::app().setClientMaxBodySize(maxUploadBytes() + (1024 * 1024));
}

}  // namespace visionserve::api
