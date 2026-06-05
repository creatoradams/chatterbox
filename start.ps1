Set-Location $PSScriptRoot

$release = Join-Path $PSScriptRoot "release\chatterbox"
if (Test-Path (Join-Path $release "node\node.exe")) {
  & (Join-Path $release "Start Chatterbox.bat")
  exit
}

$data = Join-Path $PSScriptRoot "obs-plugin\data"
if (Test-Path (Join-Path $data "node\node.exe")) {
  $env:CHATTERBOX_DATA_DIR = $data
  Write-Host "Starting Chatterbox (bundled Node)..."
  Start-Process -WindowStyle Minimized -FilePath (Join-Path $data "node\node.exe") -ArgumentList (Join-Path $data "chatterbox-server.cjs")
  Start-Sleep -Seconds 2
  Start-Process "http://127.0.0.1:3847/dashboard/"
  Write-Host "Chatterbox running at http://127.0.0.1:3847/dashboard/"
  Read-Host "Press Enter to close"
  exit
}

if (-not (Test-Path node_modules)) {
  Write-Host "Building Chatterbox for first use..."
  npm install
  npm run build:release
  & (Join-Path $release "Start Chatterbox.bat")
  exit
}

Write-Host "Dev mode: npm run dev"
npm run dev
