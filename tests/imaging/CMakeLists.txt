add_executable(
    visionserve_imaging_tests
    format_test.cpp
    grayscale_test.cpp
    resize_test.cpp
)

target_link_libraries(
    visionserve_imaging_tests
    PRIVATE
        visionserve_imaging
        GTest::gtest
        GTest::gtest_main
)

visionserve_apply_warnings(visionserve_imaging_tests)
visionserve_apply_sanitizers(visionserve_imaging_tests)

include(GoogleTest)
gtest_discover_tests(visionserve_imaging_tests)
