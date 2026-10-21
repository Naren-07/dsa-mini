# 04: Procedural Map Generation (/api/random-map & UI Randomize Controls)

**What to build:**
Deterministic procedural map generation that creates diverse planetary exploration terrains with guaranteed solvability. The user can click "Random Map", type or randomize a seed, adjust terrain sliders or select presets ("Martian Maze", "Muddy Swamps", "Asteroid Field", "Mountain Pass"), and immediately load a new valid map with guaranteed clear passage between Start and Goal.

**Blocked by:** 02: Static Grid & A* Path Planning

**Status:** completed

- [x] `include/rng.hpp` implements Mulberry32 32-bit pseudo-random number generator for cross-platform reproducibility.
- [x] Procedural generator creates weighted terrain codes (0 to 3) and rock clusters (4) according to configured probabilities.
- [x] Solvability guard ensures Start, Goal, and their direct 4-way neighbors remain free of rock walls.
- [x] `src/api.cpp` implements `GET /api/random-map` accepting `width`, `height`, `seed`, and terrain density query parameters.
- [x] `web/` provides a "Randomize Map" toolbar button, seed input display, and preset buttons that update the canvas instantly via the API.
