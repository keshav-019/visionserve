#include "visionserve/concurrency/bounded_queue.hpp"

#include <gtest/gtest.h>

#include <atomic>
#include <chrono>
#include <memory>
#include <stop_token>
#include <thread>

namespace visionserve::concurrency {
namespace {

using namespace std::chrono_literals;

TEST(BoundedQueueTest, PreservesFifoOrder) {
    BoundedQueue<int> queue{4};
    ASSERT_TRUE(queue.try_push(1));
    ASSERT_TRUE(queue.try_push(2));
    ASSERT_TRUE(queue.try_push(3));

    EXPECT_EQ(queue.try_pop(), std::optional{1});
    EXPECT_EQ(queue.try_pop(), std::optional{2});
    EXPECT_EQ(queue.try_pop(), std::optional{3});
    EXPECT_EQ(queue.try_pop(), std::nullopt);
}

TEST(BoundedQueueTest, TryPushFailsWhenFull) {
    BoundedQueue<int> queue{2};
    EXPECT_TRUE(queue.try_push(1));
    EXPECT_TRUE(queue.try_push(2));
    EXPECT_FALSE(queue.try_push(3));
    EXPECT_EQ(queue.size(), 2u);
}

TEST(BoundedQueueTest, TryPopFailsWhenEmpty) {
    BoundedQueue<int> queue{2};
    EXPECT_EQ(queue.try_pop(), std::nullopt);
}

TEST(BoundedQueueTest, BlockingPushWaitsForSpace) {
    BoundedQueue<int> queue{1};
    ASSERT_TRUE(queue.try_push(0));

    std::atomic<bool> pushed{false};
    std::jthread producer([&] {
        EXPECT_TRUE(queue.push(1));
        pushed.store(true);
    });

    std::this_thread::sleep_for(20ms);
    EXPECT_FALSE(pushed.load()) << "push should still be blocked while the queue is full";

    EXPECT_EQ(queue.try_pop(), std::optional{0});
    producer.join();
    EXPECT_TRUE(pushed.load());
    EXPECT_EQ(queue.try_pop(), std::optional{1});
}

TEST(BoundedQueueTest, BlockingPopWaitsForItem) {
    BoundedQueue<int> queue{2};

    std::optional<int> received;
    std::jthread consumer([&] { received = queue.pop(); });

    std::this_thread::sleep_for(20ms);
    EXPECT_FALSE(received.has_value()) << "pop should still be blocked on an empty queue";

    ASSERT_TRUE(queue.push(42));
    consumer.join();
    ASSERT_TRUE(received.has_value());
    EXPECT_EQ(*received, 42);
}

TEST(BoundedQueueTest, CloseDrainsRemainingItemsThenReturnsNullopt) {
    BoundedQueue<int> queue{4};
    ASSERT_TRUE(queue.try_push(1));
    ASSERT_TRUE(queue.try_push(2));

    queue.close();

    EXPECT_FALSE(queue.try_push(3)) << "push should be rejected once closed";
    EXPECT_EQ(queue.pop(), std::optional{1});
    EXPECT_EQ(queue.pop(), std::optional{2});
    EXPECT_EQ(queue.pop(), std::nullopt) << "closed and drained queue should stop blocking";
}

TEST(BoundedQueueTest, ClearDiscardsPendingItems) {
    BoundedQueue<int> queue{4};
    ASSERT_TRUE(queue.try_push(1));
    ASSERT_TRUE(queue.try_push(2));

    queue.clear();

    EXPECT_EQ(queue.size(), 0u);
    EXPECT_TRUE(queue.try_push(3));
}

TEST(BoundedQueueTest, MetricsTrackCounts) {
    BoundedQueue<int> queue{1};
    EXPECT_TRUE(queue.try_push(1));
    EXPECT_FALSE(queue.try_push(2));  // rejected: full
    EXPECT_TRUE(queue.try_pop().has_value());
    EXPECT_FALSE(queue.try_pop().has_value());  // not counted as rejected, just empty

    const auto metrics = queue.metrics();
    EXPECT_EQ(metrics.capacity, 1u);
    EXPECT_EQ(metrics.pushed_total, 1u);
    EXPECT_EQ(metrics.popped_total, 1u);
    EXPECT_EQ(metrics.rejected_total, 1u);
}

TEST(BoundedQueueTest, SupportsMoveOnlyValues) {
    BoundedQueue<std::unique_ptr<int>> queue{2};
    ASSERT_TRUE(queue.push(std::make_unique<int>(7)));

    auto popped = queue.pop();
    ASSERT_TRUE(popped.has_value());
    ASSERT_NE(*popped, nullptr);
    EXPECT_EQ(**popped, 7);
}

TEST(BoundedQueueTest, StopTokenCancelsBlockedPop) {
    BoundedQueue<int> queue{1};
    std::stop_source source;

    std::optional<int> result{42};  // pre-seeded so we can detect it was overwritten to nullopt
    std::jthread consumer([&] { result = queue.pop(source.get_token()); });

    std::this_thread::sleep_for(20ms);
    source.request_stop();
    consumer.join();

    EXPECT_EQ(result, std::nullopt);
}

TEST(BoundedQueueTest, StopTokenCancelsBlockedPush) {
    BoundedQueue<int> queue{1};
    ASSERT_TRUE(queue.try_push(0));  // fill capacity so the next push must block

    std::stop_source source;
    std::optional<bool> result;
    std::jthread producer([&] { result = queue.push(1, source.get_token()); });

    std::this_thread::sleep_for(20ms);
    source.request_stop();
    producer.join();

    ASSERT_TRUE(result.has_value());
    EXPECT_FALSE(*result);
}

TEST(BoundedQueueTest, PopForTimesOutOnEmptyQueue) {
    BoundedQueue<int> queue{1};
    const auto start = std::chrono::steady_clock::now();
    EXPECT_EQ(queue.pop_for(10ms), std::nullopt);
    EXPECT_GE(std::chrono::steady_clock::now() - start, 10ms);
}

TEST(BoundedQueueTest, PushForTimesOutWhenFull) {
    BoundedQueue<int> queue{1};
    ASSERT_TRUE(queue.try_push(0));
    EXPECT_FALSE(queue.push_for(1, 10ms));
}

}  // namespace
}  // namespace visionserve::concurrency
