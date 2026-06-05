# Chatterbox

Unified **Twitch + Kick + X** live chat in one color-coded feed — built for streamers.

## Quick start (streamers — no Node install)

1. Download the portable **`Chatterbox.zip`** from [Releases](https://github.com/creatoradams/chatterbox/releases) (or build it below)
2. Unzip anywhere
3. Double-click **`Start Chatterbox.bat`**
4. Open **http://127.0.0.1:3847/dashboard/** and set up your profile

Bundled Node is included — streamers do not need to install Node.js.

### Build the portable release (developers)

```bash
npm install
npm run build:release
```

Output: **`release/chatterbox/`** — zip and share. Or double-click **`start.bat`** at repo root (builds on first run).

### Dev mode

```bash
npm install
npm run dev
```

## Add to OBS

Chatterbox needs the **server running** in the background (`Start Chatterbox.bat` or `npm run dev`). The overlay connects to it for live chat.

### Option A — Local file (recommended)

```bash
npm run build:obs
```

This creates **`obs/chatterbox-overlay.html`** — a single file you can download/keep anywhere.

1. OBS → Sources → **+** → **Browser**
2. **Check** "Local file"
3. Browse to `obs/chatterbox-overlay.html`
4. Width **450**, Height **900**
5. Check "Refresh browser when scene becomes active"

### Option B — URL

1. OBS → Sources → **+** → **Browser**
2. **Uncheck** "Local file"
3. URL: `http://127.0.0.1:3847/overlay/obs`

### Custom dock (settings inside OBS)

View → Docks → Custom Browser Docks → URL: `http://127.0.0.1:3847/dashboard/`

Run `npm run obs:setup` for a guided walkthrough.

## OBS hybrid plugin (C++)

Native OBS plugin that auto-starts the server and adds the overlay from **Tools → Chatterbox**.

See **[obs-plugin/README.md](obs-plugin/README.md)** for build instructions (requires OBS dev SDK + Visual Studio).

```powershell
npm run build:plugin-data
cd obs-plugin
$env:OBS_DIR = "C:\path\to\obs-studio\build"
.\build.ps1
```

## URLs

| Page | URL |
|------|-----|
| Dashboard | http://127.0.0.1:3847/dashboard/ |
| OBS (URL mode) | http://127.0.0.1:3847/overlay/obs |
| OBS (file mode) | `obs/chatterbox-overlay.html` after `npm run build:obs` |

## Scripts

```bash
npm run dev              # start server (dev)
npm run build:release    # portable folder + bundled Node
npm run build:plugin-data # OBS plugin data bundle
npm run build:obs        # build local OBS HTML file
npm run obs:setup        # guided OBS setup
npm run simulate         # test messages
npm test                 # unit tests
```

## Config

| File | Purpose |
|------|---------|
| `streamer.local.json` | Your profile (gitignored) |
| `.env` | `PORT`, `KICK_PUSHER_APP_KEY`, optional `KICK_SESSION_COOKIE` |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank overlay in OBS | Start `npm run dev` first — the local file still needs the server |
| "Disconnected" banner | Server not running |
| Kick 403 | Add `KICK_SESSION_COOKIE` to `.env` |

## License

MIT
