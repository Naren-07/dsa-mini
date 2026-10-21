cmake_minimum_required(VERSION 3.16)
project(RoverPathLab CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

if(MSVC)
  add_compile_definitions(NOMINMAX _CRT_SECURE_NO_WARNINGS)
endif()

add_library(engine INTERFACE)
target_include_directories(engine INTERFACE ${CMAKE_CURRENT_SOURCE_DIR}/include)

add_executable(pathlab src/main.cpp src/api.cpp)
target_include_directories(pathlab PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/third_party)
target_link_libraries(pathlab PRIVATE engine)

if(WIN32)
  target_link_libraries(pathlab PRIVATE ws2_32)
else()
  find_package(Threads REQUIRED)
  target_link_libraries(pathlab PRIVATE Threads::Threads)
endif()

enable_testing()
add_executable(engine_tests 
  tests/test_main.cpp 
  tests/test_heap.cpp 
  tests/test_search.cpp 
  tests/test_sim.cpp
)
target_include_directories(engine_tests PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/third_party)
target_link_libraries(engine_tests PRIVATE engine)
add_test(NAME engine_tests COMMAND engine_tests)

add_executable(bench bench/bench.cpp)
target_include_directories(bench PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/third_party)
target_link_libraries(bench PRIVATE engine)
