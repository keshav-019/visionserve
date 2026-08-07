#pragma once

#include <cstdlib>
#include <exception>
#include <sstream>
#include <string>
#include <vector>

namespace visionserve::config {

// Reads environment variable `name`, parsed as T via operator>>. Returns
// `defaultValue` if the variable is unset, empty, or fails to parse. Replaces
// the getenv+stoi/stoull-with-try/catch pattern that used to be duplicated
// across portFromEnv(), maxUploadBytes(), and maxImagePixels().
template <typename T>
T getEnvOr(const char* name, T defaultValue) {
    const char* value = std::getenv(name);
    if (value == nullptr || *value == '\0') {
        return defaultValue;
    }
    std::istringstream stream{value};
    T parsed{};
    stream >> parsed;
    if (stream.fail() || !stream.eof()) {
        return defaultValue;
    }
    return parsed;
}

// Reads a comma-separated environment variable into a vector of trimmed,
// non-empty tokens. Returns `defaultValue` if the variable is unset, empty,
// or every token is empty (e.g. "" or ",,"). Replaces the hand-rolled
// stringstream/getline split that used to live in corsAllowedOrigins().
std::vector<std::string> getEnvListOr(const char* name, std::vector<std::string> defaultValue);

}  // namespace visionserve::config
