import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { StreamerProfile } from "./types.js";
import { createProfileId, getExampleProfilePath, getProfilePath } from "./config.js";

function normalizeSlug(value: string): string {
  return value.trim().replace(/^#/, "").replace(/^@/, "").toLowerCase();
}

export function seedAliases(profile: StreamerProfile): string[] {
  const candidates = [
    profile.displayName,
    profile.platforms.twitch.channel,
    profile.platforms.kick.slug,
  ]
    .map((v) => normalizeSlug(v))
    .filter(Boolean);
  const merged = new Set([...profile.aliases.map(normalizeSlug), ...candidates]);
  return [...merged];
}

export function validateProfile(input: unknown): { ok: true; profile: StreamerProfile } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Profile must be an object" };
  }

  const raw = input as Partial<StreamerProfile>;

  if (!raw.displayName?.trim()) {
    return { ok: false, error: "displayName is required" };
  }

  const twitchChannel = raw.platforms?.twitch?.channel?.trim();
  const kickSlug = raw.platforms?.kick?.slug?.trim();

  if (!twitchChannel) {
    return { ok: false, error: "platforms.twitch.channel is required" };
  }
  if (!kickSlug) {
    return { ok: false, error: "platforms.kick.slug is required" };
  }

  const profile: StreamerProfile = {
    id: raw.id?.trim() || createProfileId(),
    displayName: raw.displayName.trim(),
    tagline: raw.tagline?.trim() || undefined,
    platforms: {
      twitch: {
        channel: normalizeSlug(twitchChannel),
        enabled: raw.platforms?.twitch?.enabled !== false,
      },
      kick: {
        slug: normalizeSlug(kickSlug),
        enabled: raw.platforms?.kick?.enabled !== false,
      },
      x: {
        broadcastUrl: raw.platforms?.x?.broadcastUrl?.trim() || undefined,
        enabled: raw.platforms?.x?.enabled !== false,
      },
    },
    aliases: Array.isArray(raw.aliases) ? raw.aliases.map(normalizeSlug).filter(Boolean) : [],
    overlay: {
      showHeader: raw.overlay?.showHeader ?? true,
      headerTitle: raw.overlay?.headerTitle?.trim() || undefined,
      fontScale: typeof raw.overlay?.fontScale === "number" ? raw.overlay.fontScale : 1,
      highlightMentions: raw.overlay?.highlightMentions ?? true,
      hideOwnMessages: raw.overlay?.hideOwnMessages ?? false,
      highlightKeywords: Array.isArray(raw.overlay?.highlightKeywords)
        ? raw.overlay.highlightKeywords.map((k) => k.trim()).filter(Boolean)
        : [],
    },
    filters: {
      blockedUsers: Array.isArray(raw.filters?.blockedUsers)
        ? raw.filters.blockedUsers.map((u) => u.trim().toLowerCase()).filter(Boolean)
        : [],
      blockedWords: Array.isArray(raw.filters?.blockedWords)
        ? raw.filters.blockedWords.map((w) => w.trim().toLowerCase()).filter(Boolean)
        : [],
    },
  };

  profile.aliases = seedAliases(profile);
  return { ok: true, profile };
}

export function isProfileComplete(profile: StreamerProfile | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.displayName &&
      profile.platforms.twitch.channel &&
      profile.platforms.kick.slug,
  );
}

export function loadProfile(): StreamerProfile | null {
  const path = getProfilePath();
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8"));
    const result = validateProfile(parsed);
    return result.ok ? result.profile : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: StreamerProfile): void {
  writeFileSync(getProfilePath(), JSON.stringify(profile, null, 2));
}

export function loadExampleProfile(): StreamerProfile | null {
  const path = getExampleProfilePath();
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8"));
    const result = validateProfile(parsed);
    return result.ok ? result.profile : null;
  } catch {
    return null;
  }
}

export function getHeaderTitle(profile: StreamerProfile): string {
  if (profile.overlay.headerTitle?.trim()) {
    return profile.overlay.headerTitle.trim();
  }
  return `${profile.displayName}'s chat`;
}
