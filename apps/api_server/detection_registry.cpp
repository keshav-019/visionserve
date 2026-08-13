#include "detection_registry.hpp"

#include <memory>

#include "model_config.hpp"
#include "visionserve/inference/onnx_inference_session.hpp"
#include "visionserve/inference/pipeline_model.hpp"
#include "visionserve/inference/tiny_yolov2_postprocessor.hpp"
#include "visionserve/inference/tiny_yolov2_preprocessor.hpp"

namespace visionserve::api {
namespace {

using DetectionPipeline =
    inference::PipelineModel<inference::DetectionResult, inference::DetectionOptions>;

inference::ModelRegistry<IDetectionModel> buildDetectionModelRegistry() {
    inference::ModelMetadata metadata;
    metadata.id = "tiny-yolov2";
    metadata.name = "tiny-yolov2";
    metadata.task = "detection";
    metadata.version = "opset8";

    auto model = std::make_shared<DetectionPipeline>(
        metadata, std::make_shared<inference::TinyYolov2Preprocessor>(),
        std::make_shared<inference::OnnxInferenceSession>(modelPath()),
        std::make_shared<inference::TinyYolov2Postprocessor>());

    inference::ModelRegistry<IDetectionModel> registry;
    registry.registerModel(metadata.id, std::move(model));
    return registry;
}

}  // namespace

inference::ModelRegistry<IDetectionModel>& detectionModelRegistry() {
    static inference::ModelRegistry<IDetectionModel> registry = buildDetectionModelRegistry();
    return registry;
}

}  // namespace visionserve::api
