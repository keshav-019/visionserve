#include "detector_instance.hpp"

#include "model_config.hpp"

namespace visionserve::api {

inference::Detector& detectorInstance() {
    static inference::Detector detector{modelPath()};
    return detector;
}

}  // namespace visionserve::api
