import { connectWs } from "/shared/ws-client.js";

const feed = document.getElementById("feed");
const header = document.getElementById("header");
const headerTitle = document.getElementById("header-title");
const headerTagline = document.getElementById("header-tagline");
const rendered = new Map();

if (!feed || !header || !headerTitle || !headerTagline) {
  throw new Error("Overlay DOM missing");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pillLabel(platform) {
  if (platform === "kick") return { icon: "K", label: "Kick", cls: "pill-kick" };
  if (platform === "twitch") return { icon: "◆", label: "Twitch", cls: "pill-twitch" };
  return { icon: "𝕏", label: "X", cls: "pill-x" };
}

function usernameStyle(msg) {
  if (msg.color && /^#?[0-9a-fA-F]{3,8}$/.test(msg.color)) {
    const c = msg.color.startsWith("#") ? msg.color : `#${msg.color}`;
    return ` style="color:${c}"`;
  }
  return "";
}

function badgesHtml(badges) {
  if (!badges?.length) return "";
  return badges
    .map((b) => `<span class="badge badge-${b.toLowerCase()}">${b}</span>`)
    .join("");
}

function applyProfile(profile) {
  if (!profile) {
    header.classList.add("hidden");
    document.documentElement.style.setProperty("--font-scale", "1");
    return;
  }

  const scale = profile.overlay?.fontScale || 1;
  document.documentElement.style.setProperty("--font-scale", String(scale));

  if (profile.overlay?.showHeader) {
    header.classList.remove("hidden");
    const title =
      profile.overlay.headerTitle?.trim() ||
      `${profile.displayName}'s chat`;
    headerTitle.textContent = title;
    if (profile.tagline) {
      headerTagline.textContent = profile.tagline;
      headerTagline.classList.remove("hidden");
    } else {
      headerTagline.classList.add("hidden");
    }
  } else {
    header.classList.add("hidden");
  }
}

function renderMessage(msg) {
  if (rendered.has(msg.id)) return;
  rendered.set(msg.id, true);

  const pill = pillLabel(msg.platform);
  const row = document.createElement("article");
  row.className = "message";
  if (msg.mentionsStreamer) row.classList.add("mention");
  if (msg.isFromStreamer) row.classList.add("from-streamer");
  row.dataset.id = msg.id;

  row.innerHTML = `
    <span class="pill ${pill.cls}">
      <span class="pill-icon">${pill.icon}</span>
      ${pill.label}
    </span>
    <div class="body">
      <span class="username username-${msg.platform}"${usernameStyle(msg)}>${escapeHtml(msg.username)}</span>
      ${badgesHtml(msg.badges)}
      <span class="text">${escapeHtml(msg.text)}</span>
    </div>
  `;

  feed.appendChild(row);
  while (feed.children.length > 150) {
    const first = feed.firstElementChild;
    if (first) {
      rendered.delete(first.dataset.id || "");
      first.remove();
    }
  }

  feed.scrollTop = feed.scrollHeight;
}

function renderAll(messages) {
  feed.innerHTML = "";
  rendered.clear();
  if (!messages.length) {
    feed.innerHTML = '<div class="empty">Waiting for chat…</div>';
    return;
  }
  for (const msg of messages) renderMessage(msg);
}

function handleEvent(payload) {
  if (payload.type === "profile") applyProfile(payload.data);
  if (payload.type === "messages") renderAll(payload.data || []);
  if (payload.type === "message") {
    if (feed.querySelector(".empty")) feed.innerHTML = "";
    renderMessage(payload.data);
  }
  if (payload.type === "buffer_cleared") renderAll([]);
}

fetch("/api/profile")
  .then((r) => r.json())
  .then((data) => applyProfile(data.profile))
  .catch(() => {});

connectWs({ onMessage: handleEvent });
