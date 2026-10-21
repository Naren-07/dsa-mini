#pragma once

#include <vector>
#include <cstdint>
#include <stdexcept>

namespace pathlab {

enum TerrainType : uint8_t {
    PLAIN = 0,
    ROUGH = 1,
    MUD = 2,
    SAND = 3,
    ROCK = 4
};

inline int get_terrain_cost(uint8_t terrain) {
    switch (terrain) {
        case PLAIN: return 1;
        case ROUGH: return 2;
        case MUD:   return 3;
        case SAND:  return 5;
        case ROCK:  return -1; // Impassable
        default:    return 1;
    }
}

inline bool is_passable(uint8_t terrain) {
    return terrain != ROCK;
}

struct Point {
    int x;
    int y;

    bool operator==(const Point& o) const { return x == o.x && y == o.y; }
    bool operator!=(const Point& o) const { return !(*this == o); }
};

class Grid {
public:
    int width;
    int height;
    std::vector<uint8_t> cells;

    Grid(int w, int h, uint8_t default_terrain = PLAIN)
        : width(w), height(h), cells(w * h, default_terrain) {
        if (w <= 0 || h <= 0) {
            throw std::invalid_argument("Grid dimensions must be positive");
        }
    }

    Grid(int w, int h, const std::vector<uint8_t>& data)
        : width(w), height(h), cells(data) {
        if (w <= 0 || h <= 0 || static_cast<int>(data.size()) != w * h) {
            throw std::invalid_argument("Invalid grid data size for dimensions");
        }
    }

    inline int index(int x, int y) const {
        return y * width + x;
    }

    inline Point point(int idx) const {
        return { idx % width, idx / width };
    }

    inline bool in_bounds(int x, int y) const {
        return x >= 0 && x < width && y >= 0 && y < height;
    }

    inline bool in_bounds(Point p) const {
        return in_bounds(p.x, p.y);
    }

    inline uint8_t get(int x, int y) const {
        return cells[index(x, y)];
    }

    inline uint8_t get(int idx) const {
        return cells[idx];
    }

    inline void set(int x, int y, uint8_t val) {
        cells[index(x, y)] = val;
    }

    inline void set(int idx, uint8_t val) {
        cells[idx] = val;
    }

    inline int cell_cost(int idx) const {
        return get_terrain_cost(cells[idx]);
    }

    inline bool is_cell_passable(int idx) const {
        return is_passable(cells[idx]);
    }

    // 4-connected neighbors (Up, Right, Down, Left)
    std::vector<int> neighbors(int idx) const {
        std::vector<int> result;
        result.reserve(4);

        int x = idx % width;
        int y = idx / width;

        static const int dx[4] = {0, 1, 0, -1};
        static const int dy[4] = {-1, 0, 1, 0};

        for (int i = 0; i < 4; ++i) {
            int nx = x + dx[i];
            int ny = y + dy[i];

            if (in_bounds(nx, ny)) {
                int n_idx = index(nx, ny);
                if (is_cell_passable(n_idx)) {
                    result.push_back(n_idx);
                }
            }
        }
        return result;
    }
};

} // namespace pathlab
