add_executable(
    visionserve_api_tests
    detect_endpoint_test.cpp
    image_endpoints_test.cpp
    test_main.cpp
    test_support.cpp
)

target_link_libraries(
    visionserve_api_tests
    PRIVATE
        visionserve_api_core
        GTest::gtest
)

visionserve_apply_warnings(visionserve_api_tests)
visionserve_apply_sanitizers(visionserve_api_tests)
visionserve_copy_onnxruntime_runtime(visionserve_api_tests)

include(GoogleTest)
# WORKING_DIRECTORY: detect_endpoint_test.cpp loads the real model via the
# same VISIONSERVE_MODEL_PATH default ("models/tinyyolov2-8.onnx") that
# visionserve_api uses, which is relative to the repo root per the README's
# quick-start instructions — so tests resolve it the same way.
gtest_discover_tests(visionserve_api_tests WORKING_DIRECTORY ${CMAKE_SOURCE_DIR})
