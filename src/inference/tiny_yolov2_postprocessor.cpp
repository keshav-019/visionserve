#include "visionserve/inference/tiny_yolov2_postprocessor.hpp"

#include <utility>

#include "visionserve/inference/nms.hpp"
#include "visionserve/inference/postprocess.hpp"

namespace visionserve::inference {

DetectionResult TinyYolov2Postprocessor::postprocess(const Tensor& rawOutput,
                                                     const ImageMetadata& sourceImage,
                                                     const DetectionOptions& options) const {
    auto rawDetections = decodeTinyYolov2Output(
        rawOutput.data, imaging::Dimensions{sourceImage.width, sourceImage.height},
        options.confidenceThreshold);
    auto finalDetections =
        nonMaxSuppression(std::move(rawDetections), options.iouThreshold, options.maxDetections);

    DetectionResult result;
    result.detections = std::move(finalDetections);
    return result;
}

}  // namespace visionserve::inference
