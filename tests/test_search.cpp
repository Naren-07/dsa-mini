#include "catch.hpp"
#include "grid.hpp"
#include "search.hpp"
#include "rng.hpp"

using namespace pathlab;

TEST_CASE("Grid: 4-Way Neighbors & Boundary Checks", "[grid]") {
    Grid grid(5, 5, PLAIN);

    // Top-left corner (0,0): exactly 2 neighbors -> (1,0) and (0,1)
    auto corner = grid.neighbors(grid.index(0, 0));
    REQUIRE(corner.size() == 2);

    // Top edge (2,0): exactly 3 neighbors -> (1,0), (3,0), (2,1)
    auto edge = grid.neighbors(grid.index(2, 0));
    REQUIRE(edge.size() == 3);

    // Center (2,2): exactly 4 neighbors
    auto center = grid.neighbors(grid.index(2, 2));
    REQUIRE(center.size() == 4);

    // Place rock at (2,1), center should now have 3 passable neighbors
    grid.set(2, 1, ROCK);
    auto center_blocked = grid.neighbors(grid.index(2, 2));
    REQUIRE(center_blocked.size() == 3);
}

TEST_CASE("Search: Straight Line Optimality", "[search]") {
    Grid grid(10, 10, PLAIN);
    Point start{1, 1};
    Point goal{1, 8};

    SearchResult astar = astar_search(grid, start, goal);
    SearchResult dijkstra = dijkstra_search(grid, start, goal);
    SearchResult bfs = bfs_search(grid, start, goal);

    REQUIRE(astar.found);
    REQUIRE(dijkstra.found);
    REQUIRE(bfs.found);

    REQUIRE(astar.steps == 7);
    REQUIRE(dijkstra.steps == 7);
    REQUIRE(bfs.steps == 7);
    REQUIRE(astar.cost == 7);
    REQUIRE(dijkstra.cost == 7);
}

TEST_CASE("Search: Wall with Gap Navigation", "[search]") {
    // 5x5 grid with a vertical wall at x=2, gap at y=4
    Grid grid(5, 5, PLAIN);
    for (int y = 0; y < 4; ++y) {
        grid.set(2, y, ROCK);
    }

    Point start{0, 0};
    Point goal{4, 0};

    SearchResult astar = astar_search(grid, start, goal);
    REQUIRE(astar.found);

    // Path must navigate down to y=4 and back up
    for (const auto& pt : astar.path) {
        REQUIRE(grid.is_cell_passable(grid.index(pt.x, pt.y)));
    }
}

TEST_CASE("Search: Enclosed Goal Safely Fails (No Infinite Loop)", "[search]") {
    Grid grid(7, 7, PLAIN);
    Point start{0, 0};
    Point goal{3, 3};

    // Surround goal with rocks
    grid.set(2, 3, ROCK);
    grid.set(4, 3, ROCK);
    grid.set(3, 2, ROCK);
    grid.set(3, 4, ROCK);

    SearchResult astar = astar_search(grid, start, goal);
    SearchResult dijkstra = dijkstra_search(grid, start, goal);
    SearchResult bfs = bfs_search(grid, start, goal);
    SearchResult greedy = greedy_search(grid, start, goal);

    REQUIRE_FALSE(astar.found);
    REQUIRE_FALSE(dijkstra.found);
    REQUIRE_FALSE(bfs.found);
    REQUIRE_FALSE(greedy.found);
}

TEST_CASE("Search: Weighted Terrain Detour Preference", "[search]") {
    // A 3x3 grid:
    // S M G   (row 0: Start(0,0)=Plain, (1,0)=Mud cost 3, Goal(2,0)=Plain)
    // . . .   (row 1: all Plain cost 1)
    // Moving direct: S -> M -> G takes cost 3 + 1 = 4
    // Moving around: (0,0) -> (0,1) -> (1,1) -> (2,1) -> (2,0) takes cost 1+1+1+1 = 4
    // Make Mud cost 5 (Sand)
    Grid grid(3, 3, PLAIN);
    grid.set(1, 0, SAND); // cost 5

    Point start{0, 0};
    Point goal{2, 0};

    SearchResult astar = astar_search(grid, start, goal);
    SearchResult dijkstra = dijkstra_search(grid, start, goal);

    REQUIRE(astar.found);
    REQUIRE(dijkstra.found);
    // Direct through Sand would cost 5 + 1 = 6. Detour around takes 1 + 1 + 1 + 1 = 4.
    REQUIRE(astar.cost == 4);
    REQUIRE(dijkstra.cost == 4);
    REQUIRE(astar.steps == 4); // takes 4 steps instead of 2 steps to minimize cost!
}

TEST_CASE("Property Test: A* Cost == Dijkstra Cost on 100 Random Maps", "[search][property]") {
    Mulberry32 rng(999);
    const int W = 15;
    const int H = 10;
    int verified_maps = 0;

    for (int map_idx = 0; map_idx < 100; ++map_idx) {
        Grid grid(W, H, PLAIN);
        Point start{0, 0};
        Point goal{W - 1, H - 1};

        // Randomize terrain
        for (int y = 0; y < H; ++y) {
            for (int x = 0; x < W; ++x) {
                if ((x == start.x && y == start.y) || (x == goal.x && y == goal.y)) continue;
                double r = rng.next_double();
                if (r < 0.18) grid.set(x, y, ROCK);
                else if (r < 0.40) grid.set(x, y, ROUGH);
                else if (r < 0.60) grid.set(x, y, MUD);
                else if (r < 0.75) grid.set(x, y, SAND);
            }
        }

        SearchResult astar = astar_search(grid, start, goal);
        SearchResult dijkstra = dijkstra_search(grid, start, goal);

        REQUIRE(astar.found == dijkstra.found);
        if (astar.found) {
            REQUIRE(astar.cost == dijkstra.cost);
            // A* heuristic should typically explore <= nodes than Dijkstra
            REQUIRE(astar.explored.size() <= dijkstra.explored.size());
            verified_maps++;
        }
    }

    INFO("Verified " << verified_maps << " solvable random maps with A* == Dijkstra cost equivalence");
    REQUIRE(verified_maps > 20); // Guarantee sufficient maps were tested
}
