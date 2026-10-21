# 05: Dynamic Obstacle Simulation & Real-Time Replanning (Lookahead, Collision Avoidance, /api/simulate & Animated Playback)

**What to build:**
Dynamic multi-agent obstacle simulation with intelligent real-time replanning. Dynamic obstacles patrol the terrain along cardinal axes, reversing direction upon encountering rocks or the rover. The rover navigates toward the goal using a 3-cell lookahead: if blocked, it waits up to 3 ticks for the obstacle to pass; if still blocked, it dynamically triggers a search replan avoiding visible obstacle cells. The frontend provides animated playback with Play, Pause, Step Forward, Speed Scrubber, obstacle sprites, and live replan notifications.

**Blocked by:** 03: Multi-Algorithm Suite, 04: Procedural Map Generation

**Status:** completed

- [x] `include/sim.hpp` implements `makeObstacles` and `stepObstacles` with reverse-on-block and reverse-on-rover logic.
- [x] `include/sim.hpp` implements `simulate()` with 3-cell lookahead, Wait-then-Replan logic (wait up to 3 ticks, replan with visible obstacles as walls; max 30 waits, 500 tick cap).
- [x] `src/api.cpp` implements `POST /api/simulate` returning full trajectory, per-tick obstacle positions, replan event histories, wait counts, and total costs.
- [x] `web/` provides full playback controls (Play, Pause, Step, Speed slider), animated rover marker, patrol obstacle markers, and live replan counter cards.
- [x] Tests in `tests/test_sim.cpp` verify: 100% trajectory determinism for identical seeds; corridor wait resolution without freezing; and bounded termination on deadlocks.
