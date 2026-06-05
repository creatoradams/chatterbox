import { WebSocketServer, WebSocket } from "ws";
import type { MessageHub } from "../hub.js";
import type { WsEvent } from "../types.js";

export class WsBroadcaster {
  private wss: WebSocketServer | null = null;
  private unsubscribe: (() => void) | null = null;

  attach(server: import("node:http").Server, hub: MessageHub): void {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.unsubscribe = hub.subscribe((event) => this.broadcast(event));

    this.wss.on("connection", (socket) => {
      this.send(socket, { type: "profile", data: hub.getProfile() });
      this.send(socket, { type: "messages", data: hub.getMessages() });
      socket.on("error", () => socket.terminate());
    });
  }

  broadcast(event: WsEvent): void {
    if (!this.wss) return;
    const payload = JSON.stringify(event);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  close(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.wss?.close();
    this.wss = null;
  }

  private send(socket: WebSocket, event: WsEvent): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(event));
    }
  }
}
