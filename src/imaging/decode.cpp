#include "visionserve/imaging/decode.hpp"

#include <opencv2/imgcodecs.hpp>
#include <vector>

namespace visionserve::imaging {

cv::Mat decode(std::string_view bytes) {
    std::vector<uchar> buffer(bytes.begin(), bytes.end());
    return cv::imdecode(buffer, cv::IMREAD_UNCHANGED);
}

}  // namespace visionserve::imaging
