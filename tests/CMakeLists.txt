add_executable(
    visionserve_concurrency_tests
    concurrency/bounded_queue_test.cpp
    concurrency/thread_pool_test.cpp
)

target_link_libraries(
    visionserve_concurrency_tests
    PRIVATE
        visionserve_concurrency
        GTest::gtest
        GTest::gtest_main
)

visionserve_apply_warnings(visionserve_concurrency_tests)
visionserve_apply_sanitizers(visionserve_concurrency_tests)

include(GoogleTest)
gtest_discover_tests(visionserve_concurrency_tests)

add_subdirectory(api)
add_subdirectory(imaging)
add_subdirectory(inference)
