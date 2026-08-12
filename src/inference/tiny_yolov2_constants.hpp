#pragma once

#include <array>
#include <string_view>

// Constants specific to the tiny-yolov2 (opset 8) ONNX Model Zoo model —
// input size, grid geometry, anchor boxes, and the Pascal VOC label set it
// was trained against. Sourced from the ONNX Model Zoo README
// (https://github.com/onnx/models/tree/main/validated/vision/object_detection_segmentation/tiny-yolov2)
// plus the ML.NET tiny-yolov2 tutorial
// (https://learn.microsoft.com/en-us/dotnet/machine-learning/tutorials/object-detection-onnx),
// which is the primary source documenting the exact anchor values, label
// order, and decode formulas that the ONNX Model Zoo README omits.
namespace visionserve::inference::tiny_yolov2 {

inline constexpr int kInputSize = 416;
inline constexpr int kGridSize = 13;
inline constexpr float kCellSize =
    static_cast<float>(kInputSize) / static_cast<float>(kGridSize);  // 32
inline constexpr int kNumClasses = 20;
inline constexpr int kNumBoxesPerCell = 5;
inline constexpr int kValuesPerBox =
    5 + kNumClasses;  // tx, ty, tw, th, objectness, 20 class scores
inline constexpr int kChannelsPerCell = kNumBoxesPerCell * kValuesPerBox;  // 125

// Width/height pairs, one per box, in grid-cell units.
inline constexpr std::array<float, kNumBoxesPerCell * 2> kAnchors = {
    1.08F, 1.19F, 3.42F, 4.41F, 6.63F, 11.38F, 9.42F, 5.11F, 16.62F, 10.52F,
};

inline constexpr std::array<std::string_view, kNumClasses> kClassLabels = {
    "aeroplane", "bicycle",     "bird",  "boat",        "bottle", "bus",       "car",
    "cat",       "chair",       "cow",   "diningtable", "dog",    "horse",     "motorbike",
    "person",    "pottedplant", "sheep", "sofa",        "train",  "tvmonitor",
};

}  // namespace visionserve::inference::tiny_yolov2
