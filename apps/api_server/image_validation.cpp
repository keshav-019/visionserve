#include "image_validation.hpp"

#include <array>
#include <cstdlib>
#include <exception>
#include <string>

namespace visionserve::api {

namespace {

bool startsWith(std::string_view bytes, std::string_view prefix) {
    return bytes.size() >= prefix.size() && bytes.substr(0, prefix.size()) == prefix;
}

std::uint64_t envOrDefault(const char* name, std::uint64_t defaultValue) {
    const char* value = std::getenv(name);
    if (value == nullptr) {
        return defaultValue;
    }
    try {
        return std::stoull(value);
    } catch (const std::exception&) {
        return defaultValue;
    }
}

}  // namespace

std::optional<std::string_view> detectImageFormat(std::string_view bytes) {
    using namespace std::string_view_literals;

    constexpr auto kJpeg = "\xFF\xD8\xFF"sv;
    constexpr auto kPng = "\x89PNG\r\n\x1A\n"sv;
    constexpr auto kBmp = "BM"sv;
    constexpr auto kRiff = "RIFF"sv;
    constexpr auto kWebp = "WEBP"sv;

    if (startsWith(bytes, kJpeg)) {
        return "jpeg"sv;
    }
    if (startsWith(bytes, kPng)) {
        return "png"sv;
    }
    if (startsWith(bytes, kBmp)) {
        return "bmp"sv;
    }
    if (bytes.size() >= 12 && startsWith(bytes, kRiff) && bytes.substr(8, 4) == kWebp) {
        return "webp"sv;
    }
    return std::nullopt;
}

std::uint64_t maxUploadBytes() {
    constexpr std::uint64_t kDefault = 10ULL * 1024 * 1024;  // 10 MiB
    return envOrDefault("VISIONSERVE_MAX_UPLOAD_BYTES", kDefault);
}

std::uint64_t maxImagePixels() {
    constexpr std::uint64_t kDefault = 50ULL * 1'000'000;  // ~50 megapixels
    return envOrDefault("VISIONSERVE_MAX_IMAGE_PIXELS", kDefault);
}

}  // namespace visionserve::api
