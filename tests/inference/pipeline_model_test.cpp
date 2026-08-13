#include "visionserve/inference/pipeline_model.hpp"

#include <gtest/gtest.h>

#include <memory>
#include <opencv2/core.hpp>
#include <string>

namespace visionserve::inference {
namespace {

struct FakeOptions {
    int multiplier = 1;
};

struct FakeResult {
    float value = 0.0F;
    InferenceTiming timing;
};

class FakePreprocessor : public IPreprocessor {
   public:
    mutable int callCount = 0;

    [[nodiscard]] Tensor preprocess(const cv::Mat& image) const override {
        ++callCount;
        Tensor tensor;
        tensor.data = {static_cast<float>(image.cols)};
        tensor.shape = {1};
        return tensor;
    }
};

class FakeSession : public IInferenceSession {
   public:
    bool ready = true;
    std::string error;
    mutable int callCount = 0;

    [[nodiscard]] Tensor run(const Tensor& input) const override {
        ++callCount;
        Tensor output;
        output.data = {input.data.front() * 2.0F};
        output.shape = {1};
        return output;
    }
    [[nodiscard]] bool isReady() const noexcept override {
        return ready;
    }
    [[nodiscard]] std::string_view loadError() const noexcept override {
        return error;
    }
};

class FakePostprocessor : public IPostprocessor<FakeResult, FakeOptions> {
   public:
    mutable int callCount = 0;

    [[nodiscard]] FakeResult postprocess(const Tensor& rawOutput, const ImageMetadata&,
                                         const FakeOptions& options) const override {
        ++callCount;
        FakeResult result;
        result.value = rawOutput.data.front() * static_cast<float>(options.multiplier);
        return result;
    }
};

struct Fixture {
    std::shared_ptr<FakePreprocessor> preprocessor = std::make_shared<FakePreprocessor>();
    std::shared_ptr<FakeSession> session = std::make_shared<FakeSession>();
    std::shared_ptr<FakePostprocessor> postprocessor = std::make_shared<FakePostprocessor>();

    [[nodiscard]] PipelineModel<FakeResult, FakeOptions> makeModel(ModelMetadata metadata = {
                                                                       "id", "name", "task",
                                                                       "v1"}) const {
        return PipelineModel<FakeResult, FakeOptions>(std::move(metadata), preprocessor, session,
                                                      postprocessor);
    }
};

TEST(PipelineModelTest, RunsStagesInOrderAndReturnsComposedResult) {
    Fixture fixture;
    const auto model = fixture.makeModel();

    const cv::Mat image(10, 20, CV_8UC3);  // cols == 20
    const FakeResult result = model.run(image, FakeOptions{3});

    EXPECT_EQ(fixture.preprocessor->callCount, 1);
    EXPECT_EQ(fixture.session->callCount, 1);
    EXPECT_EQ(fixture.postprocessor->callCount, 1);
    // preprocess -> {20}; session doubles -> 40; postprocess * multiplier(3) -> 120.
    EXPECT_FLOAT_EQ(result.value, 120.0F);
}

TEST(PipelineModelTest, TimingFieldsArePopulated) {
    Fixture fixture;
    const auto model = fixture.makeModel();

    const cv::Mat image(5, 5, CV_8UC3);
    const FakeResult result = model.run(image, FakeOptions{});

    EXPECT_GE(result.timing.preprocessMs, 0.0);
    EXPECT_GE(result.timing.inferenceMs, 0.0);
    EXPECT_GE(result.timing.postprocessMs, 0.0);
}

TEST(PipelineModelTest, IsReadyAndLoadErrorDelegateToSession) {
    Fixture fixture;
    fixture.session->ready = false;
    fixture.session->error = "boom";
    const auto model = fixture.makeModel();

    EXPECT_FALSE(model.isReady());
    EXPECT_EQ(model.loadError(), "boom");
}

TEST(PipelineModelTest, MetadataIsAccessible) {
    Fixture fixture;
    const auto model = fixture.makeModel(ModelMetadata{"id", "name", "detection", "v2"});

    EXPECT_EQ(model.metadata().task, "detection");
    EXPECT_EQ(model.metadata().version, "v2");
}

}  // namespace
}  // namespace visionserve::inference
