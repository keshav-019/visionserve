#pragma once

#include <string>

namespace visionserve::inference {

// Identity of a loaded model — what ModelRegistry keys on, and what
// controllers read instead of hardcoding a model's name/version. A light
// seed for now; Phase 13's full model registry adds input/output shapes,
// checksums, owner, status, and the rest of the manifest.
struct ModelMetadata {
    std::string id;
    std::string name;
    std::string task;
    std::string version;
};

}  // namespace visionserve::inference
