# 06: Full-Grid Stress Benchmarks, Docker Packaging & Automated Test Suite Runner

**What to build:**
Enterprise packaging, large-scale performance benchmarking, and unified test automation. Verifies that A* executes under 1 ms on 24x16 grids and under 1 second on massive 500x500 grids. Bundles the complete C++ backend and web assets into a lightweight multi-stage Docker container. Provides a single-command test suite (`run_tests.ps1` and `mingw32-make test`) executing C++ unit tests, bootstrapping the server, running Python API tests (`test_api.py`), and verifying all 9 acceptance criteria from the implementation plan.

**Blocked by:** 05: Dynamic Obstacle Simulation & Real-Time Replanning

**Status:** completed

- [x] `bench/bench.cpp` benchmarks all four algorithms on 24x16, 100x100, 250x250, and 500x500 maps with 20 repeats, outputting formatted markdown tables.
- [x] `tests/test_api.py` verifies all API endpoints, HTTP status codes, malformed payloads (400 responses), and fuzzing resilience without server crashes.
- [x] `Dockerfile` configures multi-stage build (GCC/CMake builder + minimal Debian runtime) exposing port 8080.
- [x] Unified test runner script (`run_tests.ps1` and `Makefile test` target) runs unit tests, starts `pathlab.exe`, runs API tests, and produces clean test reports.
- [x] Documentation and README with quickstart guides, architectural diagrams, and benchmark performance metrics.
