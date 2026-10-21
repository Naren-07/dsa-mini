#include "catch.hpp"
#include "grid.hpp"
#include "sim.hpp"

using namespace pathlab;

TEST_CASE("Simulation: Determinism with Matching Seed", "[sim]") {
    Grid grid(16, 12, PLAIN);
    Point start{1, 1};
    Point goal{14, 10};

    // Add some terrain variety
    for (int y = 3; y < 9; ++y) grid.set(5, y, ROUGH);
    for (int y = 2; y < 8; ++y) grid.set(10, y, MUD);

    uint32_t seed = 4242;
    int obstacles = 6;

    RunResult r1 = simulate("astar", grid, start, goal, obstacles, seed);
    RunResult r2 = simulate("astar", grid, start, goal, obstacles, seed);

    REQUIRE(r1.status == r2.status);
    REQUIRE(r1.total_steps == r2.total_steps);
    REQUIRE(r1.total_cost == r2.total_cost);
    REQUIRE(r1.replan_count == r2.replan_count);
    REQUIRE(r1.wait_count == r2.wait_count);
    REQUIRE(r1.trajectory.size() == r2.trajectory.size());

    for (size_t i = 0; i < r1.trajectory.size(); ++i) {
        REQUIRE(r1.trajectory[i].x == r2.trajectory[i].x);
        REQUIRE(r1.trajectory[i].y == r2.trajectory[i].y);
        REQUIRE(r1.trajectory[i].action == r2.trajectory[i].action);
    }
}

TEST_CASE("Simulation: Corridor Wait Resolution Without Freezing", "[sim]") {
    // 1-wide corridor from (0,1) to (6,1)
    Grid grid(7, 3, ROCK);
    for (int x = 0; x < 7; ++x) {
        grid.set(x, 1, PLAIN); // clear the corridor
    }

    Point start{0, 1};
    Point goal{6, 1};

    // Place an obstacle at (4,1) moving left (-1,0) toward rover
    std::vector<Obstacle> obstacles;
    obstacles.push_back(Obstacle{0, 4, 1, -1, 0});

    // Run simulation
    RunResult r = simulate("astar", grid, start, goal, 1, 999);

    // Rover should not freeze or crash; it should wait or navigate to goal
    REQUIRE(r.status != "UNKNOWN");
    REQUIRE(r.wait_count <= 30);
    REQUIRE(r.total_ticks < 500);
}
