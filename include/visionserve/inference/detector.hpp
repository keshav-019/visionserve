#pragma once

#include <memory>
#include <opencv2/core.hpp>
#include <string>
#include <string_view>

#include "visionserve/inference/types.hpp"

namespace visionserve::inference {

// Owns an ONNX Runtime session for the tiny-yolov2 detector, loaded once at
// construction (Phase 4 completion criterion: "model session is loaded
// once"). ONNX Runtime guarantees Session::Run is safe to call concurrently
// from multiple threads on the same session, so a single Detector instance
// is shared across Drogon's request handlers rather than one per request.
class Detector {
   public:
    explicit Detector(const std::string& modelPath);
    ~Detector();

    Detector(const Detector&) = delete;
    Detector& operator=(const Detector&) = delete;
    Detector(Detector&&) noexcept;
    Detector& operator=(Detector&&) noexcept;

    // Precondition: isReady(). Runs the full pipeline (preprocess -> ONNX
    // Runtime inference -> decode -> NMS) and returns detections in
    // `decodedImage`'s coordinate space, plus a per-stage timing breakdown.
    [[nodiscard]] DetectionResult detect(const cv::Mat& decodedImage,
                                         const DetectionOptions& options) const;

    // True once the model has loaded and is ready to run inference; false
    // if construction failed (missing/corrupt model file, unsupported
    // graph, ...). Drives GET /ready and gates POST /v1/detect.
    [[nodiscard]] bool isReady() const noexcept;

    // Human-readable reason isReady() is false; empty once loaded.
    [[nodiscard]] std::string_view loadError() const noexcept;

   private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

}  // namespace visionserve::inference
