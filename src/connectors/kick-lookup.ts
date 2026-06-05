import { config } from "../config.js";

const KICK_HEADERS_BASE = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Referer: "https://kick.com/",
  Origin: "https://kick.com",
  "Accept-Language": "en-US,en;q=0.9",
};

interface KickChannelResponse {
  chatroom?: { id?: number };
  id?: number;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = { ...KICK_HEADERS_BASE };
  const cookie = config.kickSessionCookie?.trim();
  if (cookie) headers.Cookie = cookie;
  return headers;
}

export async function resolveKickChatroomId(slug: string): Promise<number> {
  const urls = [
    `https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`,
    `https://kick.com/api/v2/channels/${encodeURIComponent(slug)}/chatroom`,
  ];

  const errors: string[] = [];
  const headers = buildHeaders();

  for (const url of urls) {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        errors.push(`${url} → ${response.status}`);
        continue;
      }
      const data = (await response.json()) as KickChannelResponse;
      const id = data.chatroom?.id ?? data.id;
      if (typeof id === "number") return id;
      errors.push(`${url} → no chatroom id`);
    } catch (err) {
      errors.push(`${url} → ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const cookieHint = config.kickSessionCookie
    ? ""
    : " Try setting KICK_SESSION_COOKIE in .env with your kick.com session cookie.";

  throw new Error(
    `Kick channel lookup failed for "${slug}". ${errors.join("; ")}.${cookieHint}`,
  );
}
