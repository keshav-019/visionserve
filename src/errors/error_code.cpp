#include "visionserve/errors/error_code.hpp"

namespace visionserve::errors {

std::string_view errorCodeName(ErrorCode code) {
    switch (code) {
        case ErrorCode::InvalidRequest:
            return "INVALID_REQUEST";
        case ErrorCode::MissingFile:
            return "MISSING_FILE";
        case ErrorCode::UnsupportedMediaType:
            return "UNSUPPORTED_MEDIA_TYPE";
        case ErrorCode::FileTooLarge:
            return "FILE_TOO_LARGE";
        case ErrorCode::PixelLimitExceeded:
            return "PIXEL_LIMIT_EXCEEDED";
        case ErrorCode::InvalidImage:
            return "INVALID_IMAGE";
        case ErrorCode::InternalError:
            return "INTERNAL_ERROR";
    }
    return "UNKNOWN_ERROR";
}

}  // namespace visionserve::errors
