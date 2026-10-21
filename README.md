# Rover PathLab (v2.0: Full-Stack Edition)

Autonomous planetary navigation and dynamic replanning engine with a C++17 backend and high-performance interactive HTML5 Canvas frontend.

---

## Features

- **High-Performance C++17 Engine:**
  - Fast 1D grid representation with 4-way topological neighbor expansion.
  - Multi-tier deterministic `MinHeap` ($f$, higher $g$, cell index tie-breaking).
  - Four pathfinding algorithms:
    - **A\* Search:** Minimal terrain cost with admissible Manhattan heuristic.
    - **Dijkstra's Algorithm:** Uniform-cost search with lazy deletion min-heap.
    - **Breadth-First Search (BFS):** Unweighted minimal-hop pathfinding.
    - **Greedy Best-First:** Heuristic distance pursuit.
- **Dynamic Multi-Agent Obstacle Simulation:**
  - Mulberry32 PRNG-driven obstacle generation.
  - Reverse-on-block and Reverse-on-Rover patrol mechanics.
  - Intelligent **Wait-then-Replan** loop: 3-cell lookahead, wait up to 3 ticks in narrow corridors, dynamically replan if blocked.
- **Modern Interactive Web Studio (`web/`):**
  - Rich Canvas interface with terrain painting palette (Plain, Rough, Mud, Sand, Rock).
  - Draggable Start / Goal beacons.
  - Explored heat map replay and optimal path stroke.
  - Step-by-step playback controls with variable speed scrubber.
  - Real-time comparison modal matrix.
- **Zero-Dependency Serving:**
  - Header-only REST API via `cpp-httplib` and `nlohmann/json`.
  - Embedded static asset file serving on port 8080 (zero Node.js or Python runtime needed for users).

---

## Directory Structure

```
rover-pathlab/
  CMakeLists.txt            # CMake build definition
  Makefile                  # Standalone MinGW / Linux Makefile
  build.ps1                 # PowerShell compilation script
  run_tests.ps1             # Unified test orchestrator
  include/
    grid.hpp                # Grid storage, terrain weights, neighbor queries
    heap.hpp                # MinHeap with deterministic tie-breaking
    rng.hpp                 # Mulberry32 32-bit PRNG
    search.hpp              # A*, Dijkstra, BFS, Greedy search algorithms
    sim.hpp                 # Dynamic obstacle simulation & replanning
  src/
    api.hpp                 # API router declarations
    api.cpp                 # REST API endpoints & payload validation
    main.cpp                # HTTP server & static file host entrypoint
  tests/
    test_main.cpp           # Catch2 test runner entry
    test_heap.cpp           # MinHeap unit & property tests
    test_search.cpp         # A* vs Dijkstra cost equality & edge cases
    test_sim.cpp            # Determinism & corridor wait tests
    test_api.py             # Python HTTP integration test suite (A01-A09)
  bench/
    bench.cpp               # Scalability benchmarks (24x16 to 500x500)
  third_party/
    httplib.h               # cpp-httplib (single header)
    json.hpp                # nlohmann/json (single header)
    catch.hpp               # Catch2 v2 (single header)
  web/
    index.html              # Studio HTML interface
    style.css               # Modern dark-mode glassmorphic styling
    app.js                  # Canvas controller & REST client
  Dockerfile                # Multi-stage container definition
```

---

## Build and Run

### Option 1: Standalone Build on Windows (MinGW GCC)

```powershell
# Build binaries (bin/pathlab.exe, bin/engine_tests.exe, bin/bench.exe)
.\build.ps1

# Run the server
.\bin\pathlab.exe 8080
```
Open **`http://localhost:8080`** in any web browser.

### Option 2: CMake (Cross-Platform: Windows, Linux, macOS)

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
./build/pathlab 8080
```

### Option 3: Docker

```bash
docker build -t pathlab .
docker run -p 8080:8080 pathlab
```
Then visit `http://localhost:8080`.

---

## Automated Test Suites

### Run All Tests with One Command (PowerShell)

```powershell
.\run_tests.ps1
```
This runs:
1. `bin/engine_tests.exe` (Catch2 unit & property tests).
2. Starts the server and runs `python tests/test_api.py` (API tests A01-A09).

### Run Scalability Benchmarks

```powershell
.\bin\bench.exe
```
Benchmarks 24×16, 100×100, 250×250, and 500×500 grid sizes across all 4 algorithms with 10 repeats each.

---

## REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Returns server health and version. |
| `GET` | `/api/random-map` | Generates a procedurally generated map with guaranteed start/goal paths. |
| `POST` | `/api/plan` | Solves a single algorithm query returning path and explored nodes. |
| `POST` | `/api/compare` | Compares A\*, Dijkstra, BFS, and Greedy on identical grid states. |
| `POST` | `/api/simulate` | Simulates dynamic obstacle patrols with real-time wait-then-replan logic. |

---

## License

MIT License. Developed for Rover PathLab Autonomous Navigation.
