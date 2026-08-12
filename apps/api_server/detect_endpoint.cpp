#include "detect_endpoint.hpp"

#include <drogon/HttpAppFramework.h>
#include <drogon/MultiPart.h>

#include <algorithm>
#include <string>
#include <string_view>

#include "detector_instance.hpp"
#include "error_response.hpp"
#include "request_context.hpp"
#include "safe_handler.hpp"
#include "upload_pipeline.hpp"
#include "visionserve/common/timing.hpp"
#include "visionserve/inference/detector.hpp"

namespace visionserve::api {
namespace {

using drogon::HttpRequestPtr;
using common::Stopwatch;
using errors::ErrorCode;
using inference::Detection;
using inference::DetectionOptions;
using inference::DetectionResult;

// The only model this build serves today; "version" is the ONNX opset the
// downloaded artifact was exported with (see cmake/models.cmake). Revisit
// once the model registry (Phase 13) makes both selectable/dynamic.
constexpr std::string_view kModelName = "tiny-yolov2";
constexpr std::string_view kModelVersion = "opset8";

float clampedFloatParam(drogon::MultiPartParser& parser, const std::string& name, float defaultValue,
                        float minValue, float maxValue) {
    const auto value = parser.getOptionalParameter<float>(name).value_or(defaultValue);
    return std::clamp(value, minValue, maxValue);
}

Json::Value detectionToJson(const Detection& detection) {
    Json::Value entry;
    entry["class_id"] = detection.classId;
    entry["label"] = detection.label;
    entry["confidence"] = detection.confidence;
    entry["box"]["x"] = detection.box.x;
    entry["box"]["y"] = detection.box.y;
    entry["box"]["width"] = detection.box.width;
    entry["box"]["height"] = detection.box.height;
    return entry;
}

void handleDetect(const HttpRequestPtr& req, ResponseCallback&& callback) {
    const auto requestId = requestIdFor(req);
    Stopwatch total;

    auto& detector = detectorInstance();
    if (!detector.isReady()) {
        callback(makeErrorResponse(requestId, drogon::k503ServiceUnavailable, ErrorCode::ModelNotReady,
                                   "the detection model is not ready"));
        return;
    }

    drogon::MultiPartParser parser;
    auto uploaded = extractUploadedImage(req, parser, requestId, callback);
    if (!uploaded) {
        return;
    }
    auto decoded = decodeUploadedImage(*uploaded, requestId, callback);
    if (!decoded) {
        return;
    }

    DetectionOptions options;
    options.confidenceThreshold = clampedFloatParam(parser, "confidence_threshold",
                                                     options.confidenceThreshold, 0.0F, 1.0F);
    options.iouThreshold =
        clampedFloatParam(parser, "iou_threshold", options.iouThreshold, 0.0F, 1.0F);
    options.maxDetections =
        std::max(0, parser.getOptionalParameter<int>("max_detections").value_or(options.maxDetections));
    const bool includeTiming = parser.getOptionalParameter<int>("include_timing").value_or(1) != 0;

    DetectionResult result;
    try {
        result = detector.detect(decoded->mat, options);
    } catch (const std::exception& e) {
        callback(makeErrorResponse(requestId, drogon::k500InternalServerError, ErrorCode::InferenceFailed,
                                   std::string{"inference failed: "} + e.what()));
        return;
    }

    Json::Value body;
    body["request_id"] = requestId;
    body["model"] = std::string{kModelName};
    body["version"] = std::string{kModelVersion};
    body["detections"] = Json::Value{Json::arrayValue};
    for (const auto& detection : result.detections) {
        body["detections"].append(detectionToJson(detection));
    }
    if (includeTiming) {
        body["timing"]["decode_ms"] = decoded->decodeMs;
        body["timing"]["preprocess_ms"] = result.timing.preprocessMs;
        body["timing"]["inference_ms"] = result.timing.inferenceMs;
        body["timing"]["postprocess_ms"] = result.timing.postprocessMs;
        body["timing"]["total_ms"] = total.elapsedMs();
    }

    callback(drogon::HttpResponse::newHttpJsonResponse(body));
}

}  // namespace

void registerDetectEndpoint() {
    drogon::app().registerHandler("/v1/detect", makeSafe(&handleDetect), {drogon::Post});
}

}  // namespace visionserve::api
