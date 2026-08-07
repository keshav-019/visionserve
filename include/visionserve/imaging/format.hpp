#pragma once

#include <optional>
#include <string_view>

namespace visionserve::imaging {

// Identifies an image format from its magic bytes rather than trusting a
// client-declared Content-Type or file extension (both of which are trivially
// spoofable). Returns nullopt if the bytes don't match any allowed format.
std::optional<std::string_view> detectFormat(std::string_view bytes);

}  // namespace visionserve::imaging
