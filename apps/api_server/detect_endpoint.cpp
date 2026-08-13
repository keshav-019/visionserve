#include "detect_endpoint.hpp"

#include <drogon/HttpAppFramework.h>
#include <drogon/MultiPart.h>

#include <algorithm>
#include <string>

#include "detection_model.hpp"
#include "detection_registry.hpp"
#include "detection_result_serializer.hpp"
#include "error_response.hpp"
#include "request_context.hpp"
#include "safe_handler.hpp"
#include "upload_pipeline.hpp"
#include "visionserve/common/timing.hpp"

namespace visionserve::api {
namespace {

using common::Stopwatch;
using drogon::HttpRequestPtr;
using errors::ErrorCode;
using inference::DetectionOptions;
using inference::DetectionResult;

float clampedFloatParam(drogon::MultiPartParser& parser, const std::string& name,
                        float defaultValue, float minValue, float maxValue) {
    const auto value = parser.getOptionalParameter<float>(name).value_or(defaultValue);
    return std::clamp(value, minValue, maxValue);
}

void handleDetect(const HttpRequestPtr& req, ResponseCallback&& callback) {
    const auto requestId = requestIdFor(req);
    Stopwatch total;

    const auto model = detectionModelRegistry().defaultModel();
    if (!model || !model->isReady()) {
        callback(makeErrorResponse(
            requestId, drogon::k503ServiceUnavailable, ErrorCode::ModelNotReady,
            model ? std::string{model->loadError()} : "no detection model is registered"));
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
    options.confidenceThreshold =
        clampedFloatParam(parser, "confidence_threshold", options.confidenceThreshold, 0.0F, 1.0F);
    options.iouThreshold =
        clampedFloatParam(parser, "iou_threshold", options.iouThreshold, 0.0F, 1.0F);
    options.maxDetections = std::max(
        0, parser.getOptionalParameter<int>("max_detections").value_or(options.maxDetections));
    const bool includeTiming = parser.getOptionalParameter<int>("include_timing").value_or(1) != 0;

    DetectionResult result;
    try {
        result = model->run(decoded->mat, options);
    } catch (const std::exception& e) {
        callback(makeErrorResponse(requestId, drogon::k500InternalServerError,
                                   ErrorCode::InferenceFailed,
                                   std::string{"inference failed: "} + e.what()));
        return;
    }

    const DetectionResultSerializer serializer;
    Json::Value body;
    body["request_id"] = requestId;
    body["model"] = model->metadata().name;
    body["version"] = model->metadata().version;
    body["detections"] = serializer.serialize(result);
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
