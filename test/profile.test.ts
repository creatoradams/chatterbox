import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateProfile, seedAliases, isProfileComplete } from "../src/profile.js";

describe("profile", () => {
  it("validates a complete profile", () => {
    const result = validateProfile({
      displayName: "Nick",
      platforms: {
        twitch: { channel: "nicklive" },
        kick: { slug: "nickkick" },
        x: { broadcastUrl: "https://x.com/i/broadcasts/abc" },
      },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.profile.displayName, "Nick");
      assert.equal(result.profile.platforms.twitch.channel, "nicklive");
      assert.ok(result.profile.aliases.includes("nick"));
    }
  });

  it("rejects missing twitch channel", () => {
    const result = validateProfile({
      displayName: "Nick",
      platforms: { kick: { slug: "nickkick" } },
    });
    assert.equal(result.ok, false);
  });

  it("seeds aliases from display name and channels", () => {
    const result = validateProfile({
      displayName: "Streamer",
      platforms: {
        twitch: { channel: "streamer_tv" },
        kick: { slug: "streamer_kick" },
      },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      const aliases = seedAliases(result.profile);
      assert.ok(aliases.includes("streamer"));
      assert.ok(aliases.includes("streamer_tv"));
    }
  });

  it("checks profile completeness", () => {
    const result = validateProfile({
      displayName: "Nick",
      platforms: { twitch: { channel: "x" }, kick: { slug: "y" } },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(isProfileComplete(result.profile), true);
    }
    assert.equal(isProfileComplete(null), false);
  });
});
