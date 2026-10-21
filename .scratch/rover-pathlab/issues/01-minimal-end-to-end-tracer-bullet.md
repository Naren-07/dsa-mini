# 01: Minimal End-to-End Tracer Bullet (Skeleton, Health API, Web Canvas Shell & Test Harness)

**What to build:**
A functional, end-to-end running application skeleton that compiles on Windows with MinGW and CMake, serves a modern dark-mode browser canvas shell over HTTP, exposes a healthy status API, and runs passing automated tests. When the user starts the backend and opens http://localhost:8080, the browser loads the Rover PathLab UI with a live green indicator confirming "Backend Connected (Healthy)".

**Blocked by:** None (can start immediately)

**Status:** completed

- [x] `third_party/` contains single-header versions of `httplib.h`, `json.hpp`, and `catch.hpp`.
- [x] Build system configured with both `CMakeLists.txt` and a standalone `Makefile` / `build.ps1` for MinGW GCC (`g++`).
- [x] C++ server binary compiles, links against `ws2_32` on Windows, and starts listening on port 8080.
- [x] `GET /api/health` returns HTTP 200 with JSON `{"status": "ok", "version": "2.0"}` and includes CORS headers.
- [x] Static files in `web/` (`index.html`, `style.css`, `app.js`) are served directly at root `/`.
- [x] Web UI displays Rover PathLab branding, canvas viewport, and verifies connectivity with the backend health API.
- [x] Catch2 test binary compiles and passes all smoke assertions.
