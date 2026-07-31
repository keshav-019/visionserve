#include <iostream>
#include <string_view>

namespace {

constexpr std::string_view kProjectName{"VisionServe"};
constexpr std::string_view kVersion{"0.1.0"};

}  // namespace

int main() {
    std::cout << kProjectName
              << " development environment is ready.\n"
              << "Version: "
              << kVersion
              << '\n';

    return 0;
}