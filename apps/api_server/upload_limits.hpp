#pragma once

#include <cstdint>

namespace visionserve::api {

// Default per-file upload limit (10 MiB) and decoded-pixel-count limit
// (~50 megapixels) — generous enough for real photos, small enough to bound
// memory use for a synchronous, single-threaded-per-request decode. Override
// via VISIONSERVE_MAX_UPLOAD_BYTES / VISIONSERVE_MAX_IMAGE_PIXELS.
std::uint64_t maxUploadBytes();
std::uint64_t maxImagePixels();

}  // namespace visionserve::api
