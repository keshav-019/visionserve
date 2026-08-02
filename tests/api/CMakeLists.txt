add_executable(
    visionserve_api_tests
    image_endpoints_test.cpp
)

target_link_libraries(
    visionserve_api_tests
    PRIVATE
        visionserve_api_core
        GTest::gtest
)

visionserve_apply_warnings(visionserve_api_tests)
visionserve_apply_sanitizers(visionserve_api_tests)

include(GoogleTest)
gtest_discover_tests(visionserve_api_tests)
