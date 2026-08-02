#pragma once

namespace visionserve::api {

// Registers every advice (CORS, request ID) and route (system + image
// endpoints) on the global drogon::app() instance, and applies the upload
// size limit. Shared between apps/api_server/main.cpp and the integration
// test binary (tests/api/) so both exercise the exact same wiring — the
// tests aren't just calling handler functions directly, they're going
// through the real routing/advice pipeline over a real HTTP connection.
void configureVisionServeApp();

}  // namespace visionserve::api
