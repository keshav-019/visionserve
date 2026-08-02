#include <chrono>
#include <cmath>
#include <filesystem>
#include <iostream>
#include <opencv2/core.hpp>
#include <opencv2/imgcodecs.hpp>
#include <opencv2/imgproc.hpp>
#include <optional>
#include <span>
#include <string>
#include <string_view>
#include <vector>

namespace {

namespace fs = std::filesystem;

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

// Measures elapsed wall-clock time for a single processing stage, in milliseconds.
class Stopwatch {
   public:
    void restart() {
        start_ = std::chrono::steady_clock::now();
    }
    double elapsedMs() const {
        return std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - start_)
            .count();
    }

   private:
    std::chrono::steady_clock::time_point start_{std::chrono::steady_clock::now()};
};

std::optional<std::string> findOption(std::span<const std::string> args, std::string_view name) {
    for (std::size_t i = 0; i + 1 < args.size(); ++i) {
        if (args[i] == name) {
            return args[i + 1];
        }
    }
    return std::nullopt;
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

    Stopwatch stopwatch;
    const cv::Mat image = cv::imread(path, cv::IMREAD_UNCHANGED);
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

    Stopwatch stopwatch;
    const cv::Mat image = cv::imread(path, cv::IMREAD_UNCHANGED);
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

    Stopwatch stopwatch;
    const cv::Mat image = cv::imread(inputPath, cv::IMREAD_UNCHANGED);
    if (image.empty()) {
        printError("could not decode image: " + inputPath);
        return 1;
    }
    const double decodeMs = stopwatch.elapsedMs();

    int targetWidth = image.cols;
    int targetHeight = image.rows;
    try {
        if (widthOpt && heightOpt) {
            targetWidth = std::stoi(*widthOpt);
            targetHeight = std::stoi(*heightOpt);
        } else if (widthOpt) {
            targetWidth = std::stoi(*widthOpt);
            targetHeight = static_cast<int>(
                std::llround(static_cast<double>(image.rows) * targetWidth / image.cols));
        } else {
            targetHeight = std::stoi(*heightOpt);
            targetWidth = static_cast<int>(
                std::llround(static_cast<double>(image.cols) * targetHeight / image.rows));
        }
    } catch (const std::exception&) {
        printError("--width/--height must be positive integers");
        return 1;
    }
    if (targetWidth <= 0 || targetHeight <= 0) {
        printError("--width/--height must be positive integers");
        return 1;
    }

    stopwatch.restart();
    cv::Mat resized;
    cv::resize(image, resized, cv::Size(targetWidth, targetHeight), 0, 0, cv::INTER_AREA);
    const double resizeMs = stopwatch.elapsedMs();

    stopwatch.restart();
    if (!cv::imwrite(outputPath, resized)) {
        printError("could not write output image: " + outputPath);
        return 1;
    }
    const double encodeMs = stopwatch.elapsedMs();

    std::cout << "output: " << outputPath << '\n'
              << "width: " << targetWidth << '\n'
              << "height: " << targetHeight << '\n'
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

    Stopwatch stopwatch;
    const cv::Mat image = cv::imread(inputPath, cv::IMREAD_COLOR);
    if (image.empty()) {
        printError("could not decode image: " + inputPath);
        return 1;
    }
    const double decodeMs = stopwatch.elapsedMs();

    stopwatch.restart();
    cv::Mat gray;
    cv::cvtColor(image, gray, cv::COLOR_BGR2GRAY);
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
