/**
 * Bundles Chatterbox server + static assets for the OBS hybrid plugin.
 * Output: obs-plugin/data/
 */
import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "obs-plugin", "data");

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

await esbuild.build({
  entryPoints: [join(ROOT, "src/index.ts")],
  outfile: join(OUT, "chatterbox-server.cjs"),
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  sourcemap: false,
  logLevel: "info",
});

cpSync(join(ROOT, "public"), join(OUT, "public"), { recursive: true });
cpSync(join(ROOT, "config.example.json"), join(OUT, "config.example.json"));
cpSync(join(ROOT, "streamer.example.json"), join(OUT, "streamer.example.json"));
cpSync(join(ROOT, ".env.example"), join(OUT, ".env.example"));

execSync("node scripts/build-obs-local.mjs", { cwd: ROOT, stdio: "inherit" });
cpSync(join(ROOT, "obs", "chatterbox-overlay.html"), join(OUT, "chatterbox-overlay.html"));

writeFileSync(
  join(OUT, "README.txt"),
  `Chatterbox plugin data folder.
Run by OBS plugin: node chatterbox-server.cjs
Requires Node.js 20+ on PATH.
Dashboard: http://127.0.0.1:3847/dashboard/
`,
);

console.log("Plugin data bundle ready:", OUT);
