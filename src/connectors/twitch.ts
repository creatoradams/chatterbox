import tmi from "tmi.js";
import type { ChatMessage, Connector, PlatformStatus, StreamerProfile } from "../types.js";

function extractTwitchBadges(tags: tmi.ChatUserstate): string[] {
  const badges: string[] = [];
  if (tags.mod || tags.badges?.moderator) badges.push("MOD");
  if (tags.badges?.vip) badges.push("VIP");
  if (tags.subscriber || tags.badges?.subscriber) badges.push("SUB");
  return badges;
}

export class TwitchConnector implements Connector {
  readonly platform = "twitch" as const;
  private client: tmi.Client | null = null;
  private state: PlatformStatus = this.emptyStatus();
  private onMessage: ((msg: Omit<ChatMessage, "mentionsStreamer" | "isFromStreamer">) => void) | null =
    null;
  private onStatusChange: (() => void) | null = null;
  private messageTimestamps: number[] = [];

  constructor(
    onMessage: (msg: Omit<ChatMessage, "mentionsStreamer" | "isFromStreamer">) => void,
    onStatusChange?: () => void,
  ) {
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange ?? null;
  }

  async start(profile: StreamerProfile): Promise<void> {
    await this.stop();
    const channel = profile.platforms.twitch.channel;
    if (profile.platforms.twitch.enabled === false) {
      this.state = { ...this.emptyStatus(), state: "skipped", lastError: "Twitch disabled in profile" };
      this.notifyStatus();
      return;
    }
    if (!channel) {
      this.state = { ...this.emptyStatus(), state: "skipped", lastError: "Twitch channel not set" };
      this.notifyStatus();
      return;
    }

    this.state = {
      ...this.emptyStatus(),
      state: "connecting",
      target: channel,
    };
    this.notifyStatus();

    this.client = new tmi.Client({
      options: { debug: false },
      connection: { secure: true, reconnect: true },
      channels: [channel],
    });

    this.client.on("message", (_channel, tags, message, self) => {
      if (self) return;
      const username = tags["display-name"] || tags.username || "unknown";
      const id = `twitch-${tags.id || `${Date.now()}-${Math.random()}`}`;
      this.recordMessage();
      this.onMessage?.({
        id,
        platform: "twitch",
        username,
        text: message,
        timestamp: Date.now(),
        color: tags.color || undefined,
        badges: extractTwitchBadges(tags),
      });
    });

    this.client.on("connected", () => {
      this.state = {
        ...this.state,
        state: "connected",
        lastError: undefined,
      };
      this.notifyStatus();
    });

    this.client.on("disconnected", (reason) => {
      this.state = {
        ...this.state,
        state: "disconnected",
        lastError: reason || "Disconnected",
      };
      this.notifyStatus();
    });

    try {
      await this.client.connect();
    } catch (err) {
      this.state = {
        ...this.state,
        state: "error",
        lastError: err instanceof Error ? err.message : String(err),
      };
      this.notifyStatus();
    }
  }

  async stop(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
      } catch {
        // ignore disconnect errors
      }
      this.client = null;
    }
    this.state = this.emptyStatus();
    this.notifyStatus();
  }

  getStatus(): PlatformStatus {
    return {
      ...this.state,
      messagesPerMinute: this.calcRate(),
    };
  }

  private notifyStatus(): void {
    this.onStatusChange?.();
  }

  private emptyStatus(): PlatformStatus {
    return {
      platform: "twitch",
      state: "disconnected",
      messageCount: 0,
      messagesPerMinute: 0,
    };
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
