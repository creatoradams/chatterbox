# AGENTS.md — Chatterbox

## Summary

Local Node.js app merging **one streamer's** Twitch IRC, Kick Pusher, and X broadcast chat into a single WebSocket feed. Streamers configure a `StreamerProfile` via the dashboard; the OBS overlay renders color-coded pills, Twitch badges, and mention highlights.

**GitHub:** https://github.com/creatoradams/chatterbox  
**Default bind:** `127.0.0.1:3847`

## Data flow

```
connectors/twitch.ts  ─┐
connectors/kick.ts    ─┼─► hub.ts (normalize, filter, highlight) ─► server/ws.ts ─► overlay + dashboard
connectors/x-broadcast.ts ─┘
```

## Key files

| File | Role |
|------|------|
| `src/types.ts` | `ChatMessage`, `StreamerProfile`, platform colors |
| `src/config.ts` | Paths; `CHATTERBOX_DATA_DIR`; bundled root via `process.argv[1]` for CJS |
| `src/profile.ts` | Load/save/validate `streamer.local.json` |
| `src/highlights.ts` | Mention detection, blocklists, sanitize |
| `src/hub.ts` | Ring buffer + ingest pipeline |
| `src/connectors/kick-lookup.ts` | Kick chatroom ID with CF cookie support |
| `src/connectors/index.ts` | Connector manager + status broadcasts |
| `public/overlay/overlay-standalone.js` | OBS-safe overlay (no ES modules) |
| `public/dashboard/` | Profile wizard, preview, OBS guide |
| `scripts/download-node.mjs` | Downloads portable Node → `node/node.exe` |
| `scripts/bundle-plugin-data.mjs` | Server bundle → `obs-plugin/data/` |
| `scripts/build-release.mjs` | Portable `release/chatterbox/` for streamers |
| `obs-plugin/src/server-manager.cpp` | Spawns bundled `node.exe` + server |

## Commands

```bash
npm install
npm run dev              # dev server (tsx watch)
npm run simulate         # inject fake chat (server must be running)
npm run build:release    # portable folder + bundled Node
npm run build:plugin-data # OBS plugin data bundle
npm run build:obs        # local OBS HTML file
npm test                 # unit tests (highlights, profile)
```

## Testing (quick)

1. Stop anything on port **3847** (otherwise portable start fails with `EADDRINUSE`).
2. `npm run build:release` → open `release/chatterbox/Start Chatterbox.bat`.
3. Dashboard: http://127.0.0.1:3847/dashboard/
4. From repo (second terminal): `npm run simulate` — messages appear in dashboard + overlay.
5. OBS: Browser source → local file `chatterbox-overlay.html` **or** URL `http://127.0.0.1:3847/overlay/obs` (450×900).

## Streamer distribution

- Build: `npm run build:release`
- Ship: zip `release/chatterbox/` as `Chatterbox.zip` (GitHub Releases)
- `release/` and `obs-plugin/data/` are gitignored (contain ~82MB `node.exe`)

## OBS notes

- OBS CEF does **not** support ES modules — use `overlay-standalone.js` / `obs.html` / bundled HTML.
- Local file overlay still needs the **server running** for live chat.
- Hybrid C++ plugin (`obs-plugin/`) auto-starts bundled server; requires OBS dev SDK + VS 2022 to compile DLL.

## API

- `GET /api/profile` — current profile
- `PUT /api/profile` — save + restart connectors
- `DELETE /api/profile` — reset profile
- `GET /api/status` — platform connection status
- `GET /api/messages?limit=N` — buffered messages
- `GET /api/health` — uptime check
- `POST /api/buffer/clear` — clear buffer
- `POST /api/reconnect` — restart connectors
- `POST /api/simulate` — dev message injection

## Adding a platform

1. Create `src/connectors/{platform}.ts` implementing `Connector`.
2. Register in `src/connectors/index.ts`.
3. Add CSS pill in `public/overlay/overlay.css`.

## Environment

- `CHATTERBOX_DATA_DIR` — runtime root when spawned by plugin/launcher
- `KICK_SESSION_COOKIE` — bypass Kick Cloudflare on channel lookup
- `KICK_PUSHER_APP_KEY` — update if Kick changes Pusher app id
- `PORT` — default 3847

## Gotchas

- Bundled CJS server: `import.meta.url` is empty — `config.ts` uses `process.argv[1]` fallback.
- Only one server instance per port; dev + portable cannot both bind 3847.
- Kick 403 → set `KICK_SESSION_COOKIE` in `.env`.
