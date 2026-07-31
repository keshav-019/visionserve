#include <drogon/HttpAppFramework.h>
#include <drogon/HttpResponse.h>

#include <algorithm>
#include <chrono>
#include <cstdlib>
#include <optional>
#include <sstream>
#include <string>
#include <string_view>
#include <vector>

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
std::vector<std::string> corsAllowedOrigins() {
    const char *originsEnv = std::getenv("VISIONSERVE_CORS_ORIGINS");
    if (originsEnv == nullptr || std::string_view{originsEnv}.empty()) {
        return {"*"};
    }

    std::vector<std::string> origins;
    std::stringstream stream{originsEnv};
    std::string origin;
    while (std::getline(stream, origin, ',')) {
        if (!origin.empty()) {
            origins.push_back(origin);
        }
    }
    return origins.empty() ? std::vector<std::string>{"*"} : origins;
}

const std::vector<std::string> &allowedOrigins() {
    static const std::vector<std::string> origins = corsAllowedOrigins();
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
    drogon::app().registerPreRoutingAdvice(
        [](const drogon::HttpRequestPtr &req,
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
            const auto uptimeSeconds =
                std::chrono::duration_cast<std::chrono::seconds>(std::chrono::steady_clock::now() -
                                                                   kStartTime)
                    .count();
            body["uptime_seconds"] = static_cast<Json::Int64>(uptimeSeconds);
            auto resp = drogon::HttpResponse::newHttpJsonResponse(body);
            callback(resp);
        },
        {drogon::Get});
}

std::uint16_t portFromEnv() {
    if (const char *portEnv = std::getenv("PORT")) {
        try {
            return static_cast<std::uint16_t>(std::stoi(portEnv));
        } catch (const std::exception &) {
            // fall through to default
        }
    }
    return 8081;  // 8080 is reserved for the web/ dev server (fixed by the Lovable sandbox config).
}

}  // namespace

int main() {
    registerCors();
    registerSystemEndpoints();

    const auto port = portFromEnv();

    drogon::app()
        .addListener("0.0.0.0", port)
        .setThreadNum(0)  // 0 = one I/O loop per hardware thread
        .run();

    return 0;
}
