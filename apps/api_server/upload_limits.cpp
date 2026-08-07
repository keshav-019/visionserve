#include "upload_limits.hpp"

#include "visionserve/config/env.hpp"

namespace visionserve::api {

std::uint64_t maxUploadBytes() {
    constexpr std::uint64_t kDefault = 10ULL * 1024 * 1024;  // 10 MiB
    return config::getEnvOr<std::uint64_t>("VISIONSERVE_MAX_UPLOAD_BYTES", kDefault);
}

std::uint64_t maxImagePixels() {
    constexpr std::uint64_t kDefault = 50ULL * 1'000'000;  // ~50 megapixels
    return config::getEnvOr<std::uint64_t>("VISIONSERVE_MAX_IMAGE_PIXELS", kDefault);
}

}  // namespace visionserve::api
