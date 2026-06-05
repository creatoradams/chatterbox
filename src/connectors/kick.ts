import WebSocket from "ws";
import type { ChatMessage, Connector, PlatformStatus, StreamerProfile } from "../types.js";
import { config } from "../config.js";
import { resolveKickChatroomId } from "./kick-lookup.js";

interface KickChatPayload {
  id?: string;
  content?: string;
  sender?: {
    username?: string;
    slug?: string;
    identity?: { color?: string };
  };
}

export class KickConnector implements Connector {
  readonly platform = "kick" as const;
  private ws: WebSocket | null = null;
  private state: PlatformStatus = this.emptyStatus();
  private onMessage: ((msg: Omit<ChatMessage, "mentionsStreamer" | "isFromStreamer">) => void) | null =
    null;
  private onStatusChange: (() => void) | null = null;
  private messageTimestamps: number[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private activeSlug: string | null = null;
  private chatroomId: number | null = null;
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
    const slug = profile.platforms.kick.slug;

    if (profile.platforms.kick.enabled === false) {
      this.state = { ...this.emptyStatus(), state: "skipped", lastError: "Kick disabled in profile" };
      this.notifyStatus();
      return;
    }
    if (!slug) {
      this.state = { ...this.emptyStatus(), state: "skipped", lastError: "Kick slug not set" };
      this.notifyStatus();
      return;
    }

    this.activeSlug = slug;
    this.state = { ...this.emptyStatus(), state: "connecting", target: slug };
    this.notifyStatus();

    try {
      this.chatroomId = await resolveKickChatroomId(slug);
      await this.connectPusher();
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
    this.activeSlug = null;
    this.chatroomId = null;
    this.notifyStatus();
  }

  getStatus(): PlatformStatus {
    return { ...this.state, messagesPerMinute: this.calcRate() };
  }

  private notifyStatus(): void {
    this.onStatusChange?.();
  }

  private connectPusher(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.chatroomId) {
        reject(new Error("Missing chatroom id"));
        return;
      }

      const url = `wss://ws-${config.kickPusherCluster}.pusher.com/app/${config.kickPusherAppKey}?protocol=7&client=js&version=8.4.0&flash=false`;
      this.ws = new WebSocket(url);
      const id = this.chatroomId;

      this.ws.on("open", () => {
        const channels = [
          `chatrooms.${id}.v2`,
          `chatrooms.${id}`,
          `chatroom_${id}`,
        ];
        for (const channel of channels) {
          this.ws?.send(
            JSON.stringify({ event: "pusher:subscribe", data: { auth: "", channel } }),
          );
        }
        this.state = { ...this.state, state: "connected", lastError: undefined };
        this.notifyStatus();
        resolve();
      });

      this.ws.on("message", (data) => {
        try {
          const frame = JSON.parse(String(data)) as { event?: string; data?: string };
          if (frame.event !== "App\\Events\\ChatMessageEvent" || !frame.data) return;
          const payload = JSON.parse(frame.data) as KickChatPayload;
          const username = payload.sender?.username || payload.sender?.slug || "unknown";
          const text = payload.content || "";
          const msgId = `kick-${payload.id || `${Date.now()}-${Math.random()}`}`;
          this.recordMessage();
          this.onMessage?.({
            id: msgId,
            platform: "kick",
            username,
            text,
            timestamp: Date.now(),
            color: payload.sender?.identity?.color,
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
        this.state = {
          ...this.state,
          state: "error",
          lastError: err instanceof Error ? err.message : String(err),
        };
        this.notifyStatus();
        reject(err);
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.stopped || !this.activeSlug) return;
      try {
        this.chatroomId = await resolveKickChatroomId(this.activeSlug);
        await this.connectPusher();
      } catch (err) {
        this.state = {
          ...this.state,
          state: "error",
          lastError: err instanceof Error ? err.message : String(err),
        };
        this.notifyStatus();
        this.scheduleReconnect();
      }
    }, 5000);
  }

  private emptyStatus(): PlatformStatus {
    return { platform: "kick", state: "disconnected", messageCount: 0, messagesPerMinute: 0 };
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
