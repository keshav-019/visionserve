#pragma once

#include <opencv2/core.hpp>
#include <vector>

namespace visionserve::inference {

// Converts a decoded image (any channel count OpenCV can hand back from
// imaging::decode — grayscale, BGR, or BGRA) into a 1x3x416x416 NCHW
// float32 tensor: RGB channel order, raw 0-255 pixel values (no
// normalization), stretched to 416x416 without preserving aspect ratio.
// This matches the tiny-yolov2 model's expected input exactly as the ONNX
// Model Zoo's reference ML.NET pipeline prepares it (plain
// ResizeImages + ExtractPixels, no scaling) — see
// src/inference/tiny_yolov2_constants.hpp for the source.
std::vector<float> preprocessForTinyYolov2(const cv::Mat& decodedImage);

}  // namespace visionserve::inference
