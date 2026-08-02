#pragma once

#include <chrono>
#include <condition_variable>
#include <cstddef>
#include <cstdint>
#include <deque>
#include <mutex>
#include <optional>
#include <stop_token>
#include <utility>

namespace visionserve::concurrency {

// A fixed-capacity, thread-safe FIFO queue supporting multiple producers and
// consumers, blocking/non-blocking/timed operations, and cooperative
// cancellation via std::stop_token.
//
// Shutdown semantics: close() stops accepting new pushes (they fail) but
// lets consumers keep draining whatever is already queued; pop() only
// starts returning std::nullopt once the queue is both closed and empty.
// Call clear() as well if pending items should be discarded immediately.
template <typename T>
class BoundedQueue {
   public:
    struct Metrics {
        std::size_t size{};
        std::size_t capacity{};
        std::uint64_t pushed_total{};
        std::uint64_t popped_total{};
        std::uint64_t rejected_total{};
    };

    explicit BoundedQueue(std::size_t capacity) : capacity_{capacity} {}

    BoundedQueue(const BoundedQueue&) = delete;
    BoundedQueue& operator=(const BoundedQueue&) = delete;

    // Blocks until space is available, the queue is closed, or the token is
    // cancelled. Returns false if the push could not be completed.
    bool push(T value, std::stop_token token = {}) {
        std::unique_lock lock{mutex_};
        const bool ready =
            not_full_.wait(lock, token, [this] { return closed_ || items_.size() < capacity_; });
        if (!ready || closed_) {
            ++rejected_total_;
            return false;
        }
        items_.push_back(std::move(value));
        ++pushed_total_;
        lock.unlock();
        not_empty_.notify_one();
        return true;
    }

    // Blocks until an item is available, up to `timeout`. Returns nullopt on
    // timeout, closure-with-empty-queue, or if the queue was never given
    // space to push into within the wait window.
    template <typename Rep, typename Period>
    bool push_for(T value, const std::chrono::duration<Rep, Period>& timeout) {
        std::unique_lock lock{mutex_};
        const bool ready = not_full_.wait_for(
            lock, timeout, [this] { return closed_ || items_.size() < capacity_; });
        if (!ready || closed_) {
            ++rejected_total_;
            return false;
        }
        items_.push_back(std::move(value));
        ++pushed_total_;
        lock.unlock();
        not_empty_.notify_one();
        return true;
    }

    // Never blocks. Returns false if the queue is full or closed.
    bool try_push(T value) {
        std::unique_lock lock{mutex_};
        if (closed_ || items_.size() >= capacity_) {
            ++rejected_total_;
            return false;
        }
        items_.push_back(std::move(value));
        ++pushed_total_;
        lock.unlock();
        not_empty_.notify_one();
        return true;
    }

    // Blocks until an item is available, the queue is closed and drained, or
    // the token is cancelled.
    std::optional<T> pop(std::stop_token token = {}) {
        std::unique_lock lock{mutex_};
        const bool ready =
            not_empty_.wait(lock, token, [this] { return !items_.empty() || closed_; });
        if (!ready || items_.empty()) {
            return std::nullopt;
        }
        return take_front(lock);
    }

    template <typename Rep, typename Period>
    std::optional<T> pop_for(const std::chrono::duration<Rep, Period>& timeout) {
        std::unique_lock lock{mutex_};
        const bool ready =
            not_empty_.wait_for(lock, timeout, [this] { return !items_.empty() || closed_; });
        if (!ready || items_.empty()) {
            return std::nullopt;
        }
        return take_front(lock);
    }

    // Never blocks. Returns nullopt if the queue is currently empty.
    std::optional<T> try_pop() {
        std::unique_lock lock{mutex_};
        if (items_.empty()) {
            return std::nullopt;
        }
        return take_front(lock);
    }

    // Stops accepting new items and wakes every waiter. Items already queued
    // remain poppable until the queue is drained.
    void close() {
        {
            std::lock_guard lock{mutex_};
            closed_ = true;
        }
        not_full_.notify_all();
        not_empty_.notify_all();
    }

    // Discards any pending items. Typically paired with close() for an
    // immediate (rather than drain-to-empty) shutdown.
    void clear() {
        std::lock_guard lock{mutex_};
        items_.clear();
        not_full_.notify_all();
    }

    bool closed() const {
        std::lock_guard lock{mutex_};
        return closed_;
    }

    std::size_t size() const {
        std::lock_guard lock{mutex_};
        return items_.size();
    }

    std::size_t capacity() const {
        return capacity_;
    }

    Metrics metrics() const {
        std::lock_guard lock{mutex_};
        return Metrics{
            .size = items_.size(),
            .capacity = capacity_,
            .pushed_total = pushed_total_,
            .popped_total = popped_total_,
            .rejected_total = rejected_total_,
        };
    }

   private:
    T take_front(std::unique_lock<std::mutex>& lock) {
        T value = std::move(items_.front());
        items_.pop_front();
        ++popped_total_;
        lock.unlock();
        not_full_.notify_one();
        return value;
    }

    mutable std::mutex mutex_;
    std::condition_variable_any not_full_;
    std::condition_variable_any not_empty_;
    std::deque<T> items_;
    const std::size_t capacity_;
    bool closed_{false};
    std::uint64_t pushed_total_{0};
    std::uint64_t popped_total_{0};
    std::uint64_t rejected_total_{0};
};

}  // namespace visionserve::concurrency
