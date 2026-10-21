#define CATCH_CONFIG_MAIN
#include "catch.hpp"

TEST_CASE("Smoke Test: Test Harness Verification", "[smoke]") {
    REQUIRE(1 + 1 == 2);
}
