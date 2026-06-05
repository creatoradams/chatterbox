# Unified Chat Aggregator — OBS setup helper
# Run: .\obs\setup-obs.ps1

$ErrorActionPreference = "Stop"
$OverlayUrl = "http://127.0.0.1:3847/overlay/obs"
$LocalFile = Join-Path (Split-Path $PSScriptRoot -Parent) "obs\chatterbox-overlay.html"
$DashboardUrl = "http://127.0.0.1:3847/dashboard/"
$HealthUrl = "http://127.0.0.1:3847/api/health"

Write-Host ""
Write-Host "=== Chatterbox — OBS Setup ===" -ForegroundColor Cyan

# Build local overlay file
$root = Split-Path $PSScriptRoot -Parent
Push-Location $root
npm run build:obs 2>$null
Pop-Location
Write-Host ""

# Check server
try {
    $health = Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 3
    Write-Host "[OK] Server is running (uptime: $($health.uptime)s)" -ForegroundColor Green
} catch {
    Write-Host "[!!] Server is NOT running." -ForegroundColor Red
    Write-Host ""
    Write-Host "Start it first (from project folder):" -ForegroundColor Yellow
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host "  or double-click start.bat" -ForegroundColor White
    Write-Host ""
    $start = Read-Host "Start server now in a new window? (y/n)"
    if ($start -eq "y") {
        $root = Split-Path $PSScriptRoot -Parent
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; npm run dev"
        Write-Host "Waiting for server..."
        Start-Sleep -Seconds 4
    } else {
        exit 1
    }
}

Set-Clipboard -Value $OverlayUrl
Write-Host "[OK] Copied overlay URL to clipboard:" -ForegroundColor Green
Write-Host "     $OverlayUrl" -ForegroundColor White
Write-Host ""

Write-Host "--- OPTION A: Local file (recommended) ---" -ForegroundColor Cyan
Write-Host "1. OBS -> your Scene -> Sources -> + -> Browser"
Write-Host "2. CHECK 'Local file'"
Write-Host "3. Browse to: $LocalFile"
Write-Host "4. Width: 450   Height: 900"
Write-Host "5. CHECK 'Refresh browser when scene becomes active'"
Write-Host ""
Write-Host "--- OPTION B: URL ---" -ForegroundColor Cyan
Write-Host "1. UNCHECK 'Local file'"
Write-Host "2. URL (in clipboard): $OverlayUrl"
Write-Host ""

Write-Host "--- OPTION B: Custom Dock (control panel inside OBS) ---" -ForegroundColor Cyan
Write-Host "1. OBS -> View -> Docks -> Custom Browser Docks..."
Write-Host "2. Dock name: Unified Chat"
Write-Host "3. URL: $DashboardUrl"
Write-Host "4. Click Apply"
Write-Host ""

$open = Read-Host "Open overlay in browser to test? (y/n)"
if ($open -eq "y") {
    Start-Process $OverlayUrl
}

Write-Host ""
Write-Host "Note: This is not a native OBS .dll plugin — it uses OBS Browser Source," -ForegroundColor DarkGray
Write-Host "which is the standard way to add custom web overlays. Keep npm run dev running while streaming." -ForegroundColor DarkGray
Write-Host ""
