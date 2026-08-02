#include <drogon/HttpAppFramework.h>

#include <cstdlib>
#include <exception>
#include <string>

#include "app_setup.hpp"

namespace {

std::uint16_t portFromEnv() {
    if (const char *portEnv = std::getenv("PORT")) {
        try {
            return static_cast<std::uint16_t>(std::stoi(portEnv));
        } catch (const std::exception &) {
            // fall through to default
        }
    }
    return 8081;  // 8080 is reserved for the web/ dev server (fixed by the Lovable sandbox config).
}

}  // namespace

int main() {
    visionserve::api::configureVisionServeApp();

    drogon::app()
        .addListener("0.0.0.0", portFromEnv())
        .setThreadNum(0)  // 0 = one I/O loop per hardware thread
        .run();

    return 0;
}
