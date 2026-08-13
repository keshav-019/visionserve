#include "visionserve/inference/model_registry.hpp"

#include <gtest/gtest.h>

#include <algorithm>
#include <memory>
#include <string>

namespace visionserve::inference {
namespace {

class FakeModel {
   public:
    explicit FakeModel(std::string id) : id_(std::move(id)) {}
    [[nodiscard]] const std::string& id() const {
        return id_;
    }

   private:
    std::string id_;
};

TEST(ModelRegistryTest, ResolvesRegisteredModelByName) {
    ModelRegistry<FakeModel> registry;
    auto model = std::make_shared<FakeModel>("a");
    registry.registerModel("a", model);
    EXPECT_EQ(registry.resolve("a"), model);
}

TEST(ModelRegistryTest, ResolveUnknownNameReturnsNull) {
    ModelRegistry<FakeModel> registry;
    EXPECT_EQ(registry.resolve("missing"), nullptr);
}

TEST(ModelRegistryTest, FirstRegisteredModelBecomesDefault) {
    ModelRegistry<FakeModel> registry;
    auto a = std::make_shared<FakeModel>("a");
    auto b = std::make_shared<FakeModel>("b");
    registry.registerModel("a", a);
    registry.registerModel("b", b);
    EXPECT_EQ(registry.defaultModel(), a);
}

TEST(ModelRegistryTest, DefaultModelIsNullWhenEmpty) {
    ModelRegistry<FakeModel> registry;
    EXPECT_EQ(registry.defaultModel(), nullptr);
}

TEST(ModelRegistryTest, AliasResolvesToUnderlyingModel) {
    ModelRegistry<FakeModel> registry;
    auto model = std::make_shared<FakeModel>("canonical");
    registry.registerModel("canonical", model);
    registry.addAlias("nickname", "canonical");
    EXPECT_EQ(registry.resolve("nickname"), model);
}

TEST(ModelRegistryTest, RegisteredNamesListsEveryModel) {
    ModelRegistry<FakeModel> registry;
    registry.registerModel("a", std::make_shared<FakeModel>("a"));
    registry.registerModel("b", std::make_shared<FakeModel>("b"));
    const auto names = registry.registeredNames();
    EXPECT_EQ(names.size(), 2U);
    EXPECT_NE(std::find(names.begin(), names.end(), "a"), names.end());
    EXPECT_NE(std::find(names.begin(), names.end(), "b"), names.end());
}

}  // namespace
}  // namespace visionserve::inference
