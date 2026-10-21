#pragma once

#include "grid.hpp"
#include "heap.hpp"
#include <vector>
#include <queue>
#include <chrono>
#include <cmath>
#include <climits>
#include <string>
#include <algorithm>

namespace pathlab {

struct SearchResult {
    bool found = false;
    std::vector<Point> path;
    int cost = 0;              // Accumulated terrain cost
    int steps = 0;             // Number of moves / edges
    std::vector<int> explored; // Flat cell indices in exploration order
    int generated_count = 0;   // Total nodes added to frontier
    size_t max_frontier = 0;   // Peak frontier size
    int64_t duration_us = 0;   // Execution duration in microseconds
};

inline int manhattan_distance(Point a, Point b) {
    return std::abs(a.x - b.x) + std::abs(a.y - b.y);
}

inline std::vector<Point> reconstruct_path(const std::vector<int>& parent, int start_idx, int goal_idx, const Grid& grid) {
    std::vector<Point> path;
    int curr = goal_idx;
    while (curr != -1) {
        path.push_back(grid.point(curr));
        if (curr == start_idx) break;
        curr = parent[curr];
    }
    std::reverse(path.begin(), path.end());
    return path;
}

inline int calculate_path_cost(const std::vector<Point>& path, const Grid& grid) {
    if (path.size() <= 1) return 0;
    int total = 0;
    for (size_t i = 1; i < path.size(); ++i) {
        total += grid.cell_cost(grid.index(path[i].x, path[i].y));
    }
    return total;
}

// --- A* Search ---
inline SearchResult astar_search(const Grid& grid, Point start, Point goal) {
    auto t_start = std::chrono::high_resolution_clock::now();
    SearchResult result;

    if (!grid.in_bounds(start) || !grid.in_bounds(goal)) return result;
    int start_idx = grid.index(start.x, start.y);
    int goal_idx = grid.index(goal.x, goal.y);
    if (!grid.is_cell_passable(start_idx) || !grid.is_cell_passable(goal_idx)) return result;

    if (start_idx == goal_idx) {
        result.found = true;
        result.path = { start };
        result.cost = 0;
        result.steps = 0;
        result.explored = { start_idx };
        return result;
    }

    const int total_cells = grid.width * grid.height;
    std::vector<int> g_cost(total_cells, INT_MAX);
    std::vector<int> parent(total_cells, -1);
    std::vector<bool> closed(total_cells, false);

    MinHeap open_set;
    g_cost[start_idx] = 0;
    int h_start = manhattan_distance(start, goal);
    open_set.push(start_idx, h_start, 0);
    result.generated_count = 1;
    result.max_frontier = 1;

    while (!open_set.empty()) {
        result.max_frontier = std::max(result.max_frontier, open_set.size());
        HeapNode top = open_set.pop();
        int curr = top.id;

        if (closed[curr]) continue;
        closed[curr] = true;
        result.explored.push_back(curr);

        if (curr == goal_idx) {
            result.found = true;
            break;
        }

        Point curr_pt = grid.point(curr);

        for (int neighbor : grid.neighbors(curr)) {
            if (closed[neighbor]) continue;

            int step_cost = grid.cell_cost(neighbor);
            int tentative_g = g_cost[curr] + step_cost;

            if (tentative_g < g_cost[neighbor]) {
                g_cost[neighbor] = tentative_g;
                parent[neighbor] = curr;
                Point n_pt = grid.point(neighbor);
                int h = manhattan_distance(n_pt, goal);
                int f = tentative_g + h;

                open_set.push(neighbor, f, tentative_g);
                result.generated_count++;
            }
        }
    }

    if (result.found) {
        result.path = reconstruct_path(parent, start_idx, goal_idx, grid);
        result.steps = static_cast<int>(result.path.size()) - 1;
        result.cost = g_cost[goal_idx];
    }

    auto t_end = std::chrono::high_resolution_clock::now();
    result.duration_us = std::chrono::duration_cast<std::chrono::microseconds>(t_end - t_start).count();
    return result;
}

// --- Dijkstra Search ---
inline SearchResult dijkstra_search(const Grid& grid, Point start, Point goal) {
    auto t_start = std::chrono::high_resolution_clock::now();
    SearchResult result;

    if (!grid.in_bounds(start) || !grid.in_bounds(goal)) return result;
    int start_idx = grid.index(start.x, start.y);
    int goal_idx = grid.index(goal.x, goal.y);
    if (!grid.is_cell_passable(start_idx) || !grid.is_cell_passable(goal_idx)) return result;

    if (start_idx == goal_idx) {
        result.found = true;
        result.path = { start };
        result.cost = 0;
        result.steps = 0;
        result.explored = { start_idx };
        return result;
    }

    const int total_cells = grid.width * grid.height;
    std::vector<int> g_cost(total_cells, INT_MAX);
    std::vector<int> parent(total_cells, -1);
    std::vector<bool> closed(total_cells, false);

    MinHeap open_set;
    g_cost[start_idx] = 0;
    open_set.push(start_idx, 0, 0); // f = g for Dijkstra
    result.generated_count = 1;
    result.max_frontier = 1;

    while (!open_set.empty()) {
        result.max_frontier = std::max(result.max_frontier, open_set.size());
        HeapNode top = open_set.pop();
        int curr = top.id;

        if (closed[curr]) continue;
        closed[curr] = true;
        result.explored.push_back(curr);

        if (curr == goal_idx) {
            result.found = true;
            break;
        }

        for (int neighbor : grid.neighbors(curr)) {
            if (closed[neighbor]) continue;

            int step_cost = grid.cell_cost(neighbor);
            int tentative_g = g_cost[curr] + step_cost;

            if (tentative_g < g_cost[neighbor]) {
                g_cost[neighbor] = tentative_g;
                parent[neighbor] = curr;
                open_set.push(neighbor, tentative_g, tentative_g);
                result.generated_count++;
            }
        }
    }

    if (result.found) {
        result.path = reconstruct_path(parent, start_idx, goal_idx, grid);
        result.steps = static_cast<int>(result.path.size()) - 1;
        result.cost = g_cost[goal_idx];
    }

    auto t_end = std::chrono::high_resolution_clock::now();
    result.duration_us = std::chrono::duration_cast<std::chrono::microseconds>(t_end - t_start).count();
    return result;
}

// --- BFS Search ---
inline SearchResult bfs_search(const Grid& grid, Point start, Point goal) {
    auto t_start = std::chrono::high_resolution_clock::now();
    SearchResult result;

    if (!grid.in_bounds(start) || !grid.in_bounds(goal)) return result;
    int start_idx = grid.index(start.x, start.y);
    int goal_idx = grid.index(goal.x, goal.y);
    if (!grid.is_cell_passable(start_idx) || !grid.is_cell_passable(goal_idx)) return result;

    if (start_idx == goal_idx) {
        result.found = true;
        result.path = { start };
        result.cost = 0;
        result.steps = 0;
        result.explored = { start_idx };
        return result;
    }

    const int total_cells = grid.width * grid.height;
    std::vector<int> parent(total_cells, -1);
    std::vector<bool> visited(total_cells, false);
    std::queue<int> q;

    visited[start_idx] = true;
    q.push(start_idx);
    result.generated_count = 1;
    result.max_frontier = 1;

    while (!q.empty()) {
        result.max_frontier = std::max(result.max_frontier, q.size());
        int curr = q.front();
        q.pop();
        result.explored.push_back(curr);

        if (curr == goal_idx) {
            result.found = true;
            break;
        }

        for (int neighbor : grid.neighbors(curr)) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                parent[neighbor] = curr;
                q.push(neighbor);
                result.generated_count++;
            }
        }
    }

    if (result.found) {
        result.path = reconstruct_path(parent, start_idx, goal_idx, grid);
        result.steps = static_cast<int>(result.path.size()) - 1;
        result.cost = calculate_path_cost(result.path, grid);
    }

    auto t_end = std::chrono::high_resolution_clock::now();
    result.duration_us = std::chrono::duration_cast<std::chrono::microseconds>(t_end - t_start).count();
    return result;
}

// --- Greedy Best-First Search ---
inline SearchResult greedy_search(const Grid& grid, Point start, Point goal) {
    auto t_start = std::chrono::high_resolution_clock::now();
    SearchResult result;

    if (!grid.in_bounds(start) || !grid.in_bounds(goal)) return result;
    int start_idx = grid.index(start.x, start.y);
    int goal_idx = grid.index(goal.x, goal.y);
    if (!grid.is_cell_passable(start_idx) || !grid.is_cell_passable(goal_idx)) return result;

    if (start_idx == goal_idx) {
        result.found = true;
        result.path = { start };
        result.cost = 0;
        result.steps = 0;
        result.explored = { start_idx };
        return result;
    }

    const int total_cells = grid.width * grid.height;
    std::vector<int> parent(total_cells, -1);
    std::vector<bool> closed(total_cells, false);

    MinHeap open_set;
    int h_start = manhattan_distance(start, goal);
    open_set.push(start_idx, h_start, 0); // f = h for Greedy
    result.generated_count = 1;
    result.max_frontier = 1;

    while (!open_set.empty()) {
        result.max_frontier = std::max(result.max_frontier, open_set.size());
        HeapNode top = open_set.pop();
        int curr = top.id;

        if (closed[curr]) continue;
        closed[curr] = true;
        result.explored.push_back(curr);

        if (curr == goal_idx) {
            result.found = true;
            break;
        }

        for (int neighbor : grid.neighbors(curr)) {
            if (closed[neighbor]) continue;

            if (parent[neighbor] == -1 && neighbor != start_idx) {
                parent[neighbor] = curr;
                Point n_pt = grid.point(neighbor);
                int h = manhattan_distance(n_pt, goal);
                open_set.push(neighbor, h, 0);
                result.generated_count++;
            }
        }
    }

    if (result.found) {
        result.path = reconstruct_path(parent, start_idx, goal_idx, grid);
        result.steps = static_cast<int>(result.path.size()) - 1;
        result.cost = calculate_path_cost(result.path, grid);
    }

    auto t_end = std::chrono::high_resolution_clock::now();
    result.duration_us = std::chrono::duration_cast<std::chrono::microseconds>(t_end - t_start).count();
    return result;
}

inline SearchResult plan_search(const std::string& algo, const Grid& grid, Point start, Point goal) {
    if (algo == "dijkstra") {
        return dijkstra_search(grid, start, goal);
    } else if (algo == "bfs") {
        return bfs_search(grid, start, goal);
    } else if (algo == "greedy") {
        return greedy_search(grid, start, goal);
    } else {
        return astar_search(grid, start, goal); // default to astar
    }
}

} // namespace pathlab
