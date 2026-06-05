import type { AppStatus, ChatMessage, Connector, StreamerProfile } from "../types.js";
import { TwitchConnector } from "./twitch.js";
import { KickConnector } from "./kick.js";
import { XBroadcastConnector } from "./x-broadcast.js";
import { isProfileComplete } from "../profile.js";
import type { MessageHub } from "../hub.js";

export class ConnectorManager {
  private connectors: Connector[];
  private profile: StreamerProfile | null = null;
  private hub: MessageHub;
  private onStatusChange: (() => void) | null = null;

  constructor(hub: MessageHub, onStatusChange?: () => void) {
    this.hub = hub;
    this.onStatusChange = onStatusChange ?? null;

    const ingest = (msg: Omit<ChatMessage, "mentionsStreamer" | "isFromStreamer">) => {
      hub.ingest(msg);
    };
    const notify = () => this.onStatusChange?.();

    this.connectors = [
      new TwitchConnector(ingest, notify),
      new KickConnector(ingest, notify),
      new XBroadcastConnector(ingest, notify),
    ];
  }

  async start(profile: StreamerProfile | null): Promise<void> {
    this.profile = profile;
    if (!isProfileComplete(profile)) {
      this.emitStatus();
      return;
    }

    await Promise.all(this.connectors.map((c) => c.start(profile!)));
    this.emitStatus();
  }

  async stop(): Promise<void> {
    await Promise.all(this.connectors.map((c) => c.stop()));
    this.emitStatus();
  }

  async restart(profile: StreamerProfile | null): Promise<void> {
    await this.stop();
    await this.start(profile);
  }

  getStatus(): AppStatus {
    const profile = this.profile;
    return {
      profileLoaded: profile !== null,
      profileComplete: isProfileComplete(profile),
      platforms: this.connectors.map((c) => c.getStatus()),
      messageCount: this.hub.getMessages().length,
      uptime: this.hub.getUptime(),
    };
  }

  emitStatus(): void {
    this.hub.emitStatus({ type: "status", data: this.getStatus() });
  }
}
