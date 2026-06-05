import type { StreamerProfile } from "./types.js";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function usernameMatchesAlias(username: string, aliases: string[]): boolean {
  const normalized = username.trim().toLowerCase();
  return aliases.some((alias) => normalized === alias.toLowerCase());
}

export function messageMentionsStreamer(
  text: string,
  profile: StreamerProfile,
): boolean {
  const lower = text.toLowerCase();
  const aliases = profile.aliases;

  for (const alias of aliases) {
    if (!alias) continue;
    const atPattern = new RegExp(`@${escapeRegex(alias)}\\b`, "i");
    if (atPattern.test(text)) return true;
    if (lower.includes(alias.toLowerCase()) && alias.length >= 3) {
      const wordPattern = new RegExp(`\\b${escapeRegex(alias)}\\b`, "i");
      if (wordPattern.test(text)) return true;
    }
  }

  const keywords = profile.overlay.highlightKeywords ?? [];
  for (const keyword of keywords) {
    if (!keyword) continue;
    if (lower.includes(keyword.toLowerCase())) return true;
  }

  return false;
}

export function shouldFilterMessage(
  username: string,
  text: string,
  profile: StreamerProfile,
): boolean {
  const filters = profile.filters;
  if (!filters) return false;

  const user = username.toLowerCase();
  if (filters.blockedUsers.some((blocked) => blocked === user)) {
    return true;
  }

  const lowerText = text.toLowerCase();
  return filters.blockedWords.some((word) => word && lowerText.includes(word));
}

export function sanitizeText(text: string, maxLength: number): string {
  const decoded = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim();

  if (decoded.length <= maxLength) return decoded;
  return `${decoded.slice(0, maxLength - 1)}…`;
}
