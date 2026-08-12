# Downloads model artifacts that are used by the inference pipeline but kept
# out of git (see /models/*.onnx in .gitignore) to keep the repository lean.
# Fetched once into the source tree's models/ directory — the same relative
# path (models/<file>) that visionserve_api expects at run time when started
# from the repo root, per the README's quick-start instructions.

function(visionserve_fetch_model filename url)
    set(_dest "${CMAKE_SOURCE_DIR}/models/${filename}")
    if(EXISTS "${_dest}")
        return()
    endif()
    file(MAKE_DIRECTORY "${CMAKE_SOURCE_DIR}/models")
    message(STATUS "Downloading model ${filename} from ${url}")
    file(
        DOWNLOAD "${url}" "${_dest}"
        STATUS _download_status
        TLS_VERIFY ON
    )
    list(GET _download_status 0 _download_code)
    if(NOT _download_code EQUAL 0)
        list(GET _download_status 1 _download_message)
        file(REMOVE "${_dest}")
        message(FATAL_ERROR "Failed to download model ${filename}: ${_download_message}")
    endif()
endfunction()

visionserve_fetch_model(
    "tinyyolov2-8.onnx"
    "https://github.com/onnx/models/raw/main/validated/vision/object_detection_segmentation/tiny-yolov2/model/tinyyolov2-8.onnx"
)
