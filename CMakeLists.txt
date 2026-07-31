cmake_minimum_required(VERSION 3.28)

project(
    VisionServe
    VERSION 0.1.0
    DESCRIPTION "Production-oriented computer vision inference platform"
    LANGUAGES CXX
)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(VISIONSERVE_BUILD_TESTS "Build VisionServe tests" ON)
option(VISIONSERVE_ENABLE_WARNINGS "Enable strict compiler warnings" ON)
option(VISIONSERVE_ENABLE_ASAN "Enable AddressSanitizer" OFF)
option(VISIONSERVE_ENABLE_UBSAN "Enable UndefinedBehaviorSanitizer" OFF)
option(VISIONSERVE_ENABLE_TSAN "Enable ThreadSanitizer" OFF)

function(visionserve_apply_warnings target)
    if(NOT VISIONSERVE_ENABLE_WARNINGS)
        return()
    endif()
    if(MSVC)
        target_compile_options(
            ${target}
            PRIVATE
                /W4
                /permissive-
                /EHsc
        )
    else()
        target_compile_options(
            ${target}
            PRIVATE
                -Wall
                -Wextra
                -Wpedantic
                -Wconversion
                -Wshadow
        )
    endif()
endfunction()

add_executable(
    visionserve_sanity
    apps/image_cli/main.cpp
)

target_compile_features(
    visionserve_sanity
    PRIVATE
        cxx_std_20
)

visionserve_apply_warnings(visionserve_sanity)

find_package(Drogon CONFIG REQUIRED)

add_executable(
    visionserve_api
    apps/api_server/main.cpp
)

target_compile_features(
    visionserve_api
    PRIVATE
        cxx_std_20
)

target_link_libraries(
    visionserve_api
    PRIVATE
        Drogon::Drogon
)

visionserve_apply_warnings(visionserve_api)

if(VISIONSERVE_BUILD_TESTS)
    include(CTest)
    enable_testing()
endif()