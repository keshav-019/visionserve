#pragma once

#include <memory>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace visionserve::inference {

// An in-memory, per-task lookup of registered models by name, with alias
// resolution and a default. Deliberately minimal — no persistence, no
// versioning, no lifecycle states; Phase 13's full model registry replaces
// this with a PostgreSQL-backed manifest system (load/activate/deactivate/
// warm/unload, version switching without dropping requests, ...). This is
// just enough for "task-based model resolution" (one ModelRegistry
// instantiation per task interface, e.g. ModelRegistry<IDetectionModel>)
// and "default models" to hold today.
template <typename ModelInterfaceT>
class ModelRegistry {
   public:
    // Registers `model` under `name`. The first model registered becomes
    // the default automatically — single-model deployments (all of them,
    // today) never need to think about defaults explicitly.
    void registerModel(std::string name, std::shared_ptr<ModelInterfaceT> model) {
        if (models_.empty()) {
            defaultName_ = name;
        }
        models_.emplace(std::move(name), std::move(model));
    }

    void addAlias(std::string alias, std::string name) {
        aliases_.emplace(std::move(alias), std::move(name));
    }

    // Resolves a registered name or alias; nullptr if neither is known.
    [[nodiscard]] std::shared_ptr<ModelInterfaceT> resolve(const std::string& nameOrAlias) const {
        const auto aliasIt = aliases_.find(nameOrAlias);
        const std::string& name = (aliasIt != aliases_.end()) ? aliasIt->second : nameOrAlias;
        const auto modelIt = models_.find(name);
        return (modelIt != models_.end()) ? modelIt->second : nullptr;
    }

    // The default model for this task, or nullptr if none registered.
    [[nodiscard]] std::shared_ptr<ModelInterfaceT> defaultModel() const {
        return resolve(defaultName_);
    }

    [[nodiscard]] std::vector<std::string> registeredNames() const {
        std::vector<std::string> names;
        names.reserve(models_.size());
        for (const auto& [name, model] : models_) {
            names.push_back(name);
        }
        return names;
    }

   private:
    std::unordered_map<std::string, std::shared_ptr<ModelInterfaceT>> models_;
    std::unordered_map<std::string, std::string> aliases_;
    std::string defaultName_;
};

}  // namespace visionserve::inference
