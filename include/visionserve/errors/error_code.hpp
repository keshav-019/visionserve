#pragma once

#include <string_view>

namespace visionserve::errors {

// Protocol-agnostic error taxonomy — deliberately has no dependency on Drogon
// or any other transport, so the same codes can back HTTP error responses
// today and gRPC statuses later (Phase 18) without duplicating the list.
// api_server/error_response.hpp is the HTTP-specific adapter that maps these
// onto drogon::HttpStatusCode.
enum class ErrorCode {
    InvalidRequest,        // malformed request: bad multipart body, bad parameters
    MissingFile,           // no file part in the upload
    UnsupportedMediaType,  // declared/detected type isn't an allowed image format
    FileTooLarge,          // upload exceeds the configured per-file limit
    PixelLimitExceeded,    // decoded image exceeds the configured pixel-count limit
    InvalidImage,          // file signature or OpenCV decode failed
    ModelNotReady,         // the requested model failed to load or hasn't finished loading
    InferenceFailed,       // the model loaded, but a run against it threw/failed
    InternalError,         // anything unexpected; never crash the process
};

// Stable, machine-readable name (e.g. "INVALID_IMAGE") — this is the exact
// string that appears in the standard error response's error.code field.
std::string_view errorCodeName(ErrorCode code);

}  // namespace visionserve::errors
