#include "grid.hpp"
#include "search.hpp"
#include "rng.hpp"
#include <iostream>
#include <iomanip>
#include <vector>
#include <string>
#include <numeric>

using namespace pathlab;

struct BenchmarkResult {
    std::string name;
    int width;
    int height;
    double avg_us;
    int steps;
    int cost;
    size_t explored;
};

BenchmarkResult run_bench(const std::string& name, int w, int h, int repeats, const Grid& grid, Point start, Point goal) {
    std::vector<int64_t> times;
    times.reserve(repeats);

    SearchResult last;
    for (int i = 0; i < repeats; ++i) {
        last = plan_search(name, grid, start, goal);
        times.push_back(last.duration_us);
    }

    double sum = std::accumulate(times.begin(), times.end(), 0.0);
    double avg = sum / repeats;

    return BenchmarkResult{
        name, w, h, avg, last.steps, last.cost, last.explored.size()
    };
}

int main() {
    std::cout << "\n========================================================================\n";
    std::cout << "               ROVER PATHLAB PERFORMANCE BENCHMARK\n";
    std::cout << "========================================================================\n\n";

    std::vector<std::pair<int, int>> dimensions = {
        {24, 16},
        {100, 100},
        {250, 250},
        {500, 500}
    };

    const int repeats = 10;
    Mulberry32 rng(42);

    for (const auto& dim : dimensions) {
        int w = dim.first;
        int h = dim.second;

        std::cout << "### Benchmark Grid: " << w << " x " << h << " (" << repeats << " runs)\n\n";
        std::cout << "| Algorithm | Avg Time | Steps | Terrain Cost | Explored Cells | Status |\n";
        std::cout << "| :--- | :--- | :--- | :--- | :--- | :--- |\n";

        // Generate map
        Grid grid(w, h, PLAIN);
        for (int y = 0; y < h; ++y) {
            for (int x = 0; x < w; ++x) {
                double r = rng.next_double();
                if (r < 0.12) grid.set(x, y, ROCK);
                else if (r < 0.25) grid.set(x, y, ROUGH);
                else if (r < 0.35) grid.set(x, y, MUD);
                else if (r < 0.42) grid.set(x, y, SAND);
            }
        }
        Point start{0, 0};
        Point goal{w - 1, h - 1};
        grid.set(start.x, start.y, PLAIN);
        grid.set(goal.x, goal.y, PLAIN);

        std::vector<std::string> algos = {"astar", "dijkstra", "bfs", "greedy"};
        for (const auto& a : algos) {
            auto res = run_bench(a, w, h, repeats, grid, start, goal);
            
            std::string time_str;
            if (res.avg_us < 1000.0) {
                time_str = std::to_string(static_cast<int>(res.avg_us)) + " µs";
            } else {
                double ms = res.avg_us / 1000.0;
                time_str = std::to_string(ms).substr(0, 6) + " ms";
            }

            std::string status = "PASS";
            if (a == "astar") {
                if (w == 24 && res.avg_us > 1000.0) status = "FAIL (>1ms)";
                if (w == 500 && res.avg_us > 1000000.0) status = "FAIL (>1s)";
            }

            std::cout << "| " << std::left << std::setw(10) << res.name
                      << " | " << std::setw(10) << time_str
                      << " | " << std::setw(6) << res.steps
                      << " | " << std::setw(12) << res.cost
                      << " | " << std::setw(14) << res.explored
                      << " | " << status << " |\n";
        }
        std::cout << "\n";
    }

    return 0;
}
