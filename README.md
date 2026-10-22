# Rover PathLab (v2.1: Mars Game UI Edition)

Autonomous planetary navigation and dynamic replanning engine with a C++17 backend and a Mars-themed, game-style interactive studio interface.

---

## What's New in v2.1 (Mars Game UI)

* **Mars Game UI & Pixel Art Rendering:**
  * Square-view pixel art Mars colony sprite atlas (`web/assets/atlas.png`, `atlas.json`).
  * 6-wheel articulated Martian rover with directional travel facing (horizontal flipping and 90° rotation) and dust particle trails.
  * Colony buildings as obstacles, crates and blast walls, landing pod / comms tower with beacon pulse.
  * Tileable Martian regolith base ground, rough basalt, clay sludge trenches, and dune sand drifts.
* **Autonomous Telemetry & Dynamic Replay:**
  * Smooth sub-tick interpolation across ticks at 1x to 10x playback speed.
  * Real-time online replan detection with glowing amber shockwave aura.
  * Dynamic obstacle yield / wait caution states with pulsing alerts.
  * Translucent neon cyan/amber search heat map replay.
* **Mission Control HUD & Micro-Charts:**
  * Sci-fi telemetry deck tracking Path Length, Accumulated Cost, Nodes Explored, Replans, and Microseconds.
  * Algorithm benchmark modal featuring comparative micro bar charts for Cost, Nodes Explored, and Duration.
* **Dual Mars Themes:**
  * **Night-Side Mars:** Dark atmospheric void, glowing cyan laser navigation line, neon beacons.
  * **Daylight Mars:** Warm sunlit ochre sand panels, high-contrast typography, readable controls.
* **Procedural Web Audio Synthesizer:**
  * Zero external audio files required. Uses the Web Audio API to synthesize rover movement clicks, replan alerts, wait pings, radar sweeps, and goal arrival victory chimes. Mute toggle included (default off).

---

## Directory Structure

```
rover-pathlab/
  CMakeLists.txt            # CMake build definition
  Makefile                  # Standalone MinGW / Linux Makefile
  build.ps1                 # PowerShell compilation script
  run_tests.ps1             # Unified test orchestrator
  scripts/
    generate_atlas.py       # Python sprite atlas generator
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
    index.html              # Mars Mission Control interface
    style.css               # Mars design system tokens & theme styling
    app.js                  # Main application orchestrator
    api.js                  # REST API client
    assets.js               # Sprite atlas loader & canvas fallback
    audio.js                # Web Audio API sound synthesizer
    renderer.js             # Canvas renderer with offscreen terrain cache
    player.js               # Trajectory replay controller & sub-tick lerp
    ui.js                   # HUD readouts, benchmark modal & toasts
    assets/
      LICENSES.md           # Visual and auditory asset licenses
      atlas.json            # Sprite atlas metadata (x, y, w, h)
      atlas.png             # 32x32 Mars colony pixel art sheet
  Dockerfile                # Multi-stage container definition
```

---

## Swapping or Adding Sprites in the Atlas

All sprites are defined in `web/assets/atlas.json` and rendered from `web/assets/atlas.png`:

```json
{
  "tileSize": 32,
  "width": 128,
  "height": 96,
  "sprites": {
    "ground_plain": { "x": 0, "y": 0, "w": 32, "h": 32 },
    "ground_rough": { "x": 32, "y": 0, "w": 32, "h": 32 },
    "ground_mud": { "x": 64, "y": 0, "w": 32, "h": 32 },
    "ground_sand": { "x": 96, "y": 0, "w": 32, "h": 32 },
    "rock": { "x": 0, "y": 32, "w": 32, "h": 32 },
    "wall": { "x": 32, "y": 32, "w": 32, "h": 32 },
    "rover": { "x": 64, "y": 32, "w": 32, "h": 32 },
    "goal": { "x": 96, "y": 32, "w": 32, "h": 32 },
    "moving_obstacle": { "x": 0, "y": 64, "w": 32, "h": 32 },
    "decoration_crater": { "x": 32, "y": 64, "w": 32, "h": 32 },
    "decoration_solar": { "x": 64, "y": 64, "w": 32, "h": 32 },
    "decoration_dish": { "x": 96, "y": 64, "w": 32, "h": 32 }
  }
}
```

### Steps to Replace or Add Sprites:
1. **Replace `web/assets/atlas.png`:** Update the PNG image with your new pixel art sprites while keeping consistent tile dimensions (e.g., 32×32 or 48×48).
2. **Update `web/assets/atlas.json`:** Map each named sprite key to its corresponding `{ x, y, w, h }` pixel rectangle in the atlas image.
3. **Automated Generation:** You can also modify `scripts/generate_atlas.py` and run `python scripts/generate_atlas.py` to regenerate `atlas.png` and `atlas.json` programmatically.
4. **Resilience & Fallback:** If `atlas.png` fails to load or cannot be fetched, `web/assets.js` automatically synthesizes an in-memory procedural canvas fallback so the application never breaks.

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
1. `bin/engine_tests.exe` (Catch2 unit & property tests: 10,403 assertions in 12 test cases).
2. Starts the server and runs `python tests/test_api.py` (API tests A01-A09).

### Run Scalability Benchmarks

```powershell
.\bin\bench.exe
```
Benchmarks 24×16, 100×100, 250×250, and 500×500 grid sizes across all 4 algorithms.

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

## Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Play / Pause Simulation |
| <kbd>S</kbd> | Step Forward Single Tick |
| <kbd>R</kbd> | Stop / Reset Simulation |
| <kbd>P</kbd> | Compute Plan |
| <kbd>C</kbd> | Open Compare All Benchmark Modal |
| <kbd>M</kbd> | Toggle Sound Effects |

---

## License

MIT License. Developed for Rover PathLab Autonomous Navigation. Visual asset licenses are documented in `web/assets/LICENSES.md`.
