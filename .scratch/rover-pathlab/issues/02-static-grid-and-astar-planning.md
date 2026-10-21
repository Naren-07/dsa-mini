# 02: Static Grid & A* Path Planning (Core Data Structures, A* Search, /api/plan & Interactive Web Brush)

**What to build:**
Interactive, deterministic 2D grid pathfinding from the web UI through the C++ backend. The user can paint custom terrain types (Plain cost 1, Rough cost 2, Mud cost 3, Sand cost 5, Rock wall impassable), drag Start and Goal coordinates, click "Plan Path (A*)", and immediately see the A* search explore the grid and draw the optimal minimal-cost path with detailed metrics (cost, step count, explored node count, execution time in microseconds).

**Blocked by:** 01: Minimal End-to-End Tracer Bullet

**Status:** completed

- [x] `include/grid.hpp` implements 1D-flattened grid storage, terrain costs (0=Plain, 1=Rough, 2=Mud, 3=Sand, 4=Rock), and 4-way neighbor queries respecting boundaries and impassable rock.
- [x] `include/heap.hpp` implements custom MinHeap with deterministic 3-tier tie-breaking: lower f, higher g, then lowest cell index (`y * width + x`).
- [x] `include/search.hpp` implements A* search with admissible Manhattan distance heuristic, tracking explored order, max frontier, generated count, and microseconds.
- [x] `src/api.cpp` implements `POST /api/plan` validating payload dimensions, bounds, and terrain codes, returning JSON with path coordinates, cost, steps, and flat explored index arrays.
- [x] `web/` provides terrain brush palette, canvas grid rendering, click/drag painting, draggable start/goal flags, and animated playback of explored nodes and optimal path.
- [x] Unit tests in `tests/test_heap.cpp` and `tests/test_search.cpp` verify heap ordering, corner/edge neighbor logic, straight-line optimality, and wall navigation.
