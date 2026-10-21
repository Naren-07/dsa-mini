# Rover PathLab C++ Backend: Implementation Plan

*Companion to the Project Report (Version 2: Full-Stack Edition)*

## 1. Purpose and Scope

This plan describes how to build the C++17 backend for Rover PathLab and connect it to the existing browser frontend. It covers the goals, deliverables, phases, task breakdown, folder layout, build setup, testing, deployment, risks and acceptance criteria. Estimated total effort is 5 weeks for one developer working part time (about 10 to 12 hours per week); it compresses to 2 to 3 weeks if worked full time.

**In scope**

- C++ engine: grid, min-heap, BFS, Dijkstra, A\*, Greedy, obstacle simulation, replanning, metrics.
- REST API: health, random-map, plan, simulate, compare.
- Frontend changes to call the API and replay results.
- Unit, integration and API tests; benchmarks; Docker packaging.

**Out of scope for this version**

- Diagonal movement, D\* Lite, multi-robot support, user accounts, WebSocket streaming. These are listed as future scope.

## 2. Goals and Success Criteria

| Goal | Success criterion |
| --- | --- |
| Correct algorithms | A\* cost equals Dijkstra cost on 100 random solvable maps; BFS gives minimum steps |
| Deterministic results | Same seed and inputs give identical steps, cost, explored and replans |
| Robust API | Bad input always returns HTTP 400 with a message; no crashes in 1,000 fuzzed requests |
| Performance | A\* on a 24 x 16 grid under 1 ms; on 500 x 500 under 1 second |
| Clean separation | Engine headers compile and test with no HTTP or JSON dependency |
| Usable UI | Frontend runs and compares all algorithms through the API with no logic duplicated in JavaScript |
| Reproducible build | One command builds and tests on Linux, macOS and Windows |

## 3. Architecture Summary

| Layer | Files | Depends on |
| --- | --- | --- |
| Data | grid.hpp, heap.hpp, rng.hpp | STL only |
| Algorithms | search.hpp | Data layer |
| Simulation | sim.hpp | Algorithms, rng |
| API | api.cpp, main.cpp | Simulation, cpp-httplib, nlohmann/json |
| Frontend | web/index.html, app.js, style.css | The REST API only |

Rule: dependencies point downward only. The engine never includes HTTP or JSON headers, which keeps it unit-testable and reusable (CLI, WebAssembly, robot controller).

## 4. Prerequisites and Environment Setup

1. Install a C++17 compiler (g++ 9+, clang 10+ or MSVC 2019+), CMake 3.16+, and Git.
2. Download the header-only libraries into third\_party/: httplib.h (cpp-httplib) and json.hpp (nlohmann/json).
3. Install Catch2 or GoogleTest (or fetch it with CMake FetchContent).
4. Create the Git repository, add a .gitignore for build/, and push an empty skeleton.
5. Optional: install Docker for packaging and a REST client (curl or Postman) for manual checks.

### Folder layout

```
rover-pathlab/
  CMakeLists.txt
  include/   grid.hpp  heap.hpp  rng.hpp  search.hpp  sim.hpp
  src/       api.cpp  api.hpp  main.cpp
  tests/     test_heap.cpp  test_search.cpp  test_sim.cpp  test_api.py
  bench/     bench.cpp
  third_party/  httplib.h  json.hpp
  web/       index.html  app.js  style.css
  Dockerfile  README.md
```

### CMake skeleton

```cmake
cmake_minimum_required(VERSION 3.16)
project(RoverPathLab CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

add_library(engine INTERFACE)
target_include_directories(engine INTERFACE include)

add_executable(pathlab src/main.cpp src/api.cpp)
target_include_directories(pathlab PRIVATE third_party)
target_link_libraries(pathlab PRIVATE engine)
if(WIN32)
  target_link_libraries(pathlab PRIVATE ws2_32)
else()
  find_package(Threads REQUIRED)
  target_link_libraries(pathlab PRIVATE Threads::Threads)
endif()

enable_testing()
add_executable(engine_tests tests/test_heap.cpp tests/test_search.cpp tests/test_sim.cpp)
target_link_libraries(engine_tests PRIVATE engine)
add_test(NAME engine_tests COMMAND engine_tests)

add_executable(bench bench/bench.cpp)
target_link_libraries(bench PRIVATE engine)
```

Build and run: cmake -B build && cmake --build build && ctest --test-dir build && ./build/pathlab

## 5. Phased Plan

### Phase 0: Setup (Day 1 to 2)

| Task | Output |
| --- | --- |
| Create repository, folders, CMake skeleton | Project builds an empty program |
| Add third-party headers | httplib.h and json.hpp in third\_party |
| Configure test runner | One passing dummy test |
| Write README with build steps | README.md |

**Exit check:** a fresh clone builds and ctest passes on your machine.

### Phase 1: Core Data Structures (Week 1)

| Task | Output |
| --- | --- |
| Implement Grid with terrain costs and neighbors() | grid.hpp |
| Implement MinHeap with deterministic tie-break | heap.hpp |
| Implement Mulberry32 PRNG | rng.hpp |
| Heap tests: sorted pop order, duplicates, empty, 10,000 random keys | test\_heap.cpp |
| Grid tests: edge cells have 2 neighbors, corners 2, interior 4, rock skipped | test\_grid section |

**Exit check:** heap sorts 10,000 random keys correctly; grid neighbor tests pass.

### Phase 2: Search Algorithms (Week 2)

| Task | Output |
| --- | --- |
| Implement BFS with parent tracking | search.hpp |
| Implement Dijkstra with lazy deletion | search.hpp |
| Implement A\* with Manhattan heuristic | search.hpp |
| Implement Greedy Best-First | search.hpp |
| Record explored order, generated count, max frontier, microseconds | SearchResult |
| Tests B03 to B09: straight line, enclosed goal, wall with gap, weighted terrain, A\* versus Dijkstra on 100 random maps | test\_search.cpp |

**Exit check:** A\* cost equals Dijkstra cost on every solvable random map; BFS steps are minimal; enclosed goal returns found false without hanging.

### Phase 3: Simulation and Replanning (Week 3)

| Task | Output |
| --- | --- |
| makeObstacles using the seeded PRNG | sim.hpp |
| stepObstacles with reverse-on-block rule | sim.hpp |
| simulate(): plan, look-ahead of 3 cells, replan, wait, move, stop rules (30 waits, 500 ticks) | sim.hpp |
| Record trajectory, explored per plan, obstacles per tick for replay | RunResult |
| Tests B10 to B13: determinism, different seeds, replans occur, corridor wait | test\_sim.cpp |

**Exit check:** two runs with the same seed are identical; the corridor test ends without freezing.

### Phase 4: REST API (Week 4, first half)

| Task | Output |
| --- | --- |
| Server skeleton, static file mount, GET /api/health | main.cpp |
| Request parsing and validation helper (sizes, ranges, algorithm name) | api.cpp |
| POST /api/plan | api.cpp |
| POST /api/simulate | api.cpp |
| POST /api/compare (same obstacle copy for all four algorithms) | api.cpp |
| GET /api/random-map (keeps start, goal and neighbors free) | api.cpp |
| CORS headers for development; consistent JSON error format | api.cpp |
| API tests A01 to A09 using Python requests or curl scripts | test\_api.py |

**Validation rules to implement**

- width and height between 2 and 1000; terrain length equals width times height.
- Each terrain code between 0 and 4.
- start and goal inside the grid and not rock.
- obstacles between 0 and 200; seed is an unsigned 32-bit integer.
- Request body limit (for example 5 MB) to prevent abuse.

**Exit check:** all API tests pass; malformed requests return 400 and the server keeps running.

### Phase 5: Frontend Integration (Week 4, second half)

| Task | Output |
| --- | --- |
| Remove the JavaScript search code or keep it as an optional offline fallback | app.js |
| Add a fetch wrapper with error display | app.js |
| Run button: call /api/simulate, then animate the returned trajectory | app.js |
| Heat map: replay exploredPerPlan; obstacles: replay obstaclesPerTick | app.js |
| Compare all button: call /api/compare and fill the table | app.js |
| Random map button: call /api/random-map | app.js |
| Loading spinner and a clear message if the backend is unreachable | UI |
| Speed slider changes playback rate only | app.js |

**Exit check:** all frontend test cases (paint, touch, stop, theme, speed) pass against the live backend.

### Phase 6: Benchmarking, Packaging and Report (Week 5)

| Task | Output |
| --- | --- |
| Write bench.cpp: run each algorithm on 24x16, 100x100, 250x250, 500x500 grids, 20 repeats | Benchmark table |
| Collect screenshots and comparison tables from three maps | Report figures |
| Write Dockerfile (multi-stage: build, then slim runtime) | Dockerfile |
| Final regression run, README update, tag release v2.0 | Release |
| Update the project report with results | Final report |

**Exit check:** acceptance criteria in Section 9 are all met.

## 6. Timeline Overview

| Week | Focus | Milestone |
| --- | --- | --- |
| 0 (2 days) | Setup | Skeleton builds, CI-ready |
| 1 | Data structures | Heap and grid tested |
| 2 | Algorithms | Four searches verified |
| 3 | Simulation | Deterministic replanning |
| 4 | API and frontend | End-to-end demo |
| 5 | Benchmark and release | Docker image, final report |

## 7. Testing Strategy

| Level | What | Tool | When |
| --- | --- | --- | --- |
| Unit | Heap, grid, PRNG, each algorithm | Catch2 or GoogleTest | Every commit |
| Property | A\* cost equals Dijkstra cost on 100 random maps; heap output sorted; path is contiguous and avoids rock | Randomized loops in tests | Every commit |
| Determinism | Same seed gives same results | Unit tests | Every commit |
| API | Valid and invalid requests, status codes, response shape | Python requests or curl | Before merge |
| Robustness | 1,000 random or malformed bodies, 100 concurrent requests | Script plus sanitizers | Weekly |
| Sanitizers | AddressSanitizer and UndefinedBehaviorSanitizer builds | -fsanitize=address,undefined | Weekly |
| Performance | Time versus grid size, compared against targets | bench.cpp | Phase 6 |
| Manual UI | Paint, touch, stop, theme, speed, edit during run | Checklist from the report | Phase 5 and 6 |

**Path validity checker** (used in tests): every consecutive pair of cells in a returned path must be 4-neighbors, no cell may be rock, the first cell must be the start and the last the goal.

## 8. Deployment Plan

### Dockerfile

```dockerfile
FROM gcc:13 AS build
RUN apt-get update && apt-get install -y cmake
WORKDIR /src
COPY . .
RUN cmake -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build --target pathlab

FROM debian:stable-slim
WORKDIR /app
COPY --from=build /src/build/pathlab /app/pathlab
COPY web /app/web
EXPOSE 8080
CMD ["/app/pathlab"]
```

Run locally: docker build -t pathlab . and docker run -p 8080:8080 pathlab, then open http://localhost:8080.

**Hosting options:** any small VPS, a container platform such as Render, Fly.io or Railway, or a college server. Put Nginx or a platform proxy in front for HTTPS if the app is public.

## 9. Acceptance Criteria

1. All engine and API tests pass, including determinism and A\* versus Dijkstra equality.
2. Sanitizer builds report no errors.
3. Invalid input never crashes the server.
4. A\* on 24 x 16 runs under 1 ms; on 500 x 500 under 1 second.
5. The frontend performs paint, run, stop, compare and random map through the API.
6. Compare all twice with the same seed gives the same steps, cost, explored and replans.
7. A fresh clone builds with the documented commands on at least two operating systems.
8. Docker image starts and serves the app on port 8080.
9. The final report includes benchmark data, screenshots from three maps, and the test result columns filled in.

## 10. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Off-by-one errors in grid indexing | Medium | High | Grid unit tests for corners and edges; one index convention (y \* width + x) everywhere |
| Heap bugs from sift logic | Medium | High | Property test comparing pop order with std::sort |
| Non-determinism from floating point or unordered containers | Low | High | Use integer costs, deterministic tie-break, no unordered iteration in results |
| Large responses slow the UI | Medium | Medium | Return explored cells as flat integer arrays; cap grid size; optional gzip |
| Infinite loops in simulation | Low | High | Hard limits (500 ticks, 30 waits) and a test for the enclosed goal |
| Cross-platform build failures | Medium | Medium | CMake only, pin library versions, test on Linux and Windows early |
| CORS or port issues during development | High | Low | Serve the frontend from the same server; add dev CORS headers only if needed |
| Scope creep (diagonals, D\* Lite) | Medium | Medium | Keep a Future Scope list; do not start it before release v2.0 |
| Concurrency bugs | Low | Medium | Keep the engine stateless; no globals; test with 100 concurrent requests |

## 11. Roles and Deliverables

For a team of up to three, suggested roles: **Engine developer** (Phases 1 to 3), **API and DevOps developer** (Phases 4 and 6), **Frontend and QA developer** (Phases 5 and 6, test execution). A solo developer follows the phase order as written.

| Deliverable | Phase |
| --- | --- |
| Source repository with README | 0 |
| Engine library with tests | 1 to 3 |
| REST API with API tests | 4 |
| Updated frontend | 5 |
| Benchmark results and screenshots | 6 |
| Docker image | 6 |
| Final project report (Version 2) | 6 |
| Demo script (5 minutes) | 6 |

## 12. Suggested Demo Script

1. Start the server and open the page; show the health endpoint.
2. Paint a wall with a gap and a mud band; run A\* and show the heat map and path.
3. Run Greedy on the same map and point out the higher cost.
4. Add 8 obstacles, run again, and show replans in the statistics.
5. Click Compare all and explain the table (steps, cost, explored, replans, microseconds).
6. Switch to a 250 x 250 map and show that planning is still fast.
7. Show the test suite and sanitizer run passing.

## 13. Definition of Done

The work is done when every acceptance criterion in Section 9 is met, the main branch is tagged v2.0, the README lets a new developer build and run the project in under 15 minutes, and the final report has been updated with measured results.
