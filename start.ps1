Set-Location $PSScriptRoot
if (-not (Test-Path node_modules)) {
  Write-Host "Installing dependencies..."
  npm install
}
Write-Host "Starting Unified Chat Aggregator..."
npm run dev
