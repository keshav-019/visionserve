#include "visionserve/inference/postprocess.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <string>
#include <utility>

#include "tiny_yolov2_constants.hpp"

namespace visionserve::inference {
namespace {

using tiny_yolov2::kAnchors;
using tiny_yolov2::kCellSize;
using tiny_yolov2::kClassLabels;
using tiny_yolov2::kGridSize;
using tiny_yolov2::kInputSize;
using tiny_yolov2::kNumBoxesPerCell;
using tiny_yolov2::kNumClasses;
using tiny_yolov2::kValuesPerBox;

float sigmoid(float value) {
    return 1.0F / (1.0F + std::exp(-value));
}

// Softmax over kNumClasses raw scores, returning (bestClassIndex, bestProb)
// without materializing the full normalized vector — only the argmax is
// needed by the caller.
std::pair<int, float> softmaxArgmax(
    const std::array<float, static_cast<std::size_t>(kNumClasses)>& rawScores) {
    const float maxVal = *std::max_element(rawScores.begin(), rawScores.end());
    std::array<float, static_cast<std::size_t>(kNumClasses)> expVals{};
    float sum = 0.0F;
    for (std::size_t i = 0; i < rawScores.size(); ++i) {
        expVals[i] = std::exp(rawScores[i] - maxVal);
        sum += expVals[i];
    }
    int bestIndex = 0;
    float bestProb = 0.0F;
    for (std::size_t i = 0; i < expVals.size(); ++i) {
        const float prob = expVals[i] / sum;
        if (prob > bestProb) {
            bestProb = prob;
            bestIndex = static_cast<int>(i);
        }
    }
    return {bestIndex, bestProb};
}

// Maps a (grid x, grid y, channel) triple onto the raw tensor's flat,
// channel-major index: channel*169 + y*13 + x.
std::size_t offset(int x, int y, int channel) {
    constexpr auto channelStride =
        static_cast<std::size_t>(kGridSize) * static_cast<std::size_t>(kGridSize);
    return (static_cast<std::size_t>(channel) * channelStride) +
           (static_cast<std::size_t>(y) * static_cast<std::size_t>(kGridSize)) +
           static_cast<std::size_t>(x);
}

}  // namespace

std::vector<Detection> decodeTinyYolov2Output(std::span<const float> rawOutput,
                                              imaging::Dimensions originalSize,
                                              float confidenceThreshold) {
    std::vector<Detection> detections;

    const float scaleX = static_cast<float>(originalSize.width) / static_cast<float>(kInputSize);
    const float scaleY = static_cast<float>(originalSize.height) / static_cast<float>(kInputSize);

    for (int cy = 0; cy < kGridSize; ++cy) {
        for (int cx = 0; cx < kGridSize; ++cx) {
            for (int box = 0; box < kNumBoxesPerCell; ++box) {
                const int channel = box * kValuesPerBox;

                const float tx = rawOutput[offset(cx, cy, channel + 0)];
                const float ty = rawOutput[offset(cx, cy, channel + 1)];
                const float tw = rawOutput[offset(cx, cy, channel + 2)];
                const float th = rawOutput[offset(cx, cy, channel + 3)];
                const float tObjectness = rawOutput[offset(cx, cy, channel + 4)];

                std::array<float, static_cast<std::size_t>(kNumClasses)> classScores{};
                for (int c = 0; c < kNumClasses; ++c) {
                    classScores[static_cast<std::size_t>(c)] =
                        rawOutput[offset(cx, cy, channel + 5 + c)];
                }

                const float objectness = sigmoid(tObjectness);
                const auto [classId, classProb] = softmaxArgmax(classScores);
                const float score = objectness * classProb;
                if (score < confidenceThreshold) {
                    continue;
                }

                const float centerX = (static_cast<float>(cx) + sigmoid(tx)) * kCellSize;
                const float centerY = (static_cast<float>(cy) + sigmoid(ty)) * kCellSize;
                const float boxWidth =
                    std::exp(tw) * kCellSize * kAnchors[static_cast<std::size_t>(box) * 2];
                const float boxHeight =
                    std::exp(th) * kCellSize * kAnchors[(static_cast<std::size_t>(box) * 2) + 1];

                float left = (centerX - (boxWidth / 2.0F)) * scaleX;
                float top = (centerY - (boxHeight / 2.0F)) * scaleY;
                float width = boxWidth * scaleX;
                float height = boxHeight * scaleY;

                const float maxWidth = static_cast<float>(originalSize.width);
                const float maxHeight = static_cast<float>(originalSize.height);
                left = std::clamp(left, 0.0F, maxWidth);
                top = std::clamp(top, 0.0F, maxHeight);
                width = std::clamp(width, 0.0F, maxWidth - left);
                height = std::clamp(height, 0.0F, maxHeight - top);

                Detection detection;
                detection.classId = classId;
                detection.label = std::string{kClassLabels[static_cast<std::size_t>(classId)]};
                detection.confidence = score;
                detection.box = BoundingBox{left, top, width, height};
                detections.push_back(std::move(detection));
            }
        }
    }

    return detections;
}

}  // namespace visionserve::inference
