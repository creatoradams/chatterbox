/**
 * Shared WebSocket client with auto-reconnect for overlay and dashboard.
 */
export function connectWs(handlers) {
  let ws = null;
  let closed = false;
  let retryMs = 1000;

  function connect() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    ws = new WebSocket(`${protocol}//${location.host}/ws`);

    ws.onopen = () => {
      retryMs = 1000;
      handlers.onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        handlers.onMessage?.(JSON.parse(event.data));
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      handlers.onClose?.();
      if (closed) return;
      setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 1.5, 10000);
    };

    ws.onerror = () => ws?.close();
  }

  connect();

  return {
    close() {
      closed = true;
      ws?.close();
    },
  };
}
