# PowerShell build script for Rover PathLab using MinGW g++
$ErrorActionPreference = "Stop"

$binDir = Join-Path $PSScriptRoot "bin"
if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir | Out-Null
}

$cflags = @("-std=c++17", "-O3", "-Iinclude", "-Ithird_party", "-DNOMINMAX")
$ldflags = @("-lws2_32")

Write-Host "Compiling pathlab.exe..." -ForegroundColor Cyan
& g++ @cflags "src/main.cpp" "src/api.cpp" -o "$binDir/pathlab.exe" @ldflags
if ($LASTEXITCODE -ne 0) { throw "Failed to build pathlab.exe" }

Write-Host "Compiling engine_tests.exe..." -ForegroundColor Cyan
& g++ @cflags "tests/test_main.cpp" "tests/test_heap.cpp" "tests/test_search.cpp" "tests/test_sim.cpp" -o "$binDir/engine_tests.exe" @ldflags
if ($LASTEXITCODE -ne 0) { throw "Failed to build engine_tests.exe" }

Write-Host "Compiling bench.exe..." -ForegroundColor Cyan
& g++ @cflags "bench/bench.cpp" -o "$binDir/bench.exe" @ldflags
if ($LASTEXITCODE -ne 0) { throw "Failed to build bench.exe" }

Write-Host "Build complete! Artifacts are in bin/" -ForegroundColor Green
