# Rover PathLab Unified Test Orchestrator
$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "       ROVER PATHLAB UNIFIED TEST ORCHESTRATOR      " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Build Binaries
Write-Host "`n[1/3] Building Project Binaries..." -ForegroundColor Yellow
& .\build.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed!"
    exit 1
}

# 2. Run C++ Catch2 Unit & Property Tests
Write-Host "`n[2/3] Executing C++ Engine Unit & Property Tests..." -ForegroundColor Yellow
& .\bin\engine_tests.exe
if ($LASTEXITCODE -ne 0) {
    Write-Error "C++ Engine Tests failed!"
    exit 1
}
Write-Host "  -> All C++ Unit & Property Tests Passed!" -ForegroundColor Green

# 3. Boot Backend Server & Run API Tests
Write-Host "`n[3/3] Booting Backend Server & Executing API Tests..." -ForegroundColor Yellow
$serverProcess = Start-Process -FilePath ".\bin\pathlab.exe" -ArgumentList "8080" -PassThru -NoNewWindow

try {
    # Wait for server to come up
    $ready = $false
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Milliseconds 300
        try {
            $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/health" -Method Get -TimeoutSec 1
            if ($resp.status -eq "ok") {
                $ready = $true
                break
            }
        } catch {}
    }

    if (-not $ready) {
        throw "Server failed to start or respond on port 8080 within 5 seconds"
    }

    Write-Host "Server is live! Running python tests/test_api.py..." -ForegroundColor Cyan
    & python "tests/test_api.py"
    if ($LASTEXITCODE -ne 0) {
        throw "API Tests failed!"
    }
} finally {
    Write-Host "Shutting down backend server..." -ForegroundColor DarkGray
    if ($serverProcess -and -not $serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -Force
    }
}

Write-Host "`n====================================================" -ForegroundColor Green
Write-Host "  SUCCESS: All Unit, Property & API Tests Passed!   " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
