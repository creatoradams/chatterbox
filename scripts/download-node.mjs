/**
 * Downloads portable Node.js (Windows x64) for bundled distributions.
 * Usage: node scripts/download-node.mjs <outputDir>
 * Output: <outputDir>/node/node.exe
 */
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { execSync } from "node:child_process";
import { Readable } from "node:stream";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = readFileSync(join(ROOT, "scripts/node-version.txt"), "utf-8").trim();

export async function ensurePortableNode(outDir) {
  const nodeDir = join(outDir, "node");
  const nodeExe = join(nodeDir, "node.exe");
  const stamp = join(nodeDir, `.node-v${VERSION}`);

  if (existsSync(nodeExe) && existsSync(stamp)) {
    console.log("Portable Node already present:", nodeExe);
    return nodeExe;
  }

  if (process.platform !== "win32") {
    console.warn("Portable Node download is Windows-only; using system node on PATH.");
    return null;
  }

  const zipName = `node-v${VERSION}-win-x64.zip`;
  const url = `https://nodejs.org/dist/v${VERSION}/${zipName}`;
  const tmpDir = join(outDir, ".node-download");
  const zipPath = join(tmpDir, zipName);

  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(nodeDir, { recursive: true });

  console.log("Downloading Node.js", VERSION, "...");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download Node: ${res.status} ${url}`);

  await pipeline(Readable.fromWeb(res.body), createWriteStream(zipPath));
  console.log("Extracting node.exe ...");

  const esc = (p) => p.replace(/'/g, "''");
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Path '${esc(zipPath)}' -DestinationPath '${esc(tmpDir)}' -Force"`,
    { stdio: "inherit" },
  );

  const extracted = join(tmpDir, `node-v${VERSION}-win-x64`, "node.exe");
  if (!existsSync(extracted)) throw new Error("node.exe not found in archive");

  execSync(
    `powershell -NoProfile -Command "Copy-Item -Path '${esc(extracted)}' -Destination '${esc(nodeExe)}' -Force"`,
  );
  writeFileSync(stamp, VERSION);

  rmSync(tmpDir, { recursive: true, force: true });
  console.log("Portable Node ready:", nodeExe);
  return nodeExe;
}

const isMain = process.argv[1]?.includes("download-node.mjs");
if (isMain) {
  const out = process.argv[2] || join(ROOT, "obs-plugin", "data");
  ensurePortableNode(out).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
