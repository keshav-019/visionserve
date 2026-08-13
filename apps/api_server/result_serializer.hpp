#pragma once

#include <json/json.h>

namespace visionserve::api {

// Turns a task-specific typed result's payload into JSON — keeps "how do I
// render a DetectionResult" (or a future OCRResult/ClassificationResult)
// out of the endpoint handler and independently testable/reusable. Only the
// result's own payload (e.g. the detections array), not the standard
// envelope (request_id, model, version) or timing — those are request-
// scoped and assembled by the controller itself, since neither is part of
// any typed result.
template <typename ResultT>
class IResultSerializer {
   public:
    virtual ~IResultSerializer() = default;

    [[nodiscard]] virtual Json::Value serialize(const ResultT& result) const = 0;
};

}  // namespace visionserve::api
