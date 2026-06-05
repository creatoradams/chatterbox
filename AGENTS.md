# AGENTS.md — Unified Chat Aggregator

## Summary

Local Node.js app merging **one streamer's** Twitch IRC, Kick Pusher, and X broadcast chat into a single WebSocket feed. Streamers configure a `StreamerProfile` via the dashboard; the OBS overlay renders color-coded pills, Twitch badges, and mention highlights.

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
| `src/profile.ts` | Load/save/validate `streamer.local.json` |
| `src/highlights.ts` | Mention detection, blocklists, sanitize |
| `src/hub.ts` | Ring buffer + ingest pipeline |
| `src/connectors/kick-lookup.ts` | Kick chatroom ID with CF cookie support |
| `src/connectors/index.ts` | Connector manager + status broadcasts |
| `public/overlay/` | OBS browser source |
| `public/dashboard/` | Profile wizard, preview, OBS guide |

## Commands

```bash
npm install
npm run dev
npm run simulate
npm run build
npm test
```

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

- `KICK_SESSION_COOKIE` — bypass Kick Cloudflare on channel lookup
- `KICK_PUSHER_APP_KEY` — update if Kick changes Pusher app id
