@echo off
title Chatterbox
cd /d "%~dp0"

if exist "%~dp0release\chatterbox\node\node.exe" (
  cd /d "%~dp0release\chatterbox"
  call "Start Chatterbox.bat"
  exit /b
)

if exist "%~dp0obs-plugin\data\node\node.exe" (
  set CHATTERBOX_DATA_DIR=%~dp0obs-plugin\data
  echo Starting Chatterbox (bundled Node)...
  start "Chatterbox Server" /min "%~dp0obs-plugin\data\node\node.exe" "%~dp0obs-plugin\data\chatterbox-server.cjs"
  timeout /t 2 /nobreak >nul
  start http://127.0.0.1:3847/dashboard/
  echo Chatterbox running at http://127.0.0.1:3847/dashboard/
  pause
  exit /b
)

if not exist node_modules (
  echo Building Chatterbox for first use...
  call npm install
  call npm run build:release
  cd /d "%~dp0release\chatterbox"
  call "Start Chatterbox.bat"
  exit /b
)

echo Dev mode: npm run dev
call npm run dev
