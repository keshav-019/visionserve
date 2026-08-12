# Downloads a prebuilt ONNX Runtime CPU release straight from Microsoft's
# GitHub releases instead of building it via vcpkg. vcpkg's onnxruntime port
# compiles ONNX Runtime and its entire dependency tree (protobuf, abseil,
# onnx, re2, eigen3, flatbuffers, ...) from source, which would add well
# over an hour to every CI build; the prebuilt archive is a few dozen
# megabytes and needs no build step. Defines onnxruntime::onnxruntime and
# visionserve_copy_onnxruntime_runtime() for callers to place the shared
# library next to their output binary (vcpkg's applocal deployment does this
# automatically for vcpkg-managed DLLs, but this dependency bypasses vcpkg).

set(VISIONSERVE_ONNXRUNTIME_VERSION
    "1.29.0"
    CACHE STRING "ONNX Runtime release version to download"
)

if(WIN32)
    set(_ort_dir_name "onnxruntime-win-x64-${VISIONSERVE_ONNXRUNTIME_VERSION}")
    set(_ort_archive "${_ort_dir_name}.zip")
elseif(UNIX AND NOT APPLE)
    set(_ort_dir_name "onnxruntime-linux-x64-${VISIONSERVE_ONNXRUNTIME_VERSION}")
    set(_ort_archive "${_ort_dir_name}.tgz")
else()
    message(FATAL_ERROR "No prebuilt ONNX Runtime archive is configured for this platform")
endif()

set(_ort_root "${CMAKE_BINARY_DIR}/_deps/onnxruntime")
set(_ort_extracted "${_ort_root}/${_ort_dir_name}")
set(_ort_archive_path "${_ort_root}/${_ort_archive}")
set(_ort_url
    "https://github.com/microsoft/onnxruntime/releases/download/v${VISIONSERVE_ONNXRUNTIME_VERSION}/${_ort_archive}"
)

if(NOT EXISTS "${_ort_extracted}")
    file(MAKE_DIRECTORY "${_ort_root}")
    message(STATUS "Downloading ONNX Runtime ${VISIONSERVE_ONNXRUNTIME_VERSION} from ${_ort_url}")
    file(
        DOWNLOAD "${_ort_url}" "${_ort_archive_path}"
        STATUS _ort_download_status
        TLS_VERIFY ON
    )
    list(GET _ort_download_status 0 _ort_download_code)
    if(NOT _ort_download_code EQUAL 0)
        list(GET _ort_download_status 1 _ort_download_message)
        file(REMOVE "${_ort_archive_path}")
        message(FATAL_ERROR "Failed to download ONNX Runtime: ${_ort_download_message}")
    endif()
    file(ARCHIVE_EXTRACT INPUT "${_ort_archive_path}" DESTINATION "${_ort_root}")
    file(REMOVE "${_ort_archive_path}")
endif()

add_library(onnxruntime::onnxruntime SHARED IMPORTED)
# SYSTEM so -Wall/-Wextra/-Wpedantic/-Wconversion/-Wshadow (and MSVC /W4)
# don't fire on warnings inside onnxruntime's own headers.
target_include_directories(
    onnxruntime::onnxruntime SYSTEM
    INTERFACE
        "${_ort_extracted}/include"
)

if(WIN32)
    set_target_properties(
        onnxruntime::onnxruntime
        PROPERTIES
            IMPORTED_LOCATION "${_ort_extracted}/lib/onnxruntime.dll"
            IMPORTED_IMPLIB "${_ort_extracted}/lib/onnxruntime.lib"
    )
    set(VISIONSERVE_ONNXRUNTIME_RUNTIME_FILES
        "${_ort_extracted}/lib/onnxruntime.dll"
        CACHE INTERNAL ""
    )
else()
    set_target_properties(
        onnxruntime::onnxruntime
        PROPERTIES IMPORTED_LOCATION "${_ort_extracted}/lib/libonnxruntime.so"
    )
    file(GLOB _ort_shared_objects "${_ort_extracted}/lib/libonnxruntime.so*")
    set(VISIONSERVE_ONNXRUNTIME_RUNTIME_FILES
        "${_ort_shared_objects}"
        CACHE INTERNAL ""
    )
endif()

# Copies the ONNX Runtime shared library (and, on Linux, its versioned
# symlinks) next to `target`'s output binary after each build, so the
# dynamic linker finds it at run time without requiring an install step or
# LD_LIBRARY_PATH/PATH changes. Windows' default DLL search order already
# includes the executable's own directory; Linux's does not, so this also
# points `target`'s build-tree rpath at "$ORIGIN" (its own directory).
function(visionserve_copy_onnxruntime_runtime target)
    foreach(_file ${VISIONSERVE_ONNXRUNTIME_RUNTIME_FILES})
        add_custom_command(
            TARGET ${target}
            POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E copy_if_different "${_file}" "$<TARGET_FILE_DIR:${target}>"
        )
    endforeach()
    if(NOT WIN32)
        set_target_properties(${target} PROPERTIES BUILD_RPATH "$ORIGIN")
    endif()
endfunction()
