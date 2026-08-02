#pragma once

namespace visionserve::api {

// Registers POST /images/metadata, /images/resize, /images/grayscale, and
// /images/validate on the global drogon::app() instance.
void registerImageEndpoints();

}  // namespace visionserve::api
