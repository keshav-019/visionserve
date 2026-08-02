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

if(VISIONSERVE_ENABLE_ASAN AND VISIONSERVE_ENABLE_TSAN)
    message(FATAL_ERROR "VISIONSERVE_ENABLE_ASAN and VISIONSERVE_ENABLE_TSAN are mutually exclusive")
endif()

# Applies the sanitizer(s) selected via VISIONSERVE_ENABLE_{ASAN,UBSAN,TSAN} to a target.
# MSVC only supports AddressSanitizer; UBSan/TSan require GCC or Clang.
function(visionserve_apply_sanitizers target)
    if(MSVC)
        if(VISIONSERVE_ENABLE_ASAN)
            target_compile_options(${target} PRIVATE /fsanitize=address)
        endif()
        if(VISIONSERVE_ENABLE_UBSAN OR VISIONSERVE_ENABLE_TSAN)
            message(WARNING "UBSan/TSan are not supported by MSVC; ignoring for ${target}")
        endif()
        return()
    endif()

    set(sanitizers "")
    if(VISIONSERVE_ENABLE_ASAN)
        list(APPEND sanitizers "address")
    endif()
    if(VISIONSERVE_ENABLE_UBSAN)
        list(APPEND sanitizers "undefined")
    endif()
    if(VISIONSERVE_ENABLE_TSAN)
        list(APPEND sanitizers "thread")
    endif()
    if(sanitizers)
        list(JOIN sanitizers "," sanitizer_list)
        target_compile_options(${target} PRIVATE -fsanitize=${sanitizer_list} -fno-omit-frame-pointer -g)
        target_link_options(${target} PRIVATE -fsanitize=${sanitizer_list})
    endif()
endfunction()

add_library(visionserve_concurrency INTERFACE)

target_include_directories(
    visionserve_concurrency
    INTERFACE
        ${CMAKE_SOURCE_DIR}/include
)

target_compile_features(
    visionserve_concurrency
    INTERFACE
        cxx_std_20
)

find_package(OpenCV REQUIRED COMPONENTS core imgproc imgcodecs)

add_executable(
    visionserve_image
    apps/image_cli/main.cpp
)

target_compile_features(
    visionserve_image
    PRIVATE
        cxx_std_20
)

target_link_libraries(
    visionserve_image
    PRIVATE
        ${OpenCV_LIBS}
)

target_include_directories(
    visionserve_image
    PRIVATE
        ${OpenCV_INCLUDE_DIRS}
)

set_target_properties(visionserve_image PROPERTIES OUTPUT_NAME "visionserve-image")

visionserve_apply_warnings(visionserve_image)
visionserve_apply_sanitizers(visionserve_image)

find_package(Drogon CONFIG REQUIRED)

# Everything the API server does except its main() — shared between the real
# visionserve_api executable and the integration test binary (tests/api/) so
# both drive the exact same route/advice wiring, not a reimplementation of it.
add_library(
    visionserve_api_core
    STATIC
    apps/api_server/app_setup.cpp
    apps/api_server/error_response.cpp
    apps/api_server/image_endpoints.cpp
    apps/api_server/image_validation.cpp
    apps/api_server/request_context.cpp
)

target_include_directories(
    visionserve_api_core
    PUBLIC
        apps/api_server
        ${OpenCV_INCLUDE_DIRS}
)

target_link_libraries(
    visionserve_api_core
    PUBLIC
        Drogon::Drogon
        ${OpenCV_LIBS}
)

target_compile_features(
    visionserve_api_core
    PUBLIC
        cxx_std_20
)

visionserve_apply_warnings(visionserve_api_core)
visionserve_apply_sanitizers(visionserve_api_core)

add_executable(
    visionserve_api
    apps/api_server/main.cpp
)

target_link_libraries(
    visionserve_api
    PRIVATE
        visionserve_api_core
)

visionserve_apply_warnings(visionserve_api)
visionserve_apply_sanitizers(visionserve_api)

if(VISIONSERVE_BUILD_TESTS)
    include(CTest)
    enable_testing()
    find_package(GTest CONFIG REQUIRED)
    add_subdirectory(tests)
endif()