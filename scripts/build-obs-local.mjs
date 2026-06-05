/**
 * Builds a single HTML file for OBS "Local file" browser source.
 * Run: npm run build:obs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(ROOT, "public/overlay/overlay.css"), "utf-8");
let js = readFileSync(join(ROOT, "public/overlay/overlay-standalone.js"), "utf-8");

// Force localhost when opened as a local file in OBS
js = js.replace(
  'var protocol = location.protocol === "https:" ? "wss:" : "ws:";',
  `var SERVER = "127.0.0.1:3847";
      var protocol = "ws:";
      var wsHost = SERVER;`,
);
js = js.replace(
  'ws = new WebSocket(protocol + "//" + location.host + "/ws");',
  'ws = new WebSocket(protocol + "//" + wsHost + "/ws");',
);
js = js.replace('xhr.open("GET", "/api/profile");', 'xhr.open("GET", "http://" + SERVER + "/api/profile");');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Chatterbox — OBS Overlay</title>
  <style>
${css}
    #obs-error {
      position: fixed; bottom: 8px; left: 8px; right: 8px;
      background: rgba(180, 30, 30, 0.9); color: #fff;
      padding: 8px 12px; border-radius: 6px; font-size: 13px;
      z-index: 9999; text-align: center;
    }
    #obs-error.hidden { display: none; }
  </style>
</head>
<body>
  <div id="obs-error" class="hidden"></div>
  <div id="app">
    <header id="header" class="header hidden">
      <div id="header-title" class="header-title"></div>
      <div id="header-tagline" class="header-tagline hidden"></div>
    </header>
    <div id="feed" class="feed">
      <div class="empty">Connecting to Chatterbox…</div>
    </div>
  </div>
  <script>
${js}
  </script>
</body>
</html>
`;

const outDir = join(ROOT, "obs");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "chatterbox-overlay.html");
writeFileSync(outPath, html);
console.log("Built:", outPath);
console.log("Use in OBS: Sources -> Browser -> check 'Local file' -> select this file");
