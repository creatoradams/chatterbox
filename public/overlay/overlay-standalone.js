/* OBS-compatible overlay — no ES modules, works in OBS Browser Source CEF */
(function () {
  "use strict";

  function connectWs(handlers) {
    var ws = null;
    var closed = false;
    var retryMs = 1000;

    function connect() {
      var protocol = location.protocol === "https:" ? "wss:" : "ws:";
      try {
        ws = new WebSocket(protocol + "//" + location.host + "/ws");
      } catch (e) {
        showError("WebSocket failed — is the server running?");
        setTimeout(connect, retryMs);
        return;
      }

      ws.onopen = function () {
        retryMs = 1000;
        hideError();
        handlers.onOpen && handlers.onOpen();
      };

      ws.onmessage = function (event) {
        try {
          handlers.onMessage && handlers.onMessage(JSON.parse(event.data));
        } catch (e) { /* ignore */ }
      };

      ws.onclose = function () {
        showError("Disconnected — retrying…");
        handlers.onClose && handlers.onClose();
        if (!closed) {
          setTimeout(connect, retryMs);
          retryMs = Math.min(retryMs * 1.5, 10000);
        }
      };

      ws.onerror = function () {
        if (ws) ws.close();
      };
    }

    connect();
    return {
      close: function () {
        closed = true;
        if (ws) ws.close();
      },
    };
  }

  function showError(msg) {
    var el = document.getElementById("obs-error");
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  function hideError() {
    var el = document.getElementById("obs-error");
    if (el) el.classList.add("hidden");
  }

  var feed = document.getElementById("feed");
  var header = document.getElementById("header");
  var headerTitle = document.getElementById("header-title");
  var headerTagline = document.getElementById("header-tagline");
  var rendered = {};

  if (!feed) return;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function pillLabel(platform) {
    if (platform === "kick") return { icon: "K", label: "Kick", cls: "pill-kick" };
    if (platform === "twitch") return { icon: "T", label: "Twitch", cls: "pill-twitch" };
    return { icon: "X", label: "X", cls: "pill-x" };
  }

  function usernameStyle(msg) {
    if (msg.color && /^#?[0-9a-fA-F]{3,8}$/.test(msg.color)) {
      var c = msg.color.indexOf("#") === 0 ? msg.color : "#" + msg.color;
      return ' style="color:' + c + '"';
    }
    return "";
  }

  function badgesHtml(badges) {
    if (!badges || !badges.length) return "";
    var html = "";
    for (var i = 0; i < badges.length; i++) {
      var b = badges[i];
      html += '<span class="badge badge-' + b.toLowerCase() + '">' + b + "</span>";
    }
    return html;
  }

  function applyProfile(profile) {
    if (!profile) {
      if (header) header.classList.add("hidden");
      document.documentElement.style.setProperty("--font-scale", "1");
      return;
    }
    var scale = (profile.overlay && profile.overlay.fontScale) || 1;
    document.documentElement.style.setProperty("--font-scale", String(scale));

    if (header && profile.overlay && profile.overlay.showHeader) {
      header.classList.remove("hidden");
      var title =
        (profile.overlay.headerTitle && profile.overlay.headerTitle.trim()) ||
        profile.displayName + "'s chat";
      if (headerTitle) headerTitle.textContent = title;
      if (headerTagline) {
        if (profile.tagline) {
          headerTagline.textContent = profile.tagline;
          headerTagline.classList.remove("hidden");
        } else {
          headerTagline.classList.add("hidden");
        }
      }
    } else if (header) {
      header.classList.add("hidden");
    }
  }

  function renderMessage(msg) {
    if (rendered[msg.id]) return;
    rendered[msg.id] = true;

    var pill = pillLabel(msg.platform);
    var row = document.createElement("article");
    row.className = "message";
    if (msg.mentionsStreamer) row.className += " mention";
    if (msg.isFromStreamer) row.className += " from-streamer";
    row.setAttribute("data-id", msg.id);

    row.innerHTML =
      '<span class="pill ' + pill.cls + '">' +
      '<span class="pill-icon">' + pill.icon + "</span>" +
      pill.label +
      "</span>" +
      '<div class="body">' +
      '<span class="username username-' + msg.platform + '"' + usernameStyle(msg) + ">" +
      escapeHtml(msg.username) +
      "</span>" +
      badgesHtml(msg.badges) +
      '<span class="text">' + escapeHtml(msg.text) + "</span>" +
      "</div>";

    feed.appendChild(row);
    while (feed.children.length > 150) {
      var first = feed.firstElementChild;
      if (first) {
        delete rendered[first.getAttribute("data-id") || ""];
        feed.removeChild(first);
      }
    }
    feed.scrollTop = feed.scrollHeight;
  }

  function renderAll(messages) {
    feed.innerHTML = "";
    rendered = {};
    if (!messages || !messages.length) {
      feed.innerHTML = '<div class="empty">Waiting for chat…</div>';
      return;
    }
    for (var i = 0; i < messages.length; i++) renderMessage(messages[i]);
  }

  function handleEvent(payload) {
    if (payload.type === "profile") applyProfile(payload.data);
    if (payload.type === "messages") renderAll(payload.data || []);
    if (payload.type === "message") {
      var empty = feed.querySelector(".empty");
      if (empty) feed.innerHTML = "";
      renderMessage(payload.data);
    }
    if (payload.type === "buffer_cleared") renderAll([]);
  }

  var xhr = new XMLHttpRequest();
  xhr.open("GET", "/api/profile");
  xhr.onload = function () {
    try {
      applyProfile(JSON.parse(xhr.responseText).profile);
    } catch (e) { /* ignore */ }
  };
  xhr.send();

  connectWs({ onMessage: handleEvent });
})();
