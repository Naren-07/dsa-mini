# 03: Multi-Algorithm Suite (BFS, Dijkstra, Greedy & Algorithm Comparison Matrix)

**What to build:**
A comprehensive multi-algorithm comparison engine. The user can switch between Breadth-First Search (BFS), Dijkstra's Algorithm, A* Search, and Greedy Best-First Search directly from the UI, or click "Compare All Algorithms" to trigger a parallel/multi-search execution on the backend that populates an interactive comparison matrix comparing steps, accumulated terrain cost, explored nodes count, max memory frontier, and execution time.

**Blocked by:** 02: Static Grid & A* Path Planning

**Status:** completed

- [x] `include/search.hpp` implements BFS with parent tracking (reporting both minimal steps and accumulated terrain cost).
- [x] `include/search.hpp` implements Dijkstra's algorithm with min-heap priority queue and lazy deletion.
- [x] `include/search.hpp` implements Greedy Best-First Search prioritizing heuristic distance h(n) with coordinate tie-breaking.
- [x] `src/api.cpp` implements `POST /api/compare` running all 4 algorithms on identical terrain states.
- [x] `web/` UI features algorithm switcher buttons and a comprehensive "Comparison Matrix" table showing live benchmark statistics.
- [x] Property tests in `tests/test_search.cpp` verify: A* cost == Dijkstra cost on 100 random solvable maps; BFS step count <= A* step count; enclosed unreachable goal terminates safely with `found: false`.
