/**
 * Zero-Dependency Native Streaming & Server Engine v88.0
 * Pure Node.js Built-in Standard Library (node:http, node:crypto, node:events)
 * Provides real-time event streaming via Server-Sent Events (SSE) without external packages.
 */

import { EventEmitter } from "node:events";

class ZeroDepStreamHub extends EventEmitter {
  constructor() {
    super();
    this.clients = new Set();
  }

  addClient(res) {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "connection": "keep-alive",
      "access-control-allow-origin": "*"
    });
    res.write("event: connected\ndata: {\"status\":\"CONNECTED_TO_ZERO_DEP_SSE_STREAM\"}\n\n");
    this.clients.add(res);

    res.on("close", () => {
      this.clients.delete(res);
    });
  }

  broadcast(eventName, data) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch (_) {
        this.clients.delete(client);
      }
    }
  }

  getClientCount() {
    return this.clients.size;
  }
}

export const zeroDepStreamHub = new ZeroDepStreamHub();

export function handleSseConnection(req, res) {
  zeroDepStreamHub.addClient(res);
}

export function broadcastZeroDepEvent(event, data) {
  zeroDepStreamHub.broadcast(event, data);
}
