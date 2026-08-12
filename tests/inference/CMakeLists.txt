add_executable(
    visionserve_inference_tests
    nms_test.cpp
    postprocess_test.cpp
    preprocess_test.cpp
)

target_link_libraries(
    visionserve_inference_tests
    PRIVATE
        visionserve_inference
        GTest::gtest
        GTest::gtest_main
)

# Grants access to src/inference/tiny_yolov2_constants.hpp (an internal
# header, not part of visionserve_inference's public include/ surface) so
# postprocess_test.cpp can check decode math against the model's real
# anchors/grid-size/input-size constants instead of duplicating them as
# hardcoded literals that could silently drift out of sync.
target_include_directories(
    visionserve_inference_tests
    PRIVATE
        ${CMAKE_SOURCE_DIR}/src/inference
)

visionserve_apply_warnings(visionserve_inference_tests)
visionserve_apply_sanitizers(visionserve_inference_tests)
visionserve_copy_onnxruntime_runtime(visionserve_inference_tests)

include(GoogleTest)
gtest_discover_tests(visionserve_inference_tests)
