#include "visionserve/concurrency/thread_pool.hpp"

#include <gtest/gtest.h>

#include <atomic>
#include <chrono>
#include <future>
#include <stdexcept>
#include <thread>
#include <vector>

namespace visionserve::concurrency {
namespace {

using namespace std::chrono_literals;

TEST(ThreadPoolTest, SubmitReturnsResult) {
    ThreadPool pool{2, 4};
    auto sum = pool.submit([](int a, int b) { return a + b; }, 2, 3);
    EXPECT_EQ(sum.get(), 5);
}

TEST(ThreadPoolTest, SubmitPropagatesExceptions) {
    ThreadPool pool{2, 4};
    auto failing = pool.submit([]() -> int { throw std::runtime_error{"boom"}; });
    EXPECT_THROW(failing.get(), std::runtime_error);
}

TEST(ThreadPoolTest, RunsManyTasksAcrossWorkers) {
    ThreadPool pool{4, 32};
    std::atomic<int> counter{0};
    std::vector<std::future<void>> futures;
    for (int i = 0; i < 50; ++i) {
        futures.push_back(
            pool.submit([&counter] { counter.fetch_add(1, std::memory_order_relaxed); }));
    }
    for (auto& future : futures) {
        future.get();
    }
    EXPECT_EQ(counter.load(), 50);
}

TEST(ThreadPoolTest, ThrowPolicyRejectsWhenQueueIsFull) {
    ThreadPool pool{1, 1, ThreadPool::RejectionPolicy::Throw};

    std::promise<void> startedPromise;
    std::future<void> started = startedPromise.get_future();
    std::promise<void> releasePromise;
    std::shared_future<void> release = releasePromise.get_future().share();

    // Occupies the sole worker until released, so the queue behind it is
    // deterministically empty (capacity 1) once `started` fires.
    auto blocking = pool.submit([&startedPromise, release] {
        startedPromise.set_value();
        release.wait();
    });
    started.wait();

    auto filler = pool.submit([] { return 1; });  // fills the one queue slot
    EXPECT_THROW(pool.submit([] { return 2; }), TaskRejectedException);

    releasePromise.set_value();
    EXPECT_NO_THROW(blocking.get());
    EXPECT_EQ(filler.get(), 1);
}

TEST(ThreadPoolTest, ShutdownDrainsQueuedTasks) {
    ThreadPool pool{2, 16};
    std::atomic<int> counter{0};
    std::vector<std::future<void>> futures;
    for (int i = 0; i < 10; ++i) {
        futures.push_back(
            pool.submit([&counter] { counter.fetch_add(1, std::memory_order_relaxed); }));
    }

    pool.shutdown();

    for (auto& future : futures) {
        EXPECT_NO_THROW(future.get());
    }
    EXPECT_EQ(counter.load(), 10);
}

TEST(ThreadPoolTest, ShutdownNowDiscardsQueuedTasks) {
    ThreadPool pool{1, 4};

    std::promise<void> startedPromise;
    std::future<void> started = startedPromise.get_future();

    // Wait for the worker to actually dequeue and start this task before
    // submitting more: otherwise shutdown_now() could race ahead of the
    // worker entirely and clear() would discard `running` too, since it
    // would still be sitting in the queue rather than executing.
    auto running = pool.submit([&startedPromise] {
        startedPromise.set_value();
        std::this_thread::sleep_for(200ms);
    });
    started.wait();

    auto queuedA = pool.submit([] { return 1; });
    auto queuedB = pool.submit([] { return 2; });

    pool.shutdown_now();

    EXPECT_NO_THROW(running.get());
    EXPECT_THROW(queuedA.get(), std::future_error);
    EXPECT_THROW(queuedB.get(), std::future_error);
}

TEST(ThreadPoolTest, StatsReportWorkerCount) {
    ThreadPool pool{3, 4};
    EXPECT_EQ(pool.stats().worker_count, 3u);
}

TEST(ThreadPoolTest, StatsCountCompletedTasks) {
    ThreadPool pool{2, 8};
    std::vector<std::future<void>> futures;
    for (int i = 0; i < 5; ++i) {
        futures.push_back(pool.submit([] {}));
    }
    for (auto& future : futures) {
        future.get();
    }
    pool.shutdown();
    EXPECT_EQ(pool.stats().tasks_completed, 5u);
}

}  // namespace
}  // namespace visionserve::concurrency
