#pragma once

#include "grid.hpp"
#include "rng.hpp"
#include "search.hpp"
#include <vector>
#include <string>
#include <set>

namespace pathlab {

struct Obstacle {
    int id;
    int x;
    int y;
    int dx;
    int dy;
};

struct SimReplanEvent {
    int tick;
    std::vector<Point> path;
    std::vector<int> explored;
    int cost;
    int64_t duration_us;
};

struct SimStep {
    int tick;
    int x;
    int y;
    std::string action; // "START", "MOVE", "WAIT", "REPLAN"
};

struct RunResult {
    std::string status = "UNKNOWN"; // "GOAL_REACHED", "TIMEOUT_TICKS", "MAX_WAITS_EXCEEDED", "NO_PATH"
    int total_ticks = 0;
    int total_cost = 0;
    int total_steps = 0;
    int total_explored = 0;
    int replan_count = 0;
    int wait_count = 0;
    int64_t total_duration_us = 0;
    std::vector<SimStep> trajectory;
    std::vector<std::vector<Point>> obstacles_per_tick;
    std::vector<SimReplanEvent> replans;
};

inline std::vector<Obstacle> make_obstacles(const Grid& grid, int count, uint32_t seed, Point start, Point goal) {
    std::vector<Obstacle> obstacles;
    Mulberry32 rng(seed);

    std::set<int> occupied;
    occupied.insert(grid.index(start.x, start.y));
    occupied.insert(grid.index(goal.x, goal.y));

    // Direction pairs: East, South, West, North
    const int dir_x[4] = {1, 0, -1, 0};
    const int dir_y[4] = {0, 1, 0, -1};

    int attempts = 0;
    int max_attempts = count * 200;

    for (int i = 0; i < count && attempts < max_attempts; ++attempts) {
        int x = rng.next_int(0, grid.width - 1);
        int y = rng.next_int(0, grid.height - 1);
        int idx = grid.index(x, y);

        if (grid.is_cell_passable(idx) && occupied.find(idx) == occupied.end()) {
            int d_idx = rng.next_int(0, 3);
            obstacles.push_back(Obstacle{ i, x, y, dir_x[d_idx], dir_y[d_idx] });
            occupied.insert(idx);
            ++i;
        }
    }
    return obstacles;
}

inline void step_obstacles(std::vector<Obstacle>& obstacles, const Grid& grid, Point rover_pos) {
    // Record current positions to prevent obstacle overlapping
    std::set<std::pair<int, int>> next_occupied;

    for (auto& obs : obstacles) {
        int nx = obs.x + obs.dx;
        int ny = obs.y + obs.dy;

        bool blocked = false;
        // Check grid bounds
        if (!grid.in_bounds(nx, ny)) {
            blocked = true;
        } else if (!grid.is_cell_passable(grid.index(nx, ny))) {
            blocked = true;
        } else if (nx == rover_pos.x && ny == rover_pos.y) {
            // Reverse on Rover consensus rule
            blocked = true;
        } else if (next_occupied.find({nx, ny}) != next_occupied.end()) {
            blocked = true;
        }

        if (blocked) {
            // Reverse direction
            obs.dx = -obs.dx;
            obs.dy = -obs.dy;
            int rev_x = obs.x + obs.dx;
            int rev_y = obs.y + obs.dy;

            if (grid.in_bounds(rev_x, rev_y) && 
                grid.is_cell_passable(grid.index(rev_x, rev_y)) && 
                !(rev_x == rover_pos.x && rev_y == rover_pos.y) &&
                next_occupied.find({rev_x, rev_y}) == next_occupied.end()) {
                obs.x = rev_x;
                obs.y = rev_y;
            }
            // else remain in place
        } else {
            obs.x = nx;
            obs.y = ny;
        }
        next_occupied.insert({obs.x, obs.y});
    }
}

inline RunResult simulate(const std::string& algo, const Grid& grid, Point start, Point goal, int obstacle_count, uint32_t seed) {
    RunResult res;

    // Initial plan
    SearchResult initial = plan_search(algo, grid, start, goal);
    if (!initial.found) {
        res.status = "NO_PATH";
        return res;
    }

    res.total_explored += static_cast<int>(initial.explored.size());
    res.total_duration_us += initial.duration_us;
    std::vector<Point> planned_path = initial.path;

    res.replans.push_back(SimReplanEvent{
        0, planned_path, initial.explored, initial.cost, initial.duration_us
    });

    std::vector<Obstacle> obstacles = make_obstacles(grid, obstacle_count, seed, start, goal);

    Point rover = start;
    int path_index = 0;
    int consecutive_waits = 0;
    const int max_waits = 30;
    const int max_ticks = 500;
    const int lookahead = 3;

    for (int tick = 0; tick < max_ticks; ++tick) {
        res.total_ticks = tick;

        // Record obstacle positions at start of tick
        std::vector<Point> obs_positions;
        obs_positions.reserve(obstacles.size());
        for (const auto& o : obstacles) {
            obs_positions.push_back({o.x, o.y});
        }
        res.obstacles_per_tick.push_back(obs_positions);

        // Check if goal reached
        if (rover.x == goal.x && rover.y == goal.y) {
            res.trajectory.push_back(SimStep{tick, rover.x, rover.y, "GOAL"});
            res.status = "GOAL_REACHED";
            break;
        }

        // Lookahead check along upcoming planned path
        bool obstacle_in_lookahead = false;
        int check_depth = std::min(lookahead, static_cast<int>(planned_path.size()) - 1 - path_index);

        for (int k = 1; k <= check_depth; ++k) {
            Point next_step = planned_path[path_index + k];
            for (const auto& o : obstacles) {
                if (o.x == next_step.x && o.y == next_step.y) {
                    obstacle_in_lookahead = true;
                    break;
                }
            }
            if (obstacle_in_lookahead) break;
        }

        std::string action = "MOVE";

        if (obstacle_in_lookahead) {
            if (consecutive_waits < 3) {
                // Wait-then-replan rule: wait up to 3 ticks
                action = "WAIT";
                res.wait_count++;
                consecutive_waits++;
            } else {
                // Trigger replan avoiding obstacles
                Grid temp_grid = grid;
                for (const auto& o : obstacles) {
                    if (temp_grid.in_bounds(o.x, o.y)) {
                        temp_grid.set(o.x, o.y, ROCK);
                    }
                }

                SearchResult replan = plan_search(algo, temp_grid, rover, goal);
                res.total_duration_us += replan.duration_us;

                if (replan.found && replan.path.size() > 1) {
                    action = "REPLAN";
                    res.replan_count++;
                    res.total_explored += static_cast<int>(replan.explored.size());
                    planned_path = replan.path;
                    path_index = 0;
                    consecutive_waits = 0;

                    res.replans.push_back(SimReplanEvent{
                        tick, planned_path, replan.explored, replan.cost, replan.duration_us
                    });

                    // Advance one step along new path
                    path_index++;
                    rover = planned_path[path_index];
                    res.total_steps++;
                    res.total_cost += grid.cell_cost(grid.index(rover.x, rover.y));
                } else {
                    // Fallback to wait in narrow corridor
                    action = "WAIT";
                    res.wait_count++;
                    consecutive_waits++;
                }
            }
        } else {
            // Path clear: advance
            if (path_index + 1 < static_cast<int>(planned_path.size())) {
                path_index++;
                rover = planned_path[path_index];
                res.total_steps++;
                res.total_cost += grid.cell_cost(grid.index(rover.x, rover.y));
                consecutive_waits = 0;
                action = "MOVE";
            }
        }

        res.trajectory.push_back(SimStep{tick, rover.x, rover.y, action});

        // Step dynamic obstacles
        step_obstacles(obstacles, grid, rover);

        // Check stop conditions
        if (res.wait_count >= max_waits) {
            res.status = "MAX_WAITS_EXCEEDED";
            break;
        }
        if (tick == max_ticks - 1 && res.status == "UNKNOWN") {
            res.status = "TIMEOUT_TICKS";
            break;
        }
    }

    if (rover.x == goal.x && rover.y == goal.y) {
        res.status = "GOAL_REACHED";
    }

    return res;
}

} // namespace pathlab
