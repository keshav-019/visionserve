#include "visionserve/imaging/format.hpp"

#include <gtest/gtest.h>

namespace visionserve::imaging {
namespace {

using namespace std::string_view_literals;

TEST(DetectFormatTest, RecognizesJpeg) {
    EXPECT_EQ(detectFormat("\xFF\xD8\xFFrest-of-file"sv), "jpeg");
}

TEST(DetectFormatTest, RecognizesPng) {
    EXPECT_EQ(detectFormat("\x89PNG\r\n\x1A\nrest-of-file"sv), "png");
}

TEST(DetectFormatTest, RecognizesBmp) {
    EXPECT_EQ(detectFormat("BMrest-of-file"sv), "bmp");
}

TEST(DetectFormatTest, RecognizesWebp) {
    EXPECT_EQ(detectFormat("RIFF\x00\x00\x00\x00WEBPrest-of-file"sv), "webp");
}

TEST(DetectFormatTest, RejectsUnrecognizedBytes) {
    EXPECT_EQ(detectFormat("hello world"sv), std::nullopt);
}

TEST(DetectFormatTest, RejectsEmptyInput) {
    EXPECT_EQ(detectFormat(""sv), std::nullopt);
}

TEST(DetectFormatTest, RejectsRiffContainerThatIsNotWebp) {
    // A RIFF-format file that isn't WEBP (e.g. WAV) should not be misidentified.
    EXPECT_EQ(detectFormat("RIFF\x00\x00\x00\x00WAVErest"sv), std::nullopt);
}

TEST(DetectFormatTest, RejectsTruncatedSignature) {
    EXPECT_EQ(detectFormat("\xFF\xD8"sv), std::nullopt);  // only 2 of 3 JPEG signature bytes
}

}  // namespace
}  // namespace visionserve::imaging
