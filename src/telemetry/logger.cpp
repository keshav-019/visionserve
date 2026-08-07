#include "visionserve/telemetry/logger.hpp"

#include <json/json.h>
#include <spdlog/sinks/stdout_sinks.h>
#include <spdlog/spdlog.h>

#include "visionserve/config/env.hpp"

namespace visionserve::telemetry {

void initLogger() {
    spdlog::set_default_logger(spdlog::stdout_logger_mt("visionserve"));
    // "%v": the message only — every log call here builds the full structured line itself,
    // so spdlog's own pattern (timestamp/level/logger-name prefix) would be redundant.
    spdlog::set_pattern("%v");
    const auto levelName = config::getEnvOr<std::string>("VISIONSERVE_LOG_LEVEL", "info");
    spdlog::set_level(spdlog::level::from_str(levelName));
}

void logRequest(std::string_view method, std::string_view path, int statusCode,
                std::string_view requestId, double durationMs) {
    Json::Value entry;
    entry["level"] = "info";
    entry["event"] = "http_request";
    entry["method"] = std::string{method};
    entry["path"] = std::string{path};
    entry["status"] = statusCode;
    entry["request_id"] = std::string{requestId};
    entry["duration_ms"] = durationMs;

    Json::StreamWriterBuilder writer;
    writer["indentation"] = "";
    spdlog::info(Json::writeString(writer, entry));
}

}  // namespace visionserve::telemetry
