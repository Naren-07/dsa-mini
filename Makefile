CXX = g++
CXXFLAGS = -std=c++17 -O3 -Wall -Wextra -Iinclude -Ithird_party -DNOMINMAX
LDFLAGS = -lws2_32

BIN_DIR = bin

all: $(BIN_DIR)/pathlab.exe $(BIN_DIR)/engine_tests.exe $(BIN_DIR)/bench.exe

$(BIN_DIR):
	@mkdir -p $(BIN_DIR)

$(BIN_DIR)/pathlab.exe: src/main.cpp src/api.cpp | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) src/main.cpp src/api.cpp -o $@ $(LDFLAGS)

$(BIN_DIR)/engine_tests.exe: tests/test_main.cpp tests/test_heap.cpp tests/test_search.cpp tests/test_sim.cpp | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) tests/test_main.cpp tests/test_heap.cpp tests/test_search.cpp tests/test_sim.cpp -o $@ $(LDFLAGS)

$(BIN_DIR)/bench.exe: bench/bench.cpp | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) bench/bench.cpp -o $@ $(LDFLAGS)

test: $(BIN_DIR)/engine_tests.exe
	./$(BIN_DIR)/engine_tests.exe

clean:
	rm -rf $(BIN_DIR)
