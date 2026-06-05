import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, existsSync, statSync, unlinkSync } from "node:fs";
import { join, extname } from "node:path";
import { config, getRootPath, getProfilePath } from "../config.js";
import type { MessageHub } from "../hub.js";
import type { ConnectorManager } from "../connectors/index.js";
import { loadProfile, saveProfile, validateProfile } from "../profile.js";
import type { ServerConfig, StreamerProfile } from "../types.js";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk as Buffer));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function serveStatic(res: ServerResponse, filePath: string): void {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }
  const ext = extname(filePath);
  const type = MIME[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  res.end(readFileSync(filePath));
}

export function createHttpServer(
  hub: MessageHub,
  connectors: ConnectorManager,
  onProfileUpdate: (profile: StreamerProfile | null) => Promise<void>,
): import("node:http").Server {
  const root = getRootPath();
  const publicDir = join(root, "public");

  return createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    try {
      if (pathname === "/api/status" && req.method === "GET") {
        sendJson(res, 200, connectors.getStatus());
        return;
      }

      if (pathname === "/api/health" && req.method === "GET") {
        sendJson(res, 200, {
          ok: true,
          uptime: hub.getUptime(),
          profileLoaded: (hub.getProfile() ?? loadProfile()) !== null,
        });
        return;
      }

      if (pathname === "/api/messages" && req.method === "GET") {
        const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 150);
        const messages = hub.getMessages().slice(-limit);
        sendJson(res, 200, { messages, count: messages.length });
        return;
      }

      if (pathname === "/api/config" && req.method === "GET") {
        const safeConfig: ServerConfig = { ...config };
        sendJson(res, 200, safeConfig);
        return;
      }

      if (pathname === "/api/profile" && req.method === "GET") {
        const profile = hub.getProfile() ?? loadProfile();
        sendJson(res, 200, { profile, exists: profile !== null });
        return;
      }

      if (pathname === "/api/profile" && req.method === "PUT") {
        const body = await readBody(req);
        const parsed = JSON.parse(body) as unknown;
        const result = validateProfile(parsed);
        if (!result.ok) {
          sendJson(res, 400, { error: result.error });
          return;
        }
        saveProfile(result.profile);
        hub.setProfile(result.profile);
        await onProfileUpdate(result.profile);
        sendJson(res, 200, { profile: result.profile, status: connectors.getStatus() });
        return;
      }

      if (pathname === "/api/profile" && req.method === "DELETE") {
        const profilePath = getProfilePath();
        if (existsSync(profilePath)) unlinkSync(profilePath);
        hub.setProfile(null);
        hub.clear();
        await onProfileUpdate(null);
        sendJson(res, 200, { ok: true });
        return;
      }

      if (pathname === "/api/buffer/clear" && req.method === "POST") {
        hub.clear();
        sendJson(res, 200, { ok: true });
        return;
      }

      if (pathname === "/api/reconnect" && req.method === "POST") {
        const profile = hub.getProfile() ?? loadProfile();
        await onProfileUpdate(profile);
        sendJson(res, 200, connectors.getStatus());
        return;
      }

      if (pathname === "/api/simulate" && req.method === "POST") {
        const body = await readBody(req);
        const parsed = JSON.parse(body) as {
          id?: string;
          platform?: string;
          username?: string;
          text?: string;
          timestamp?: number;
          badges?: string[];
          color?: string;
        };
        const platform = parsed.platform;
        if (platform !== "twitch" && platform !== "kick" && platform !== "x") {
          sendJson(res, 400, { error: "Invalid platform" });
          return;
        }
        const message = hub.ingest({
          id: parsed.id || `sim-${Date.now()}`,
          platform,
          username: parsed.username || "simuser",
          text: parsed.text || "test message",
          timestamp: parsed.timestamp || Date.now(),
          badges: parsed.badges,
          color: parsed.color,
        });
        sendJson(res, 200, { ok: true, message });
        return;
      }

      if (pathname === "/" || pathname === "/dashboard" || pathname === "/dashboard/") {
        serveStatic(res, join(publicDir, "dashboard", "index.html"));
        return;
      }

      if (pathname === "/overlay/obs" || pathname === "/overlay/obs/") {
        serveStatic(res, join(publicDir, "overlay", "obs.html"));
        return;
      }

      if (pathname === "/overlay" || pathname === "/overlay/") {
        serveStatic(res, join(publicDir, "overlay", "obs.html"));
        return;
      }

      if (pathname.startsWith("/overlay/")) {
        serveStatic(res, join(publicDir, "overlay", pathname.slice("/overlay/".length)));
        return;
      }

      if (pathname.startsWith("/dashboard/")) {
        serveStatic(res, join(publicDir, "dashboard", pathname.slice("/dashboard/".length)));
        return;
      }

      if (pathname.startsWith("/shared/")) {
        serveStatic(res, join(publicDir, "shared", pathname.slice("/shared/".length)));
        return;
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (err) {
      sendJson(res, 500, {
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  });
}

export function getListenConfig(): { host: string; port: number } {
  return { host: config.host, port: config.port };
}
