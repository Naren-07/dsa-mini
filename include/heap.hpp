#pragma once

#include <vector>
#include <utility>
#include <stdexcept>

namespace pathlab {

struct HeapNode {
    int id; // Cell index
    int f;  // Primary key (f = g + h for A*, g for Dijkstra, h for Greedy)
    int g;  // Secondary key (cost from start)

    // Returns true if 'this' has STRICTLY HIGHER priority than 'other'
    // 1. Lower f
    // 2. Higher g (on tie, prefer node closer to goal)
    // 3. Lower id (for absolute cross-platform determinism)
    bool has_higher_priority_than(const HeapNode& other) const {
        if (f != other.f) {
            return f < other.f;
        }
        if (g != other.g) {
            return g > other.g;
        }
        return id < other.id;
    }
};

class MinHeap {
private:
    std::vector<HeapNode> data;

    void sift_up(size_t index) {
        while (index > 0) {
            size_t parent = (index - 1) / 2;
            if (data[index].has_higher_priority_than(data[parent])) {
                std::swap(data[index], data[parent]);
                index = parent;
            } else {
                break;
            }
        }
    }

    void sift_down(size_t index) {
        size_t n = data.size();
        while (true) {
            size_t left = 2 * index + 1;
            size_t right = 2 * index + 2;
            size_t best = index;

            if (left < n && data[left].has_higher_priority_than(data[best])) {
                best = left;
            }
            if (right < n && data[right].has_higher_priority_than(data[best])) {
                best = right;
            }

            if (best != index) {
                std::swap(data[index], data[best]);
                index = best;
            } else {
                break;
            }
        }
    }

public:
    MinHeap() = default;

    inline bool empty() const {
        return data.empty();
    }

    inline size_t size() const {
        return data.size();
    }

    inline void clear() {
        data.clear();
    }

    void push(const HeapNode& node) {
        data.push_back(node);
        sift_up(data.size() - 1);
    }

    void push(int id, int f, int g = 0) {
        push(HeapNode{id, f, g});
    }

    HeapNode top() const {
        if (data.empty()) {
            throw std::runtime_error("Cannot call top() on empty MinHeap");
        }
        return data[0];
    }

    HeapNode pop() {
        if (data.empty()) {
            throw std::runtime_error("Cannot call pop() on empty MinHeap");
        }
        HeapNode root = data[0];
        data[0] = data.back();
        data.pop_back();
        if (!data.empty()) {
            sift_down(0);
        }
        return root;
    }
};

} // namespace pathlab
