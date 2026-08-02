#pragma once

#include <cstdint>
#include <optional>
#include <string_view>

namespace visionserve::api {

// Identifies an image format from its magic bytes rather than trusting a
// client-declared Content-Type or file extension (both of which are trivially
// spoofable). Returns nullopt if the bytes don't match any allowed format.
std::optional<std::string_view> detectImageFormat(std::string_view bytes);

// Default per-file upload limit (10 MiB) and decoded-pixel-count limit
// (~50 megapixels) — generous enough for real photos, small enough to bound
// memory use for a synchronous, single-threaded-per-request decode. Override
// via VISIONSERVE_MAX_UPLOAD_BYTES / VISIONSERVE_MAX_IMAGE_PIXELS.
std::uint64_t maxUploadBytes();
std::uint64_t maxImagePixels();

}  // namespace visionserve::api
