#pragma once

namespace visionserve::inference {

// Per-stage timing breakdown, filled in by PipelineModel::run() around each
// stage it calls. Generic across every task (detection today; OCR/
// classification/segmentation later reuse the same shape) rather than each
// task defining its own — this replaces what used to be a
// detection-specific "DetectionTiming".
struct InferenceTiming {
    double preprocessMs = 0.0;
    double inferenceMs = 0.0;
    double postprocessMs = 0.0;
};

}  // namespace visionserve::inference
