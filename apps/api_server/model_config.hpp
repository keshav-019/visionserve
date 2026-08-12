#pragma once

#include <string>

namespace visionserve::api {

// Filesystem path to the tiny-yolov2 ONNX model, relative to the process's
// working directory by default — matches the README's "run from repo root"
// convention and cmake/models.cmake, which downloads the model to
// <repo root>/models/tinyyolov2-8.onnx. Override via VISIONSERVE_MODEL_PATH
// for deployments that don't run from the repo root.
std::string modelPath();

}  // namespace visionserve::api
