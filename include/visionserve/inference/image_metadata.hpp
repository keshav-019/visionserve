#pragma once

namespace visionserve::inference {

// The source image's own dimensions, passed to IPostprocessor so it can
// remap model-space coordinates (e.g. tiny-yolov2's 416x416 grid) back into
// the original image's pixel space without any interface needing to know
// about cv::Mat.
struct ImageMetadata {
    int width;
    int height;
    int channels;
};

}  // namespace visionserve::inference
