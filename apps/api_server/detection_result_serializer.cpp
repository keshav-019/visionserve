#include "detection_result_serializer.hpp"

namespace visionserve::api {
namespace {

Json::Value detectionToJson(const inference::Detection& detection) {
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

}  // namespace

Json::Value DetectionResultSerializer::serialize(const inference::DetectionResult& result) const {
    Json::Value detections{Json::arrayValue};
    for (const auto& detection : result.detections) {
        detections.append(detectionToJson(detection));
    }
    return detections;
}

}  // namespace visionserve::api
