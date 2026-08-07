#pragma once

#include <chrono>

namespace visionserve::common {

// Measures elapsed wall-clock time for a single processing stage, in milliseconds.
class Stopwatch {
   public:
    void restart() {
        start_ = std::chrono::steady_clock::now();
    }
    double elapsedMs() const {
        return std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - start_)
            .count();
    }

   private:
    std::chrono::steady_clock::time_point start_{std::chrono::steady_clock::now()};
};

}  // namespace visionserve::common
