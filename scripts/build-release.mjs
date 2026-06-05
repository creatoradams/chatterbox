/**
 * Creates a portable Chatterbox folder streamers can unzip and run.
 * Output: release/chatterbox/
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { bundlePluginData } from "./bundle-plugin-data.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RELEASE = join(ROOT, "release", "chatterbox");
const DATA = join(ROOT, "obs-plugin", "data");

await bundlePluginData(DATA);

rmSync(RELEASE, { recursive: true, force: true });
mkdirSync(RELEASE, { recursive: true });
cpSync(DATA, RELEASE, { recursive: true });

writeFileSync(
  join(RELEASE, "Start Chatterbox.bat"),
  `@echo off
title Chatterbox
cd /d "%~dp0"
set CHATTERBOX_DATA_DIR=%~dp0

if not exist "%~dp0node\\node.exe" (
  echo Chatterbox: bundled Node runtime is missing.
  echo Re-download Chatterbox or contact support.
  pause
  exit /b 1
)

echo Starting Chatterbox...
start "Chatterbox Server" /min "%~dp0node\\node.exe" "%~dp0chatterbox-server.cjs"
timeout /t 2 /nobreak >nul
start http://127.0.0.1:3847/dashboard/
echo.
echo Chatterbox is running.
echo   Dashboard: http://127.0.0.1:3847/dashboard/
echo   OBS file:  %~dp0chatterbox-overlay.html
echo   OBS URL:   http://127.0.0.1:3847/overlay/obs
echo.
echo Keep this window open or minimize — closing stops the server.
pause
`,
);

writeFileSync(
  join(RELEASE, "OBS-SETUP.txt"),
  `CHATTERBOX — OBS SETUP
=====================

1. Double-click Start Chatterbox.bat (keep it running while you stream)
2. Open the dashboard in your browser and set up your profile
3. In OBS: Sources -> + -> Browser
4. EITHER:
   A) Check "Local file" -> browse to chatterbox-overlay.html in this folder
   B) Uncheck "Local file" -> URL: http://127.0.0.1:3847/overlay/obs
5. Size: 450 x 900, check "Refresh browser when scene becomes active"

Optional: View -> Docks -> Custom Browser Docks
  URL: http://127.0.0.1:3847/dashboard/

If you installed the OBS plugin (chatterbox.dll), the server starts automatically.
`,
);

console.log("");
console.log("Portable release ready:", RELEASE);
console.log("Zip this folder and share with streamers.");
console.log("  powershell Compress-Archive -Path release\\chatterbox -DestinationPath release\\Chatterbox.zip -Force");
