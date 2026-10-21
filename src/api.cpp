#include "api.hpp"
#include "grid.hpp"
#include "search.hpp"
#include "sim.hpp"
#include "rng.hpp"
#include "json.hpp"
#include <iostream>
#include <string>
#include <algorithm>

using json = nlohmann::json;

namespace pathlab {

namespace {

void set_cors_headers(httplib::Response& res) {
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type");
}

void reply_json(httplib::Response& res, int status_code, const json& body) {
    set_cors_headers(res);
    res.status = status_code;
    res.set_content(body.dump(), "application/json");
}

void reply_error(httplib::Response& res, int status_code, const std::string& message) {
    json err = {
        {"error", message},
        {"status", "error"}
    };
    reply_json(res, status_code, err);
}

bool parse_point(const json& j, Point& pt, const std::string& name, std::string& err_msg) {
    if (!j.is_array() || j.size() != 2 || !j[0].is_number_integer() || !j[1].is_number_integer()) {
        err_msg = name + " must be a 2-element integer array [x, y]";
        return false;
    }
    pt.x = j[0].get<int>();
    pt.y = j[1].get<int>();
    return true;
}

bool validate_grid_payload(const json& body, Grid& grid, Point& start, Point& goal, std::string& err_msg) {
    if (!body.contains("grid") || !body["grid"].is_object()) {
        err_msg = "Missing or invalid 'grid' object";
        return false;
    }
    const auto& gj = body["grid"];
    if (!gj.contains("width") || !gj["width"].is_number_integer() ||
        !gj.contains("height") || !gj["height"].is_number_integer()) {
        err_msg = "'width' and 'height' must be integers";
        return false;
    }
    int width = gj["width"].get<int>();
    int height = gj["height"].get<int>();
    if (width < 2 || width > 1000 || height < 2 || height > 1000) {
        err_msg = "Grid dimensions must be between 2 and 1000";
        return false;
    }

    if (!gj.contains("terrain") || !gj["terrain"].is_array()) {
        err_msg = "Missing 'terrain' array";
        return false;
    }
    const auto& tj = gj["terrain"];
    if (static_cast<int>(tj.size()) != width * height) {
        err_msg = "Terrain array length does not match width * height";
        return false;
    }

    std::vector<uint8_t> cells;
    cells.reserve(width * height);
    for (size_t i = 0; i < tj.size(); ++i) {
        if (!tj[i].is_number_integer()) {
            err_msg = "Terrain values must be integers";
            return false;
        }
        int val = tj[i].get<int>();
        if (val < 0 || val > 4) {
            err_msg = "Terrain codes must be between 0 and 4";
            return false;
        }
        cells.push_back(static_cast<uint8_t>(val));
    }

    grid = Grid(width, height, cells);

    if (!body.contains("start") || !parse_point(body["start"], start, "start", err_msg)) {
        return false;
    }
    if (!body.contains("goal") || !parse_point(body["goal"], goal, "goal", err_msg)) {
        return false;
    }

    if (!grid.in_bounds(start)) {
        err_msg = "Start point is out of grid bounds";
        return false;
    }
    if (!grid.in_bounds(goal)) {
        err_msg = "Goal point is out of grid bounds";
        return false;
    }
    if (!grid.is_cell_passable(grid.index(start.x, start.y))) {
        err_msg = "Start cell is impassable rock";
        return false;
    }
    if (!grid.is_cell_passable(grid.index(goal.x, goal.y))) {
        err_msg = "Goal cell is impassable rock";
        return false;
    }

    return true;
}

json format_search_result(const SearchResult& sr) {
    json j;
    j["found"] = sr.found;
    j["cost"] = sr.cost;
    j["steps"] = sr.steps;
    j["explored_count"] = sr.explored.size();
    j["max_frontier"] = sr.max_frontier;
    j["duration_us"] = sr.duration_us;

    json path_arr = json::array();
    for (const auto& pt : sr.path) {
        path_arr.push_back({pt.x, pt.y});
    }
    j["path"] = path_arr;
    j["explored"] = sr.explored; // 1D flat indices for compactness
    return j;
}

} // namespace

void register_routes(httplib::Server& svr) {
    // CORS Pre-flight
    svr.Options(".*", [](const httplib::Request&, httplib::Response& res) {
        set_cors_headers(res);
        res.status = 204;
    });

    // GET /api/health
    svr.Get("/api/health", [](const httplib::Request&, httplib::Response& res) {
        json response = {
            {"status", "ok"},
            {"version", "2.0"},
            {"service", "Rover PathLab C++ Backend"}
        };
        reply_json(res, 200, response);
    });

    // GET /api/random-map
    svr.Get("/api/random-map", [](const httplib::Request& req, httplib::Response& res) {
        int width = 24;
        int height = 16;
        uint32_t seed = 42;
        std::string preset = "";

        if (req.has_param("width")) {
            try { width = std::stoi(req.get_param_value("width")); } catch (...) {}
        }
        if (req.has_param("height")) {
            try { height = std::stoi(req.get_param_value("height")); } catch (...) {}
        }
        if (req.has_param("seed")) {
            try { seed = static_cast<uint32_t>(std::stoul(req.get_param_value("seed"))); } catch (...) {}
        }
        if (req.has_param("preset")) {
            preset = req.get_param_value("preset");
        }

        if (width < 2 || width > 1000 || height < 2 || height > 1000) {
            reply_error(res, 400, "Width and height must be between 2 and 1000");
            return;
        }

        Mulberry32 rng(seed);
        Point start{1, 1};
        Point goal{width - 2, height - 2};

        std::vector<uint8_t> terrain(width * height, PLAIN);

        double rock_prob = 0.20;
        double rough_prob = 0.20;
        double mud_prob = 0.15;
        double sand_prob = 0.10;

        if (preset == "maze") {
            rock_prob = 0.35;
            rough_prob = 0.05;
            mud_prob = 0.05;
            sand_prob = 0.05;
        } else if (preset == "swamp") {
            rock_prob = 0.10;
            rough_prob = 0.15;
            mud_prob = 0.50;
            sand_prob = 0.05;
        } else if (preset == "pass") {
            rock_prob = 0.40;
            rough_prob = 0.10;
            mud_prob = 0.10;
            sand_prob = 0.10;
        }

        for (int y = 0; y < height; ++y) {
            for (int x = 0; x < width; ++x) {
                // Safeguard start, goal, and immediate neighbors
                if (std::abs(x - start.x) <= 1 && std::abs(y - start.y) <= 1) continue;
                if (std::abs(x - goal.x) <= 1 && std::abs(y - goal.y) <= 1) continue;

                double roll = rng.next_double();
                int idx = y * width + x;
                if (roll < rock_prob) {
                    terrain[idx] = ROCK;
                } else if (roll < rock_prob + mud_prob) {
                    terrain[idx] = MUD;
                } else if (roll < rock_prob + mud_prob + rough_prob) {
                    terrain[idx] = ROUGH;
                } else if (roll < rock_prob + mud_prob + rough_prob + sand_prob) {
                    terrain[idx] = SAND;
                } else {
                    terrain[idx] = PLAIN;
                }
            }
        }

        // Guarantee start and goal clearance
        terrain[start.y * width + start.x] = PLAIN;
        terrain[goal.y * width + goal.x] = PLAIN;

        json resp;
        resp["width"] = width;
        resp["height"] = height;
        resp["seed"] = seed;
        resp["start"] = {start.x, start.y};
        resp["goal"] = {goal.x, goal.y};
        resp["terrain"] = terrain;
        reply_json(res, 200, resp);
    });

    // POST /api/plan
    svr.Post("/api/plan", [](const httplib::Request& req, httplib::Response& res) {
        json body;
        try {
            body = json::parse(req.body);
        } catch (...) {
            reply_error(res, 400, "Invalid JSON body");
            return;
        }

        std::string algo = "astar";
        if (body.contains("algorithm") && body["algorithm"].is_string()) {
            algo = body["algorithm"].get<std::string>();
        }

        Grid grid(2, 2);
        Point start{0, 0};
        Point goal{0, 0};
        std::string err;

        if (!validate_grid_payload(body, grid, start, goal, err)) {
            reply_error(res, 400, err);
            return;
        }

        SearchResult sr = plan_search(algo, grid, start, goal);
        reply_json(res, 200, format_search_result(sr));
    });

    // POST /api/compare
    svr.Post("/api/compare", [](const httplib::Request& req, httplib::Response& res) {
        json body;
        try {
            body = json::parse(req.body);
        } catch (...) {
            reply_error(res, 400, "Invalid JSON body");
            return;
        }

        Grid grid(2, 2);
        Point start{0, 0};
        Point goal{0, 0};
        std::string err;

        if (!validate_grid_payload(body, grid, start, goal, err)) {
            reply_error(res, 400, err);
            return;
        }

        SearchResult astar_res = astar_search(grid, start, goal);
        SearchResult dijkstra_res = dijkstra_search(grid, start, goal);
        SearchResult bfs_res = bfs_search(grid, start, goal);
        SearchResult greedy_res = greedy_search(grid, start, goal);

        json results;
        results["astar"] = format_search_result(astar_res);
        results["dijkstra"] = format_search_result(dijkstra_res);
        results["bfs"] = format_search_result(bfs_res);
        results["greedy"] = format_search_result(greedy_res);

        reply_json(res, 200, results);
    });

    // POST /api/simulate
    svr.Post("/api/simulate", [](const httplib::Request& req, httplib::Response& res) {
        json body;
        try {
            body = json::parse(req.body);
        } catch (...) {
            reply_error(res, 400, "Invalid JSON body");
            return;
        }

        std::string algo = "astar";
        if (body.contains("algorithm") && body["algorithm"].is_string()) {
            algo = body["algorithm"].get<std::string>();
        }

        int obstacle_count = 8;
        if (body.contains("obstacle_count") && body["obstacle_count"].is_number_integer()) {
            obstacle_count = body["obstacle_count"].get<int>();
            if (obstacle_count < 0 || obstacle_count > 200) {
                reply_error(res, 400, "obstacle_count must be between 0 and 200");
                return;
            }
        }

        uint32_t seed = 42;
        if (body.contains("seed") && body["seed"].is_number_unsigned()) {
            seed = body["seed"].get<uint32_t>();
        }

        Grid grid(2, 2);
        Point start{0, 0};
        Point goal{0, 0};
        std::string err;

        if (!validate_grid_payload(body, grid, start, goal, err)) {
            reply_error(res, 400, err);
            return;
        }

        RunResult rr = simulate(algo, grid, start, goal, obstacle_count, seed);

        json out;
        out["status"] = rr.status;
        out["total_ticks"] = rr.total_ticks;
        out["total_cost"] = rr.total_cost;
        out["total_steps"] = rr.total_steps;
        out["total_explored"] = rr.total_explored;
        out["replan_count"] = rr.replan_count;
        out["wait_count"] = rr.wait_count;
        out["total_duration_us"] = rr.total_duration_us;

        json traj = json::array();
        for (const auto& step : rr.trajectory) {
            traj.push_back({
                {"tick", step.tick},
                {"x", step.x},
                {"y", step.y},
                {"action", step.action}
            });
        }
        out["trajectory"] = traj;

        json obs_ticks = json::array();
        for (const auto& tick_obs : rr.obstacles_per_tick) {
            json t_arr = json::array();
            for (const auto& o : tick_obs) {
                t_arr.push_back({o.x, o.y});
            }
            obs_ticks.push_back(t_arr);
        }
        out["obstacles_per_tick"] = obs_ticks;

        reply_json(res, 200, out);
    });
}

} // namespace pathlab
