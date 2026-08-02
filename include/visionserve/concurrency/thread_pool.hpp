#pragma once

#include <atomic>
#include <chrono>
#include <cstddef>
#include <cstdint>
#include <functional>
#include <future>
#include <memory>
#include <stdexcept>
#include <stop_token>
#include <thread>
#include <type_traits>
#include <utility>
#include <vector>

#include "visionserve/concurrency/bounded_queue.hpp"

namespace visionserve::concurrency {

// Thrown by submit() when a task cannot be enqueued: either the queue is
// full under RejectionPolicy::Throw, or the pool is shutting down.
class TaskRejectedException : public std::runtime_error {
   public:
    using std::runtime_error::runtime_error;
};

// A fixed-size worker pool executing submitted tasks from a bounded queue.
//
// Cancellation model: individual queued tasks aren't preemptible once
// submitted, but shutdown_now() discards every task still sitting in the
// queue (their futures resolve with a broken_promise error) while letting
// whatever is already executing finish. shutdown() instead drains the queue
// before stopping.
class ThreadPool {
   public:
    enum class RejectionPolicy {
        Block,  // submit() blocks until space is available (default)
        Throw,  // submit() throws TaskRejectedException if the queue is full
    };

    struct Stats {
        std::size_t worker_count{};
        std::size_t queued_tasks{};
        std::uint64_t tasks_completed{};
        std::uint64_t tasks_rejected{};
        std::chrono::nanoseconds average_queue_wait{0};
    };

    explicit ThreadPool(std::size_t workerCount, std::size_t queueCapacity,
                        RejectionPolicy policy = RejectionPolicy::Block)
        : queue_{queueCapacity}, policy_{policy} {
        workers_.reserve(workerCount);
        for (std::size_t i = 0; i < workerCount; ++i) {
            workers_.emplace_back([this](std::stop_token token) { workerLoop(token); });
        }
    }

    ThreadPool(const ThreadPool&) = delete;
    ThreadPool& operator=(const ThreadPool&) = delete;

    ~ThreadPool() {
        shutdown();
    }

    template <typename F, typename... Args>
    auto submit(F&& f, Args&&... args)
        -> std::future<std::invoke_result_t<std::decay_t<F>, std::decay_t<Args>...>> {
        using ReturnType = std::invoke_result_t<std::decay_t<F>, std::decay_t<Args>...>;

        auto task = std::make_shared<std::packaged_task<ReturnType()>>(
            [func = std::forward<F>(f), ... boundArgs = std::forward<Args>(args)]() mutable {
                return std::invoke(std::move(func), std::move(boundArgs)...);
            });
        std::future<ReturnType> future = task->get_future();

        const auto enqueuedAt = std::chrono::steady_clock::now();
        Task wrapper = [this, task, enqueuedAt]() {
            const auto waited = std::chrono::steady_clock::now() - enqueuedAt;
            total_queue_wait_ns_.fetch_add(
                static_cast<std::uint64_t>(
                    std::chrono::duration_cast<std::chrono::nanoseconds>(waited).count()),
                std::memory_order_relaxed);
            (*task)();
            completed_.fetch_add(1, std::memory_order_relaxed);
        };

        const bool accepted = policy_ == RejectionPolicy::Block
                                  ? queue_.push(std::move(wrapper))
                                  : queue_.try_push(std::move(wrapper));
        if (!accepted) {
            rejected_.fetch_add(1, std::memory_order_relaxed);
            throw TaskRejectedException{
                "ThreadPool could not accept task: queue full or pool shutting down"};
        }
        return future;
    }

    // Stops accepting new tasks and lets queued tasks finish before joining
    // the workers.
    void shutdown() {
        shutdownImpl(/*discardPending=*/false);
    }

    // Stops accepting new tasks, discards whatever is still queued (their
    // futures fail with a broken_promise error), and joins the workers once
    // any in-flight task completes.
    void shutdown_now() {
        shutdownImpl(/*discardPending=*/true);
    }

    Stats stats() const {
        const auto completed = completed_.load(std::memory_order_relaxed);
        const auto totalWaitNs = total_queue_wait_ns_.load(std::memory_order_relaxed);
        return Stats{
            .worker_count = workers_.size(),
            .queued_tasks = queue_.size(),
            .tasks_completed = completed,
            .tasks_rejected = rejected_.load(std::memory_order_relaxed),
            .average_queue_wait =
                std::chrono::nanoseconds{
                    completed == 0 ? 0 : static_cast<std::int64_t>(totalWaitNs / completed)},
        };
    }

   private:
    using Task = std::function<void()>;

    void workerLoop(std::stop_token token) {
        while (true) {
            std::optional<Task> task = queue_.pop(token);
            if (!task.has_value()) {
                return;
            }
            (*task)();
        }
    }

    void shutdownImpl(bool discardPending) {
        if (shutdownStarted_.exchange(true)) {
            return;
        }
        queue_.close();
        if (discardPending) {
            queue_.clear();
        }
        for (auto& worker : workers_) {
            worker.request_stop();
        }
        for (auto& worker : workers_) {
            if (worker.joinable()) {
                worker.join();
            }
        }
    }

    BoundedQueue<Task> queue_;
    RejectionPolicy policy_;
    std::vector<std::jthread> workers_;
    std::atomic<bool> shutdownStarted_{false};
    std::atomic<std::uint64_t> completed_{0};
    std::atomic<std::uint64_t> rejected_{0};
    std::atomic<std::uint64_t> total_queue_wait_ns_{0};
};

}  // namespace visionserve::concurrency
