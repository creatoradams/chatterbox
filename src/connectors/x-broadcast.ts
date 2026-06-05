import WebSocket from "ws";
import type { ChatMessage, Connector, PlatformStatus, StreamerProfile } from "../types.js";

const BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUm17MJAw2N8t8.0.twitter.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

interface ChatAccess {
  endpoint: string;
  access_token: string;
  lifecycle_token?: string;
}

interface BroadcastInfo {
  mediaKey: string;
  chatToken: string;
}

export class XBroadcastConnector implements Connector {
  readonly platform = "x" as const;
  private ws: WebSocket | null = null;
  private state: PlatformStatus = this.emptyStatus();
  private onMessage: ((msg: Omit<ChatMessage, "mentionsStreamer" | "isFromStreamer">) => void) | null =
    null;
  private onStatusChange: (() => void) | null = null;
  private messageTimestamps: number[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private activeUrl: string | null = null;
  private guestToken: string | null = null;
  private stopped = true;

  constructor(
    onMessage: (msg: Omit<ChatMessage, "mentionsStreamer" | "isFromStreamer">) => void,
    onStatusChange?: () => void,
  ) {
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange ?? null;
  }

  async start(profile: StreamerProfile): Promise<void> {
    await this.stop();
    this.stopped = false;

    if (profile.platforms.x.enabled === false) {
      this.state = { ...this.emptyStatus(), state: "skipped", lastError: "X disabled in profile" };
      this.notifyStatus();
      return;
    }

    const broadcastUrl = profile.platforms.x.broadcastUrl?.trim();

    if (!broadcastUrl) {
      this.state = {
        ...this.emptyStatus(),
        state: "skipped",
        lastError: "X broadcast URL not set (add when live)",
      };
      this.notifyStatus();
      return;
    }

    this.activeUrl = broadcastUrl;
    this.state = { ...this.emptyStatus(), state: "connecting", target: broadcastUrl };
    this.notifyStatus();

    try {
      await this.connectBroadcast(broadcastUrl);
    } catch (err) {
      this.state = {
        ...this.state,
        state: "error",
        lastError: err instanceof Error ? err.message : String(err),
      };
      this.notifyStatus();
      this.scheduleReconnect();
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.state = this.emptyStatus();
    this.activeUrl = null;
    this.notifyStatus();
  }

  getStatus(): PlatformStatus {
    return { ...this.state, messagesPerMinute: this.calcRate() };
  }

  private notifyStatus(): void {
    this.onStatusChange?.();
  }

  private async connectBroadcast(broadcastUrl: string): Promise<void> {
    const broadcastId = this.extractBroadcastId(broadcastUrl);
    if (!broadcastId) throw new Error("Invalid X broadcast URL");

    await this.ensureGuestToken();
    const info = await this.resolveBroadcast(broadcastId);
    const chatAccess = await this.accessChat(info.chatToken);
    await this.loadChatHistory(chatAccess);
    await this.connectChatWs(chatAccess, info.mediaKey);
    this.state = { ...this.state, state: "connected", lastError: undefined };
    this.notifyStatus();
  }

  private extractBroadcastId(url: string): string | null {
    const match = url.match(/broadcasts\/([A-Za-z0-9_-]+)/);
    return match?.[1] ?? null;
  }

  private async ensureGuestToken(): Promise<void> {
    if (this.guestToken) return;
    const response = await fetch("https://api.twitter.com/1.1/guest/activate.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BEARER}`,
        "User-Agent": USER_AGENT,
      },
    });
    if (!response.ok) throw new Error(`X guest token failed (${response.status})`);
    const data = (await response.json()) as { guest_token?: string };
    if (!data.guest_token) throw new Error("X guest token missing");
    this.guestToken = data.guest_token;
  }

  private async resolveBroadcast(broadcastId: string): Promise<BroadcastInfo> {
    const response = await fetch(
      `https://api.twitter.com/1.1/broadcasts/show.json?ids=${encodeURIComponent(broadcastId)}`,
      {
        headers: {
          Authorization: `Bearer ${BEARER}`,
          "x-guest-token": this.guestToken!,
          "User-Agent": USER_AGENT,
        },
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        this.guestToken = null;
      }
      throw new Error(`X broadcast lookup failed (${response.status})`);
    }

    const data = (await response.json()) as {
      broadcasts?: Array<{
        media_key?: string;
        chat_token?: string;
      }>;
    };

    const broadcast = data.broadcasts?.[0];
    if (!broadcast?.media_key || !broadcast.chat_token) {
      throw new Error("X broadcast metadata incomplete — is the stream live?");
    }

    return { mediaKey: broadcast.media_key, chatToken: broadcast.chat_token };
  }

  private async accessChat(chatToken: string): Promise<ChatAccess> {
    const response = await fetch("https://proxsee.pscp.tv/api/v2/accessChat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Periscope-User-Agent": "Twitter/m5",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({ chat_token: chatToken }),
    });

    if (!response.ok) throw new Error(`X chat access failed (${response.status})`);
    const data = (await response.json()) as ChatAccess;
    if (!data.endpoint || !data.access_token) {
      throw new Error("X chat access response incomplete");
    }
    return data;
  }

  private async loadChatHistory(chatAccess: ChatAccess): Promise<void> {
    try {
      const base = chatAccess.endpoint.replace(/\/$/, "");
      const url = `${base}/chatapi/v1/history?access_token=${encodeURIComponent(chatAccess.access_token)}&cursor=&count=50`;
      const response = await fetch(url, {
        headers: { "X-Periscope-User-Agent": "Twitter/m5", "User-Agent": USER_AGENT },
      });
      if (!response.ok) return;

      const data = (await response.json()) as {
        messages?: Array<{ payload?: string }>;
      };

      for (const item of data.messages ?? []) {
        if (!item.payload) continue;
        try {
          const inner = JSON.parse(item.payload) as {
            body?: string;
            displayName?: string;
            username?: string;
            uuid?: string;
          };
          const text = inner.body || "";
          if (!text) continue;
          const username = inner.displayName || inner.username || "unknown";
          const id = `x-${inner.uuid || `hist-${Math.random()}`}`;
          this.onMessage?.({
            id,
            platform: "x",
            username,
            text,
            timestamp: Date.now(),
          });
        } catch {
          // skip bad history entries
        }
      }
    } catch {
      // history is optional — live WS still works
    }
  }

  private connectChatWs(chatAccess: ChatAccess, mediaKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${chatAccess.endpoint.replace(/^http/, "ws")}/chatapi/v1/chatnow`;
      this.ws = new WebSocket(wsUrl, {
        headers: {
          "X-Periscope-User-Agent": "Twitter/m5",
        },
      });

      this.ws.on("open", () => {
        this.ws?.send(
          JSON.stringify({
            kind: 3,
            access_token: chatAccess.access_token,
            media_key: mediaKey,
          }),
        );
        resolve();
      });

      this.ws.on("message", (raw) => {
        try {
          const payload = JSON.parse(String(raw)) as {
            kind?: number;
            payload?: string;
          };
          if (payload.kind !== 1 || !payload.payload) return;
          const inner = JSON.parse(payload.payload) as {
            body?: string;
            displayName?: string;
            username?: string;
            uuid?: string;
          };
          const text = inner.body || "";
          const username = inner.displayName || inner.username || "unknown";
          const id = `x-${inner.uuid || `${Date.now()}-${Math.random()}`}`;
          this.recordMessage();
          this.onMessage?.({
            id,
            platform: "x",
            username,
            text,
            timestamp: Date.now(),
          });
        } catch {
          // ignore malformed frames
        }
      });

      this.ws.on("close", () => {
        this.state = { ...this.state, state: "disconnected", lastError: "WebSocket closed" };
        this.notifyStatus();
        if (!this.stopped) this.scheduleReconnect();
      });

      this.ws.on("error", (err) => {
        reject(err);
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.stopped || !this.activeUrl) return;
      this.guestToken = null;
      try {
        await this.connectBroadcast(this.activeUrl);
      } catch (err) {
        this.state = {
          ...this.state,
          state: "error",
          lastError: err instanceof Error ? err.message : String(err),
        };
        this.notifyStatus();
        this.scheduleReconnect();
      }
    }, 8000);
  }

  private emptyStatus(): PlatformStatus {
    return { platform: "x", state: "disconnected", messageCount: 0, messagesPerMinute: 0 };
  }

  private recordMessage(): void {
    this.state.messageCount += 1;
    this.messageTimestamps.push(Date.now());
    this.trimTimestamps();
  }

  private trimTimestamps(): void {
    const cutoff = Date.now() - 60_000;
    this.messageTimestamps = this.messageTimestamps.filter((t) => t >= cutoff);
  }

  private calcRate(): number {
    this.trimTimestamps();
    return this.messageTimestamps.length;
  }
}
