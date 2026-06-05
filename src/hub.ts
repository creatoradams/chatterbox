import type { ChatMessage, StreamerProfile, WsEvent } from "./types.js";
import { config } from "./config.js";
import {
  messageMentionsStreamer,
  sanitizeText,
  shouldFilterMessage,
  usernameMatchesAlias,
} from "./highlights.js";

type HubListener = (event: WsEvent) => void;

export class MessageHub {
  private messages: ChatMessage[] = [];
  private seenIds = new Set<string>();
  private profile: StreamerProfile | null = null;
  private listeners = new Set<HubListener>();
  private startTime = Date.now();

  setProfile(profile: StreamerProfile | null): void {
    this.profile = profile;
    this.emit({ type: "profile", data: profile });
  }

  getProfile(): StreamerProfile | null {
    return this.profile;
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  subscribe(listener: HubListener): () => void {
    this.listeners.add(listener);
    listener({ type: "profile", data: this.profile });
    listener({ type: "messages", data: this.getMessages() });
    return () => this.listeners.delete(listener);
  }

  ingest(raw: Omit<ChatMessage, "mentionsStreamer" | "isFromStreamer">): ChatMessage | null {
    if (this.seenIds.has(raw.id)) return null;

    const profile = this.profile;
    if (profile && shouldFilterMessage(raw.username, raw.text, profile)) {
      return null;
    }

    const text = sanitizeText(raw.text, config.maxMessageLength);
    const message: ChatMessage = {
      ...raw,
      text,
      mentionsStreamer:
        profile && profile.overlay.highlightMentions
          ? messageMentionsStreamer(text, profile)
          : false,
      isFromStreamer: profile ? usernameMatchesAlias(raw.username, profile.aliases) : false,
    };

    if (profile?.overlay.hideOwnMessages && message.isFromStreamer) {
      return null;
    }

    this.seenIds.add(message.id);
    this.messages.push(message);

    if (this.messages.length > config.bufferSize) {
      const removed = this.messages.splice(0, this.messages.length - config.bufferSize);
      for (const msg of removed) this.seenIds.delete(msg.id);
    }

    this.emit({ type: "message", data: message });
    return message;
  }

  clear(): void {
    this.messages = [];
    this.seenIds.clear();
    this.emit({ type: "buffer_cleared" });
    this.emit({ type: "messages", data: [] });
  }

  emitStatus(status: WsEvent): void {
    this.emit(status);
  }

  private emit(event: WsEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
