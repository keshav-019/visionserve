#include "visionserve/config/env.hpp"

namespace visionserve::config {

std::vector<std::string> getEnvListOr(const char* name, std::vector<std::string> defaultValue) {
    const char* value = std::getenv(name);
    if (value == nullptr || *value == '\0') {
        return defaultValue;
    }

    std::vector<std::string> tokens;
    std::stringstream stream{value};
    std::string token;
    while (std::getline(stream, token, ',')) {
        if (!token.empty()) {
            tokens.push_back(token);
        }
    }
    return tokens.empty() ? defaultValue : tokens;
}

}  // namespace visionserve::config
