#include "model_config.hpp"

#include "visionserve/config/env.hpp"

namespace visionserve::api {

std::string modelPath() {
    return config::getEnvOr<std::string>("VISIONSERVE_MODEL_PATH", "models/tinyyolov2-8.onnx");
}

}  // namespace visionserve::api
