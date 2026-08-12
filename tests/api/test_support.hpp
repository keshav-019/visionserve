#pragma once

#include <drogon/HttpClient.h>
#include <drogon/HttpResponse.h>

#include <cstdint>
#include <opencv2/core.hpp>
#include <string>
#include <utility>
#include <vector>

namespace visionserve::api::testing_support {

// gtest_discover_tests() runs each TEST() below as its own process invocation
// (via --gtest_filter), each binding this same fixed port — fine as long as
// ctest runs them serially (the default, and what CI does). Parallelizing
// this binary's tests (ctest -j) would need an ephemeral/PID-derived port
// instead.
inline constexpr std::uint16_t kTestPort = 18099;

// The shared HttpClient pointed at the background test server that
// ApiServerEnvironment (test_support.cpp) starts once for the whole test
// binary — every *_test.cpp file in this target uses the same server/client
// rather than each standing up its own.
drogon::HttpClientPtr client();

std::vector<uchar> makeSyntheticJpeg(int width = 64, int height = 48);

drogon::HttpResponsePtr postFile(
    const std::string& path, const std::vector<uchar>& bytes, const std::string& fileName,
    const std::vector<std::pair<std::string, std::string>>& params = {});

}  // namespace visionserve::api::testing_support
