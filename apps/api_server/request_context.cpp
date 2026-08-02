#include "request_context.hpp"

#include <drogon/utils/Utilities.h>

namespace visionserve::api {

std::string generateRequestId() {
    return "req_" + drogon::utils::getUuid();
}

std::string requestIdFor(const drogon::HttpRequestPtr& req) {
    const auto& id = req->attributes()->get<std::string>(std::string{kRequestIdAttribute});
    return id.empty() ? generateRequestId() : id;
}

}  // namespace visionserve::api
