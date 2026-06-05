/**
 * Bundles Chatterbox server + static assets + portable Node for OBS plugin.
 * Output: obs-plugin/data/
 */
import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { ensurePortableNode } from "./download-node.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "obs-plugin", "data");

export async function bundlePluginData(outDir = OUT) {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  await esbuild.build({
    entryPoints: [join(ROOT, "src/index.ts")],
    outfile: join(outDir, "chatterbox-server.cjs"),
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    sourcemap: false,
    logLevel: "info",
  });

  cpSync(join(ROOT, "public"), join(outDir, "public"), { recursive: true });
  cpSync(join(ROOT, "config.example.json"), join(outDir, "config.example.json"));
  cpSync(join(ROOT, "streamer.example.json"), join(outDir, "streamer.example.json"));
  cpSync(join(ROOT, ".env.example"), join(outDir, ".env.example"));

  execSync("node scripts/build-obs-local.mjs", { cwd: ROOT, stdio: "inherit" });
  cpSync(join(ROOT, "obs", "chatterbox-overlay.html"), join(outDir, "chatterbox-overlay.html"));

  await ensurePortableNode(outDir);

  writeFileSync(
    join(outDir, "README.txt"),
    `Chatterbox runtime bundle (includes portable Node.js).
Started by OBS plugin or Start Chatterbox.bat — no separate Node install needed.
Dashboard: http://127.0.0.1:3847/dashboard/
`,
  );

  console.log("Plugin data bundle ready:", outDir);
  return outDir;
}

const isMain = process.argv[1]?.includes("bundle-plugin-data.mjs");
if (isMain) {
  bundlePluginData().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
