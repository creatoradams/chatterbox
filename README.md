# Chatterbox

Unified **Twitch + Kick + X** live chat in one color-coded feed — built for streamers.

## Quick start

```bash
npm install
npm run dev
```

Open **http://127.0.0.1:3847/dashboard/** and set up your streamer profile.

## Add to OBS

Chatterbox needs the **server running** in the background (`npm run dev`). The overlay connects to it for live chat.

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

## URLs

| Page | URL |
|------|-----|
| Dashboard | http://127.0.0.1:3847/dashboard/ |
| OBS (URL mode) | http://127.0.0.1:3847/overlay/obs |
| OBS (file mode) | `obs/chatterbox-overlay.html` after `npm run build:obs` |

## Scripts

```bash
npm run dev          # start server
npm run build:obs    # build local OBS HTML file
npm run obs:setup    # guided OBS setup
npm run simulate     # test messages
npm test             # unit tests
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
