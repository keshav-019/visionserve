#include <filesystem>
#include <fstream>
#include <iostream>
#include <iterator>
#include <opencv2/core.hpp>
#include <opencv2/imgcodecs.hpp>
#include <optional>
#include <span>
#include <string>
#include <string_view>
#include <vector>

#include "visionserve/common/timing.hpp"
#include "visionserve/imaging/decode.hpp"
#include "visionserve/imaging/grayscale.hpp"
#include "visionserve/imaging/resize.hpp"

namespace {

namespace fs = std::filesystem;
using visionserve::common::Stopwatch;

constexpr std::string_view kUsage =
    "visionserve-image \xe2\x80\x94 VisionServe image utilities\n"
    "\n"
    "Usage:\n"
    "  visionserve-image metadata <image>\n"
    "  visionserve-image resize <image> <output> --width <px> [--height <px>]\n"
    "  visionserve-image resize <image> <output> --height <px>\n"
    "  visionserve-image grayscale <image> <output>\n"
    "  visionserve-image validate <image>\n";

void printError(std::string_view message) {
    std::cerr << "error: " << message << '\n';
}

std::optional<std::string> findOption(std::span<const std::string> args, std::string_view name) {
    for (std::size_t i = 0; i + 1 < args.size(); ++i) {
        if (args[i] == name) {
            return args[i + 1];
        }
    }
    return std::nullopt;
}

// Reads a whole file into memory so the CLI can go through the same
// bytes-in decode path (visionserve::imaging::decode) as the HTTP endpoints,
// rather than a separate cv::imread(path)-based one.
std::optional<std::string> readFile(const std::string& path) {
    std::ifstream file{path, std::ios::binary};
    if (!file) {
        return std::nullopt;
    }
    return std::string{std::istreambuf_iterator<char>{file}, std::istreambuf_iterator<char>{}};
}

int runMetadata(std::span<const std::string> args) {
    if (args.empty()) {
        printError("metadata requires an <image> argument");
        return 1;
    }
    const std::string& path = args[0];
    if (!fs::exists(path)) {
        printError("file not found: " + path);
        return 1;
    }

    const auto bytes = readFile(path);
    if (!bytes) {
        printError("could not read file: " + path);
        return 1;
    }

    Stopwatch stopwatch;
    const cv::Mat image = visionserve::imaging::decode(*bytes);
    const double decodeMs = stopwatch.elapsedMs();

    if (image.empty()) {
        printError("could not decode image: " + path);
        return 1;
    }

    std::error_code ec;
    const auto fileSize = fs::file_size(path, ec);

    std::cout << "path: " << path << '\n'
              << "width: " << image.cols << '\n'
              << "height: " << image.rows << '\n'
              << "channels: " << image.channels() << '\n'
              << "depth_bits: " << (8 * static_cast<int>(image.elemSize1())) << '\n'
              << "file_size_bytes: " << (ec ? 0LL : static_cast<long long>(fileSize)) << '\n'
              << "decode_time_ms: " << decodeMs << '\n';
    return 0;
}

int runValidate(std::span<const std::string> args) {
    if (args.empty()) {
        printError("validate requires an <image> argument");
        return 1;
    }
    const std::string& path = args[0];
    if (!fs::exists(path)) {
        std::cout << "valid: false\n";
        printError("file not found: " + path);
        return 1;
    }

    const auto bytes = readFile(path);
    if (!bytes) {
        std::cout << "valid: false\n";
        printError("could not read file: " + path);
        return 1;
    }

    Stopwatch stopwatch;
    const cv::Mat image = visionserve::imaging::decode(*bytes);
    const double decodeMs = stopwatch.elapsedMs();
    const bool valid = !image.empty();

    std::cout << "valid: " << (valid ? "true" : "false") << '\n'
              << "decode_time_ms: " << decodeMs << '\n';
    if (!valid) {
        printError("could not decode image: " + path);
        return 1;
    }
    return 0;
}

int runResize(std::span<const std::string> args) {
    std::vector<std::string> positional;
    for (std::size_t i = 0; i < args.size(); ++i) {
        if (args[i] == "--width" || args[i] == "--height") {
            ++i;  // also skip the option's value; read via findOption below
            continue;
        }
        positional.push_back(args[i]);
    }
    if (positional.size() < 2) {
        printError("resize requires <image> <output> and --width and/or --height");
        return 1;
    }
    const std::string& inputPath = positional[0];
    const std::string& outputPath = positional[1];

    const auto widthOpt = findOption(args, "--width");
    const auto heightOpt = findOption(args, "--height");
    if (!widthOpt && !heightOpt) {
        printError("resize requires --width and/or --height");
        return 1;
    }

    if (!fs::exists(inputPath)) {
        printError("file not found: " + inputPath);
        return 1;
    }

    const auto bytes = readFile(inputPath);
    if (!bytes) {
        printError("could not read file: " + inputPath);
        return 1;
    }

    Stopwatch stopwatch;
    const cv::Mat image = visionserve::imaging::decode(*bytes);
    if (image.empty()) {
        printError("could not decode image: " + inputPath);
        return 1;
    }
    const double decodeMs = stopwatch.elapsedMs();

    std::optional<int> targetWidth;
    std::optional<int> targetHeight;
    try {
        if (widthOpt) {
            targetWidth = std::stoi(*widthOpt);
        }
        if (heightOpt) {
            targetHeight = std::stoi(*heightOpt);
        }
    } catch (const std::exception&) {
        printError("--width/--height must be positive integers");
        return 1;
    }

    const auto target = visionserve::imaging::computeResizeDimensions({image.cols, image.rows},
                                                                      targetWidth, targetHeight);
    if (!target) {
        printError("--width/--height must be positive integers");
        return 1;
    }

    stopwatch.restart();
    const cv::Mat resized = visionserve::imaging::resize(image, *target);
    const double resizeMs = stopwatch.elapsedMs();

    stopwatch.restart();
    if (!cv::imwrite(outputPath, resized)) {
        printError("could not write output image: " + outputPath);
        return 1;
    }
    const double encodeMs = stopwatch.elapsedMs();

    std::cout << "output: " << outputPath << '\n'
              << "width: " << target->width << '\n'
              << "height: " << target->height << '\n'
              << "decode_time_ms: " << decodeMs << '\n'
              << "resize_time_ms: " << resizeMs << '\n'
              << "encode_time_ms: " << encodeMs << '\n';
    return 0;
}

int runGrayscale(std::span<const std::string> args) {
    if (args.size() < 2) {
        printError("grayscale requires <image> <output>");
        return 1;
    }
    const std::string& inputPath = args[0];
    const std::string& outputPath = args[1];

    if (!fs::exists(inputPath)) {
        printError("file not found: " + inputPath);
        return 1;
    }

    const auto bytes = readFile(inputPath);
    if (!bytes) {
        printError("could not read file: " + inputPath);
        return 1;
    }

    Stopwatch stopwatch;
    const cv::Mat image = visionserve::imaging::decode(*bytes);
    if (image.empty()) {
        printError("could not decode image: " + inputPath);
        return 1;
    }
    const double decodeMs = stopwatch.elapsedMs();

    stopwatch.restart();
    const cv::Mat gray = visionserve::imaging::toGrayscale(image);
    const double convertMs = stopwatch.elapsedMs();

    stopwatch.restart();
    if (!cv::imwrite(outputPath, gray)) {
        printError("could not write output image: " + outputPath);
        return 1;
    }
    const double encodeMs = stopwatch.elapsedMs();

    std::cout << "output: " << outputPath << '\n'
              << "width: " << gray.cols << '\n'
              << "height: " << gray.rows << '\n'
              << "decode_time_ms: " << decodeMs << '\n'
              << "convert_time_ms: " << convertMs << '\n'
              << "encode_time_ms: " << encodeMs << '\n';
    return 0;
}

}  // namespace

int main(int argc, char** argv) {
    const std::vector<std::string> allArgs(argv + (argc > 0 ? 1 : 0), argv + argc);
    if (allArgs.empty()) {
        std::cout << kUsage;
        return 1;
    }

    const std::string& command = allArgs[0];
    const std::span<const std::string> rest{allArgs.begin() + 1, allArgs.end()};

    if (command == "metadata") {
        return runMetadata(rest);
    }
    if (command == "resize") {
        return runResize(rest);
    }
    if (command == "grayscale") {
        return runGrayscale(rest);
    }
    if (command == "validate") {
        return runValidate(rest);
    }
    if (command == "--help" || command == "-h") {
        std::cout << kUsage;
        return 0;
    }

    printError("unknown command: " + command);
    std::cout << kUsage;
    return 1;
}
