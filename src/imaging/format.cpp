#include "visionserve/imaging/format.hpp"

namespace visionserve::imaging {

namespace {

bool startsWith(std::string_view bytes, std::string_view prefix) {
    return bytes.size() >= prefix.size() && bytes.substr(0, prefix.size()) == prefix;
}

}  // namespace

std::optional<std::string_view> detectFormat(std::string_view bytes) {
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

}  // namespace visionserve::imaging
