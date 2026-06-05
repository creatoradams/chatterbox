import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import type { ServerConfig } from "./types.js";

function resolveBundledRoot(): string {
  const fromEnv = process.env.CHATTERBOX_DATA_DIR?.trim();
  if (fromEnv) return fromEnv;

  const entry = process.argv[1];
  if (entry?.includes("chatterbox-server")) {
    return dirname(entry);
  }

  if (typeof __dirname !== "undefined") {
    return __dirname;
  }

  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

const ROOT = resolveBundledRoot();

function loadJsonFile<T>(filename: string, fallback: T): T {
  const path = join(ROOT, filename);
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function loadEnv(): void {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const defaults: ServerConfig = {
  port: 3847,
  host: "127.0.0.1",
  bufferSize: 150,
  maxMessageLength: 500,
  kickPusherAppKey: "32cbd69e4b950bf97679",
  kickPusherCluster: "us2",
};

const fileConfig = loadJsonFile<Partial<ServerConfig>>("config.json", {});
const exampleConfig = loadJsonFile<Partial<ServerConfig>>("config.example.json", {});

export const config: ServerConfig = {
  ...defaults,
  ...exampleConfig,
  ...fileConfig,
  port: Number(process.env.PORT) || fileConfig.port || exampleConfig.port || defaults.port,
  kickPusherAppKey:
    process.env.KICK_PUSHER_APP_KEY ||
    fileConfig.kickPusherAppKey ||
    exampleConfig.kickPusherAppKey ||
    defaults.kickPusherAppKey,
  kickSessionCookie:
    process.env.KICK_SESSION_COOKIE ||
    fileConfig.kickSessionCookie ||
    exampleConfig.kickSessionCookie,
};

export function getRootPath(): string {
  return ROOT;
}

export function getProfilePath(): string {
  return join(ROOT, "streamer.local.json");
}

export function getExampleProfilePath(): string {
  return join(ROOT, "streamer.example.json");
}

export function saveLocalConfig(updates: Partial<ServerConfig>): void {
  const path = join(ROOT, "config.local.json");
  const existing = loadJsonFile<Partial<ServerConfig>>("config.local.json", {});
  writeFileSync(path, JSON.stringify({ ...existing, ...updates }, null, 2));
}

export function createProfileId(): string {
  return randomUUID();
}
