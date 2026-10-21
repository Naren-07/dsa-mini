#include "catch.hpp"
#include "heap.hpp"
#include "rng.hpp"
#include <vector>
#include <algorithm>

using namespace pathlab;

TEST_CASE("MinHeap: Basic Operations & Sorted Order", "[heap]") {
    MinHeap heap;
    REQUIRE(heap.empty());
    REQUIRE(heap.size() == 0);

    heap.push(1, 10);
    heap.push(2, 5);
    heap.push(3, 20);
    heap.push(4, 1);

    REQUIRE(heap.size() == 4);
    REQUIRE(!heap.empty());

    REQUIRE(heap.pop().f == 1);
    REQUIRE(heap.pop().f == 5);
    REQUIRE(heap.pop().f == 10);
    REQUIRE(heap.pop().f == 20);
    REQUIRE(heap.empty());
}

TEST_CASE("MinHeap: Deterministic 3-Tier Tie-Breaking", "[heap]") {
    MinHeap heap;

    // Rule 1: Lower f wins
    // Rule 2: On f tie, higher g wins (closer to goal)
    // Rule 3: On f and g tie, lower id wins (coordinate order)

    heap.push(HeapNode{100, 10, 2}); // f=10, g=2, id=100
    heap.push(HeapNode{200, 10, 5}); // f=10, g=5, id=200 -> higher g, pops before id=100
    heap.push(HeapNode{50,  10, 5}); // f=10, g=5, id=50  -> same f and g, lower id pops first!
    heap.push(HeapNode{300, 5,  1}); // f=5 -> lowest f, pops first

    HeapNode n1 = heap.pop();
    REQUIRE(n1.id == 300); // lowest f

    HeapNode n2 = heap.pop();
    REQUIRE(n2.id == 50);  // f=10, g=5, id=50

    HeapNode n3 = heap.pop();
    REQUIRE(n3.id == 200); // f=10, g=5, id=200

    HeapNode n4 = heap.pop();
    REQUIRE(n4.id == 100); // f=10, g=2, id=100
}

TEST_CASE("MinHeap: 10,000 Random Keys Property Test", "[heap]") {
    MinHeap heap;
    Mulberry32 rng(12345);

    const int N = 10000;
    for (int i = 0; i < N; ++i) {
        int f = rng.next_int(0, 5000);
        int g = rng.next_int(0, 1000);
        heap.push(HeapNode{i, f, g});
    }

    REQUIRE(heap.size() == N);

    HeapNode prev = heap.pop();
    for (int i = 1; i < N; ++i) {
        HeapNode curr = heap.pop();
        // prev must have had higher or equal priority than curr
        // so curr must NOT have higher priority than prev
        REQUIRE_FALSE(curr.has_higher_priority_than(prev));
        prev = curr;
    }

    REQUIRE(heap.empty());
}
