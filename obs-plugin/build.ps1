# Build Chatterbox OBS hybrid plugin (Windows)
# Prerequisites: Node 20+, CMake, Visual Studio 2022, OBS Studio dev build
#
# 1. Set OBS_DIR to your obs-studio CMake build output:
#    $env:OBS_DIR = "C:\dev\obs-studio\build"
# 2. Run from repo root: npm run build:plugin-data
# 3. Run this script

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent

if (-not $env:OBS_DIR) {
  Write-Host "Set OBS_DIR to your obs-studio build folder, e.g.:" -ForegroundColor Yellow
  Write-Host '  $env:OBS_DIR = "C:\dev\obs-studio\build"' -ForegroundColor White
  exit 1
}

Push-Location $Root
npm run build:plugin-data
Pop-Location

$BuildDir = Join-Path $PSScriptRoot "build"
cmake -S $PSScriptRoot -B $BuildDir -DOBS_DIR="$env:OBS_DIR" -G "Visual Studio 17 2022" -A x64
cmake --build $BuildDir --config Release

Write-Host ""
Write-Host "Built plugin DLL in: $BuildDir\Release\chatterbox.dll" -ForegroundColor Green
Write-Host "Install to OBS:" -ForegroundColor Cyan
Write-Host "  Copy chatterbox.dll -> %ProgramFiles%\obs-studio\obs-plugins\64bit\"
Write-Host "  Copy data\*       -> %ProgramFiles%\obs-studio\data\obs-plugins\chatterbox\"
