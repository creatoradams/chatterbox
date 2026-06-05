# Chatterbox OBS Hybrid Plugin

Native OBS plugin (C++) that **starts the Chatterbox server** and adds the chat overlay as a **Browser Source** — no manual `npm run dev` for streamers.

## Architecture

```
chatterbox.dll (OBS plugin)
  ├── starts node chatterbox-server.cjs (bundled in data/)
  ├── Tools → Chatterbox → Add overlay / Open dashboard
  └── data/obs-plugins/chatterbox/  (HTML, public assets, server bundle)
```

The plugin is a thin native shell; chat connectors remain the bundled Node server.

## Requirements (build)

| Tool | Purpose |
|------|---------|
| **Node.js 20+** | Build plugin data bundle (streamers use bundled `node.exe`) |
| **CMake 3.22+** | Configure plugin |
| **Visual Studio 2022** | Compile C++ on Windows |
| **OBS Studio dev build** | libobs + obs-frontend-api headers/libs |

### OBS dev build (one-time)

1. Clone [obs-studio](https://github.com/obsproject/obs-studio)
2. Follow OBS wiki to CMake build on Windows
3. Set environment variable:
   ```powershell
   $env:OBS_DIR = "C:\path\to\obs-studio\build"
   ```

## Build steps

From repo root:

```powershell
npm install
npm run build:plugin-data   # bundles server → obs-plugin/data/
cd obs-plugin
.\build.ps1
```

Output: `obs-plugin/build/Release/chatterbox.dll`

## Install (manual)

Copy to your OBS install:

```
chatterbox.dll  →  %ProgramFiles%\obs-studio\obs-plugins\64bit\
obs-plugin\data\*  →  %ProgramFiles%\obs-studio\data\obs-plugins\chatterbox\
```

Restart OBS.

## Usage in OBS

1. **Tools → Chatterbox → Open dashboard** — set up your profile (first time)
2. **Tools → Chatterbox → Add chat overlay to current scene** — inserts Browser Source
3. Server starts automatically when OBS loads

**No separate Node install** — plugin data includes `node/node.exe`. The plugin spawns bundled Node with `chatterbox-server.cjs`. Falls back to PATH `node.exe` only if the bundle is missing.

## Menu actions

| Action | What it does |
|--------|----------------|
| Add chat overlay | Creates Browser Source pointing at `http://127.0.0.1:3847/overlay/obs` |
| Open dashboard | Opens settings in default browser |
| Restart server | Restarts the Node backend |

## Roadmap

- [x] Bundle Node runtime (no separate Node install)
- [ ] Installer script (auto-copy to OBS path)
- [ ] macOS / Linux builds
- [ ] Qt WebEngine settings dock inside OBS
