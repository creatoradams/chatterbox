import { connectWs } from "/shared/ws-client.js";

const wizard = document.getElementById("wizard");
const editor = document.getElementById("editor");
const profileForm = document.getElementById("profile-form");
const statusGrid = document.getElementById("status-grid");
const overlayLink = document.getElementById("overlay-link");
const profileSummary = document.getElementById("profile-summary");
const summaryName = document.getElementById("summary-name");
const previewFeed = document.getElementById("preview-feed");

let wizardStep = 1;
let currentProfile = null;
const previewIds = new Set();

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function profileToForm(profile) {
  if (!profileForm || !profile) return;
  profileForm.displayName.value = profile.displayName || "";
  profileForm.tagline.value = profile.tagline || "";
  profileForm.twitchChannel.value = profile.platforms?.twitch?.channel || "";
  profileForm.kickSlug.value = profile.platforms?.kick?.slug || "";
  profileForm.broadcastUrl.value = profile.platforms?.x?.broadcastUrl || "";
  profileForm.headerTitle.value = profile.overlay?.headerTitle || "";
  profileForm.fontScale.value = profile.overlay?.fontScale ?? 1;
  profileForm.showHeader.checked = profile.overlay?.showHeader ?? true;
  profileForm.highlightMentions.checked = profile.overlay?.highlightMentions ?? true;
  profileForm.hideOwnMessages.checked = profile.overlay?.hideOwnMessages ?? false;
  profileForm.twitchEnabled.checked = profile.platforms?.twitch?.enabled !== false;
  profileForm.kickEnabled.checked = profile.platforms?.kick?.enabled !== false;
  profileForm.xEnabled.checked = profile.platforms?.x?.enabled !== false;
  profileForm.aliases.value = (profile.aliases || []).join(", ");
  profileForm.highlightKeywords.value = (profile.overlay?.highlightKeywords || []).join(", ");
  profileForm.blockedUsers.value = (profile.filters?.blockedUsers || []).join(", ");
  profileForm.blockedWords.value = (profile.filters?.blockedWords || []).join(", ");
}

function formToProfile(existing) {
  return {
    id: existing?.id,
    displayName: profileForm.displayName.value.trim(),
    tagline: profileForm.tagline.value.trim() || undefined,
    platforms: {
      twitch: {
        channel: profileForm.twitchChannel.value.trim(),
        enabled: profileForm.twitchEnabled.checked,
      },
      kick: {
        slug: profileForm.kickSlug.value.trim(),
        enabled: profileForm.kickEnabled.checked,
      },
      x: {
        broadcastUrl: profileForm.broadcastUrl.value.trim() || undefined,
        enabled: profileForm.xEnabled.checked,
      },
    },
    aliases: splitList(profileForm.aliases.value),
    overlay: {
      showHeader: profileForm.showHeader.checked,
      headerTitle: profileForm.headerTitle.value.trim() || undefined,
      fontScale: Number(profileForm.fontScale.value) || 1,
      highlightMentions: profileForm.highlightMentions.checked,
      hideOwnMessages: profileForm.hideOwnMessages.checked,
      highlightKeywords: splitList(profileForm.highlightKeywords.value),
    },
    filters: {
      blockedUsers: splitList(profileForm.blockedUsers.value),
      blockedWords: splitList(profileForm.blockedWords.value),
    },
  };
}

function wizardToProfile() {
  return {
    displayName: document.getElementById("wiz-name")?.value.trim(),
    platforms: {
      twitch: { channel: document.getElementById("wiz-twitch")?.value.trim(), enabled: true },
      kick: { slug: document.getElementById("wiz-kick")?.value.trim(), enabled: true },
      x: { broadcastUrl: document.getElementById("wiz-x")?.value.trim() || undefined, enabled: true },
    },
    overlay: { showHeader: true, fontScale: 1, highlightMentions: true, hideOwnMessages: false },
    aliases: [],
    filters: { blockedUsers: [], blockedWords: [] },
  };
}

function validateWizardStep(step) {
  if (step === 1 && !document.getElementById("wiz-name")?.value.trim()) {
    toast("Enter your display name.");
    return false;
  }
  if (step === 2 && !document.getElementById("wiz-twitch")?.value.trim()) {
    toast("Enter your Twitch channel.");
    return false;
  }
  if (step === 3 && !document.getElementById("wiz-kick")?.value.trim()) {
    toast("Enter your Kick slug.");
    return false;
  }
  return true;
}

async function saveProfile(body) {
  const res = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Save failed");
  currentProfile = data.profile;
  updateSummary(currentProfile);
  showEditor();
  profileToForm(currentProfile);
  renderStatus(data.status);
  toast("Profile saved — connectors restarted.");
}

function updateSummary(profile) {
  if (!profileSummary || !summaryName) return;
  if (profile) {
    profileSummary.classList.remove("hidden");
    summaryName.textContent = profile.displayName;
  } else {
    profileSummary.classList.add("hidden");
    summaryName.textContent = "—";
  }
}

function showWizard() {
  wizard?.classList.remove("hidden");
  editor?.classList.add("hidden");
  profileSummary?.classList.add("hidden");
}

function showEditor() {
  wizard?.classList.add("hidden");
  editor?.classList.remove("hidden");
  if (currentProfile) profileSummary?.classList.remove("hidden");
}

function setWizardStep(step) {
  wizardStep = step;
  document.querySelectorAll(".step").forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.step) === step);
  });
  document.getElementById("wiz-back")?.classList.toggle("hidden", step === 1);
  document.getElementById("wiz-next")?.classList.toggle("hidden", step === 4);
  document.getElementById("wiz-save")?.classList.toggle("hidden", step !== 4);
}

function renderStatus(status) {
  if (!statusGrid || !status) return;
  statusGrid.innerHTML = "";

  for (const p of status.platforms || []) {
    const item = document.createElement("div");
    item.className = "status-item";
    const target = p.target
      ? `Listening to your ${p.platform}: ${p.target}`
      : "Not configured";
    item.innerHTML = `
      <div class="status-dot ${p.state}"></div>
      <div class="status-name">${p.platform}</div>
      <div class="status-target">${target}</div>
      <div class="status-meta">${p.messagesPerMinute} msg/min · ${p.messageCount} total</div>
      ${p.lastError ? `<div class="status-error">${escapeHtml(p.lastError)}</div>` : ""}
    `;
    statusGrid.appendChild(item);
  }
}

function renderPreviewMessage(msg) {
  if (!previewFeed || previewIds.has(msg.id)) return;
  previewIds.add(msg.id);
  if (previewFeed.classList.contains("empty-preview")) {
    previewFeed.classList.remove("empty-preview");
    previewFeed.textContent = "";
  }
  const row = document.createElement("div");
  row.className = `preview-row preview-${msg.platform}${msg.mentionsStreamer ? " mention" : ""}`;
  row.innerHTML = `<span class="preview-platform">${msg.platform}</span> <strong>${escapeHtml(msg.username)}</strong> ${escapeHtml(msg.text)}`;
  previewFeed.appendChild(row);
  while (previewFeed.children.length > 12) {
    previewFeed.removeChild(previewFeed.firstElementChild);
  }
  previewFeed.scrollTop = previewFeed.scrollHeight;
}

function renderPreviewAll(messages) {
  if (!previewFeed) return;
  previewIds.clear();
  previewFeed.innerHTML = "";
  if (!messages?.length) {
    previewFeed.classList.add("empty-preview");
    previewFeed.textContent = "No messages yet.";
    return;
  }
  previewFeed.classList.remove("empty-preview");
  for (const msg of messages.slice(-12)) renderPreviewMessage(msg);
}

function handleWsEvent(payload) {
  if (payload.type === "status") renderStatus(payload.data);
  if (payload.type === "messages") renderPreviewAll(payload.data);
  if (payload.type === "message") renderPreviewMessage(payload.data);
  if (payload.type === "buffer_cleared") renderPreviewAll([]);
}

async function refreshStatus() {
  const res = await fetch("/api/status");
  renderStatus(await res.json());
}

async function boot() {
  const overlayUrl = `${location.origin}/overlay/obs`;
  if (overlayLink) overlayLink.href = overlayUrl;
  const obsUrl = document.getElementById("obs-url");
  if (obsUrl) obsUrl.textContent = overlayUrl;

  const res = await fetch("/api/profile");
  const data = await res.json();
  if (data.profile) {
    currentProfile = data.profile;
    updateSummary(currentProfile);
    showEditor();
    profileToForm(currentProfile);
  } else {
    showWizard();
    setWizardStep(1);
  }

  const msgRes = await fetch("/api/messages?limit=12");
  const msgData = await msgRes.json();
  renderPreviewAll(msgData.messages);

  await refreshStatus();
  setInterval(refreshStatus, 5000);

  connectWs({ onMessage: handleWsEvent });
}

document.getElementById("wiz-next")?.addEventListener("click", () => {
  if (!validateWizardStep(wizardStep)) return;
  if (wizardStep < 4) setWizardStep(wizardStep + 1);
});

document.getElementById("wiz-back")?.addEventListener("click", () => {
  if (wizardStep > 1) setWizardStep(wizardStep - 1);
});

document.getElementById("wiz-save")?.addEventListener("click", async () => {
  if (!validateWizardStep(3)) return;
  try {
    await saveProfile(wizardToProfile());
  } catch (err) {
    toast(err.message);
  }
});

profileForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await saveProfile(formToProfile(currentProfile));
  } catch (err) {
    toast(err.message);
  }
});

document.getElementById("btn-clear")?.addEventListener("click", async () => {
  await fetch("/api/buffer/clear", { method: "POST" });
  toast("Chat buffer cleared.");
});

document.getElementById("btn-reconnect")?.addEventListener("click", async () => {
  const res = await fetch("/api/reconnect", { method: "POST" });
  renderStatus(await res.json());
  toast("Reconnecting all platforms…");
});

document.getElementById("btn-copy-overlay")?.addEventListener("click", async () => {
  const url = `${location.origin}/overlay/`;
  try {
    await navigator.clipboard.writeText(url);
    toast("OBS overlay URL copied.");
  } catch {
    toast(url);
  }
});

document.getElementById("btn-reset")?.addEventListener("click", async () => {
  if (!confirm("Reset your streamer profile? Connectors will stop until you set up again.")) return;
  await fetch("/api/profile", { method: "DELETE" });
  currentProfile = null;
  showWizard();
  setWizardStep(1);
  renderPreviewAll([]);
  await refreshStatus();
  toast("Profile reset.");
});

boot();
