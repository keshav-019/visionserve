#include "visionserve/inference/detector.hpp"

#include <onnxruntime_cxx_api.h>

#include <array>
#include <cstdint>
#include <optional>
#include <span>
#include <utility>

#include "tiny_yolov2_constants.hpp"
#include "visionserve/common/timing.hpp"
#include "visionserve/inference/nms.hpp"
#include "visionserve/inference/postprocess.hpp"
#include "visionserve/inference/preprocess.hpp"

#ifdef _WIN32
#include <windows.h>
#endif

namespace visionserve::inference {
namespace {

#ifdef _WIN32
std::wstring toWidePath(const std::string& utf8Path) {
    if (utf8Path.empty()) {
        return {};
    }
    const int requiredChars = MultiByteToWideChar(CP_UTF8, 0, utf8Path.c_str(),
                                                  static_cast<int>(utf8Path.size()), nullptr, 0);
    std::wstring wide(static_cast<std::size_t>(requiredChars), L'\0');
    MultiByteToWideChar(CP_UTF8, 0, utf8Path.c_str(), static_cast<int>(utf8Path.size()),
                        wide.data(), requiredChars);
    return wide;
}
#endif

}  // namespace

struct Detector::Impl {
    Ort::Env env{ORT_LOGGING_LEVEL_WARNING, "visionserve"};
    Ort::SessionOptions sessionOptions;
    std::optional<Ort::Session> session;
    std::string inputName;
    std::string outputName;
    bool ready = false;
    std::string loadError;
};

Detector::Detector(const std::string& modelPath) : impl_(std::make_unique<Impl>()) {
    try {
        impl_->sessionOptions.SetGraphOptimizationLevel(GraphOptimizationLevel::ORT_ENABLE_ALL);

#ifdef _WIN32
        const std::wstring widePath = toWidePath(modelPath);
        impl_->session.emplace(impl_->env, widePath.c_str(), impl_->sessionOptions);
#else
        impl_->session.emplace(impl_->env, modelPath.c_str(), impl_->sessionOptions);
#endif

        Ort::AllocatorWithDefaultOptions allocator;
        auto inputNamePtr = impl_->session->GetInputNameAllocated(0, allocator);
        auto outputNamePtr = impl_->session->GetOutputNameAllocated(0, allocator);
        impl_->inputName = inputNamePtr.get();
        impl_->outputName = outputNamePtr.get();
        impl_->ready = true;
    } catch (const Ort::Exception& e) {
        impl_->session.reset();
        impl_->ready = false;
        impl_->loadError = e.what();
    }
}

Detector::~Detector() = default;
Detector::Detector(Detector&&) noexcept = default;
Detector& Detector::operator=(Detector&&) noexcept = default;

bool Detector::isReady() const noexcept {
    return impl_ != nullptr && impl_->ready;
}

std::string_view Detector::loadError() const noexcept {
    return impl_->loadError;
}

DetectionResult Detector::detect(const cv::Mat& decodedImage,
                                 const DetectionOptions& options) const {
    common::Stopwatch preprocessWatch;
    std::vector<float> inputTensor = preprocessForTinyYolov2(decodedImage);
    const double preprocessMs = preprocessWatch.elapsedMs();

    constexpr std::array<std::int64_t, 4> inputShape{1, 3, tiny_yolov2::kInputSize,
                                                     tiny_yolov2::kInputSize};

    Ort::MemoryInfo memoryInfo = Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);
    Ort::Value inputTensorValue = Ort::Value::CreateTensor<float>(
        memoryInfo, inputTensor.data(), inputTensor.size(), inputShape.data(), inputShape.size());

    const std::array<const char*, 1> inputNames{impl_->inputName.c_str()};
    const std::array<const char*, 1> outputNames{impl_->outputName.c_str()};

    common::Stopwatch inferenceWatch;
    auto outputTensors = impl_->session->Run(Ort::RunOptions{nullptr}, inputNames.data(),
                                             &inputTensorValue, 1, outputNames.data(), 1);
    const double inferenceMs = inferenceWatch.elapsedMs();

    const float* rawOutput = outputTensors.front().GetTensorData<float>();
    const auto outputCount = outputTensors.front().GetTensorTypeAndShapeInfo().GetElementCount();

    common::Stopwatch postprocessWatch;
    auto rawDetections = decodeTinyYolov2Output(
        std::span<const float>(rawOutput, outputCount),
        imaging::Dimensions{decodedImage.cols, decodedImage.rows}, options.confidenceThreshold);
    auto finalDetections =
        nonMaxSuppression(std::move(rawDetections), options.iouThreshold, options.maxDetections);
    const double postprocessMs = postprocessWatch.elapsedMs();

    DetectionResult result;
    result.detections = std::move(finalDetections);
    result.timing = DetectionTiming{preprocessMs, inferenceMs, postprocessMs};
    return result;
}

}  // namespace visionserve::inference
