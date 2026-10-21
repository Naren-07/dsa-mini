#pragma once

#include <cstdint>

namespace pathlab {

class Mulberry32 {
private:
    uint32_t state;

public:
    explicit Mulberry32(uint32_t seed = 0) : state(seed) {
        if (state == 0) state = 0x12345678;
    }

    inline void reseed(uint32_t seed) {
        state = seed ? seed : 0x12345678;
    }

    inline uint32_t next_u32() {
        uint32_t z = (state += 0x6D2B79F5UL);
        z = (z ^ (z >> 15)) * (z | 1UL);
        z ^= z + (z ^ (z >> 7)) * (z | 61UL);
        return z ^ (z >> 14);
    }

    // Returns integer in range [min, max] inclusive
    inline int next_int(int min, int max) {
        if (min >= max) return min;
        uint32_t range = static_cast<uint32_t>(max - min + 1);
        return min + static_cast<int>(next_u32() % range);
    }

    // Returns float in [0.0, 1.0)
    inline double next_double() {
        return static_cast<double>(next_u32()) / 4294967296.0;
    }
};

} // namespace pathlab
