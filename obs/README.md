# Chatterbox — OBS Setup

## Local file (no URL in OBS)

```bash
npm run build:obs
```

Opens **`obs/chatterbox-overlay.html`** — one self-contained HTML file.

In OBS:
1. Sources → **+** → **Browser**
2. **Check** "Local file"
3. Select `chatterbox-overlay.html` from this folder
4. Width **450**, Height **900**
5. Check "Refresh browser when scene becomes active"

**You still need the server running** (`npm run dev`). The HTML file is just the display — chat data comes from the local Chatterbox server at `127.0.0.1:3847`.

## URL mode

Uncheck "Local file", use: `http://127.0.0.1:3847/overlay/obs`

## Custom dock

View → Docks → Custom Browser Docks → `http://127.0.0.1:3847/dashboard/`

## Setup helper

```bash
npm run obs:setup
```
