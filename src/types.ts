export type Platform = "twitch" | "kick" | "x";

export interface ChatMessage {
  id: string;
  platform: Platform;
  username: string;
  text: string;
  timestamp: number;
  color?: string;
  badges?: string[];
  mentionsStreamer?: boolean;
  isFromStreamer?: boolean;
}

export interface PlatformChannelConfig {
  enabled?: boolean;
}

export interface StreamerProfile {
  id: string;
  displayName: string;
  tagline?: string;
  platforms: {
    twitch: PlatformChannelConfig & { channel: string };
    kick: PlatformChannelConfig & { slug: string };
    x: PlatformChannelConfig & { broadcastUrl?: string };
  };
  aliases: string[];
  overlay: {
    showHeader: boolean;
    headerTitle?: string;
    fontScale: number;
    highlightMentions: boolean;
    highlightKeywords?: string[];
    hideOwnMessages?: boolean;
  };
  filters?: {
    blockedUsers: string[];
    blockedWords: string[];
  };
}

export interface ServerConfig {
  port: number;
  host: string;
  bufferSize: number;
  maxMessageLength: number;
  kickPusherAppKey: string;
  kickPusherCluster: string;
  kickSessionCookie?: string;
}

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error" | "skipped";

export interface PlatformStatus {
  platform: Platform;
  state: ConnectionState;
  target?: string;
  lastError?: string;
  messageCount: number;
  messagesPerMinute: number;
}

export interface AppStatus {
  profileLoaded: boolean;
  profileComplete: boolean;
  platforms: PlatformStatus[];
  messageCount: number;
  uptime: number;
}

export interface Connector {
  readonly platform: Platform;
  start(profile: StreamerProfile): Promise<void>;
  stop(): Promise<void>;
  getStatus(): PlatformStatus;
}

export const PLATFORM_COLORS: Record<
  Platform,
  { label: string; username: string; glow: string }
> = {
  kick: { label: "#53FC18", username: "#53FC18", glow: "rgba(83, 252, 24, 0.35)" },
  twitch: { label: "#9146FF", username: "#9146FF", glow: "rgba(145, 70, 255, 0.35)" },
  x: { label: "#E7E9EA", username: "#E7E9EA", glow: "rgba(231, 233, 234, 0.15)" },
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  kick: "Kick",
  twitch: "Twitch",
  x: "X",
};

export type WsEvent =
  | { type: "message"; data: ChatMessage }
  | { type: "messages"; data: ChatMessage[] }
  | { type: "profile"; data: StreamerProfile | null }
  | { type: "status"; data: AppStatus }
  | { type: "buffer_cleared" };
