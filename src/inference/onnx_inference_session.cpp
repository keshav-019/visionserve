#include "visionserve/inference/onnx_inference_session.hpp"

#include <onnxruntime_cxx_api.h>

#include <array>
#include <optional>

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

struct OnnxInferenceSession::Impl {
    Ort::Env env{ORT_LOGGING_LEVEL_WARNING, "visionserve"};
    Ort::SessionOptions sessionOptions;
    std::optional<Ort::Session> session;
    std::string inputName;
    std::string outputName;
    bool ready = false;
    std::string loadError;
};

OnnxInferenceSession::OnnxInferenceSession(const std::string& modelPath)
    : impl_(std::make_unique<Impl>()) {
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

OnnxInferenceSession::~OnnxInferenceSession() = default;
OnnxInferenceSession::OnnxInferenceSession(OnnxInferenceSession&&) noexcept = default;
OnnxInferenceSession& OnnxInferenceSession::operator=(OnnxInferenceSession&&) noexcept = default;

bool OnnxInferenceSession::isReady() const noexcept {
    return impl_ != nullptr && impl_->ready;
}

std::string_view OnnxInferenceSession::loadError() const noexcept {
    return impl_->loadError;
}

Tensor OnnxInferenceSession::run(const Tensor& input) const {
    Ort::MemoryInfo memoryInfo = Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);
    // const_cast: CreateTensor takes a non-const data pointer (it wraps the
    // buffer rather than copying it), but never writes through it for an
    // input tensor. `input` is a const& because the interface promises
    // callers their argument isn't modified.
    Ort::Value inputTensorValue =
        Ort::Value::CreateTensor<float>(memoryInfo, const_cast<float*>(input.data.data()),
                                        input.data.size(), input.shape.data(), input.shape.size());

    const std::array<const char*, 1> inputNames{impl_->inputName.c_str()};
    const std::array<const char*, 1> outputNames{impl_->outputName.c_str()};

    auto outputTensors = impl_->session->Run(Ort::RunOptions{nullptr}, inputNames.data(),
                                             &inputTensorValue, 1, outputNames.data(), 1);

    const Ort::Value& outputValue = outputTensors.front();
    const float* rawOutput = outputValue.GetTensorData<float>();
    const auto typeAndShape = outputValue.GetTensorTypeAndShapeInfo();
    const auto elementCount = typeAndShape.GetElementCount();

    Tensor output;
    output.data.assign(rawOutput, rawOutput + elementCount);
    output.shape = typeAndShape.GetShape();
    return output;
}

}  // namespace visionserve::inference
