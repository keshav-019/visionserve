#include "visionserve/inference/tiny_yolov2_preprocessor.hpp"

#include "tiny_yolov2_constants.hpp"
#include "visionserve/inference/preprocess.hpp"

namespace visionserve::inference {

Tensor TinyYolov2Preprocessor::preprocess(const cv::Mat& decodedImage) const {
    Tensor tensor;
    tensor.data = preprocessForTinyYolov2(decodedImage);
    tensor.shape = {1, 3, tiny_yolov2::kInputSize, tiny_yolov2::kInputSize};
    return tensor;
}

}  // namespace visionserve::inference
