import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  messageMentionsStreamer,
  shouldFilterMessage,
  sanitizeText,
  usernameMatchesAlias,
} from "../src/highlights.js";
import type { StreamerProfile } from "../src/types.js";

const profile: StreamerProfile = {
  id: "test-id",
  displayName: "Nick",
  platforms: {
    twitch: { channel: "nicklive", enabled: true },
    kick: { slug: "nickkick", enabled: true },
    x: { enabled: true },
  },
  aliases: ["nick", "nicklive", "nickkick"],
  overlay: {
    showHeader: true,
    fontScale: 1,
    highlightMentions: true,
    highlightKeywords: ["!discord"],
  },
  filters: {
    blockedUsers: ["spambot"],
    blockedWords: ["badword"],
  },
};

describe("highlights", () => {
  it("detects @mention of streamer alias", () => {
    assert.equal(messageMentionsStreamer("@nick when stream?", profile), true);
  });

  it("detects highlight keyword", () => {
    assert.equal(messageMentionsStreamer("here is !discord link", profile), true);
  });

  it("does not flag unrelated messages", () => {
    assert.equal(messageMentionsStreamer("hello everyone", profile), false);
  });

  it("matches username to alias", () => {
    assert.equal(usernameMatchesAlias("NickLive", profile.aliases), true);
  });

  it("filters blocked users", () => {
    assert.equal(shouldFilterMessage("spambot", "hi", profile), true);
  });

  it("filters blocked words", () => {
    assert.equal(shouldFilterMessage("user", "this is badword", profile), true);
  });

  it("sanitizes and truncates text", () => {
    const long = "a".repeat(600);
    const result = sanitizeText(long, 100);
    assert.equal(result.length, 100);
    assert.ok(result.endsWith("…"));
  });
});
