// src/integrations/native-websocket-hub.mjs
// Pillar 4: Native RFC 6455 WebSocket Hub & Pub/Sub Real-time Multiplexer
// Zero-dependency Node.js ESM built-ins only (pure node:crypto, node:events, node:buffer)

import { EventEmitter } from "node:events";
import crypto from "node:crypto";

export class NativeWebSocketHub extends EventEmitter {
  constructor({ heartbeatIntervalMs = 30000 } = {}) {
    super();
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.clients = new Map(); // socket -> { clientId, subscribedTopics, remoteAddress, connectedAt }
    this.topics = new Map(); // topicName -> Set of sockets
    this.broadcastHistory = [];
    this.maxHistory = 200;
  }

  /**
   * Complete RFC 6455 WebSocket Handshake from HTTP Upgrade request.
   */
  handleUpgrade(req, socket, head) {
    const secWebSocketKey = req.headers["sec-websocket-key"];
    if (!secWebSocketKey) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return false;
    }

    const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    const acceptKey = crypto
      .createHash("sha1")
      .update(secWebSocketKey + GUID)
      .digest("base64");

    const responseHeaders = [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${acceptKey}`,
      "\r\n"
    ].join("\r\n");

    socket.write(responseHeaders);

    const clientId = "ws-client-" + crypto.randomUUID().slice(0, 8);
    const clientMeta = {
      clientId,
      subscribedTopics: new Set(["all", "market", "telemetry"]),
      remoteAddress: socket.remoteAddress || "127.0.0.1",
      connectedAt: new Date().toISOString()
    };

    this.clients.set(socket, clientMeta);
    for (const t of clientMeta.subscribedTopics) {
      this._addToTopic(t, socket);
    }

    // Setup frame parsing on incoming socket data
    let buffer = Buffer.alloc(0);
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      buffer = this._processFrames(socket, buffer);
    });

    socket.on("close", () => {
      this._removeClient(socket);
    });

    socket.on("error", (err) => {
      this._removeClient(socket);
    });

    // Send welcome frame
    this.sendJson(socket, {
      type: "CONNECTION_ESTABLISHED",
      clientId,
      serverTime: new Date().toISOString(),
      channels: ["market", "orders", "telemetry", "agent_thoughts"]
    });

    this.emit("client_connected", clientMeta);
    return true;
  }

  /**
   * Subscribe socket to a specific topic.
   */
  subscribe(socket, topic) {
    const client = this.clients.get(socket);
    if (client) {
      client.subscribedTopics.add(topic);
      this._addToTopic(topic, socket);
    }
  }

  /**
   * Unsubscribe socket from a specific topic.
   */
  unsubscribe(socket, topic) {
    const client = this.clients.get(socket);
    if (client) {
      client.subscribedTopics.delete(topic);
      const set = this.topics.get(topic);
      if (set) set.delete(socket);
    }
  }

  /**
   * Broadcast message to all subscribers of a topic.
   */
  broadcast(topic, payload = {}) {
    const sockets = this.topics.get(topic) || new Set();
    const frameData = typeof payload === "string" ? payload : JSON.stringify({
      topic,
      timestamp: new Date().toISOString(),
      data: payload
    });

    const frame = this._encodeFrame(frameData);
    let deliveryCount = 0;

    for (const socket of sockets) {
      if (socket.writable) {
        socket.write(frame);
        deliveryCount++;
      }
    }

    const record = {
      broadcastId: "bc-" + crypto.randomUUID().slice(0, 8),
      topic,
      recipients: deliveryCount,
      timestamp: new Date().toISOString()
    };
    this.broadcastHistory.unshift(record);
    if (this.broadcastHistory.length > this.maxHistory) {
      this.broadcastHistory.pop();
    }

    this.emit("broadcast", record);
    return record;
  }

  /**
   * Send JSON payload to a specific socket.
   */
  sendJson(socket, data) {
    if (!socket.writable) return false;
    const jsonStr = JSON.stringify(data);
    const frame = this._encodeFrame(jsonStr);
    socket.write(frame);
    return true;
  }

  _addToTopic(topic, socket) {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, new Set());
    }
    this.topics.get(topic).add(socket);
  }

  _removeClient(socket) {
    const client = this.clients.get(socket);
    if (client) {
      for (const t of client.subscribedTopics) {
        const set = this.topics.get(t);
        if (set) set.delete(socket);
      }
      this.clients.delete(socket);
      this.emit("client_disconnected", client);
    }
  }

  /**
   * Encode UTF-8 text into an unmasked RFC 6455 WebSocket frame (Server-to-Client).
   */
  _encodeFrame(text) {
    const payload = Buffer.from(text, "utf8");
    const length = payload.length;

    let header;
    if (length <= 125) {
      header = Buffer.alloc(2);
      header[0] = 0x81; // FIN + Text Opcode (0x1)
      header[1] = length; // Unmasked
    } else if (length <= 65535) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }

    return Buffer.concat([header, payload]);
  }

  /**
   * Parse incoming masked RFC 6455 frames from client.
   */
  _processFrames(socket, buffer) {
    while (buffer.length >= 2) {
      const firstByte = buffer[0];
      const secondByte = buffer[1];
      const opcode = firstByte & 0x0f;
      const isMasked = Boolean(secondByte & 0x80);
      let payloadLength = secondByte & 0x7f;
      let offset = 2;

      if (payloadLength === 126) {
        if (buffer.length < offset + 2) break;
        payloadLength = buffer.readUInt16BE(offset);
        offset += 2;
      } else if (payloadLength === 127) {
        if (buffer.length < offset + 8) break;
        payloadLength = Number(buffer.readBigUInt64BE(offset));
        offset += 8;
      }

      let maskingKey = null;
      if (isMasked) {
        if (buffer.length < offset + 4) break;
        maskingKey = buffer.subarray(offset, offset + 4);
        offset += 4;
      }

      if (buffer.length < offset + payloadLength) break;

      let payload = buffer.subarray(offset, offset + payloadLength);
      if (isMasked && maskingKey) {
        payload = Buffer.from(payload);
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= maskingKey[i % 4];
        }
      }

      // Handle Opcode
      if (opcode === 0x1) {
        // Text Frame
        const text = payload.toString("utf8");
        this._handleClientTextMessage(socket, text);
      } else if (opcode === 0x8) {
        // Close frame
        socket.end();
        this._removeClient(socket);
      } else if (opcode === 0x9) {
        // Ping frame -> reply with Pong
        const pong = Buffer.from([0x8a, 0x00]);
        socket.write(pong);
      }

      buffer = buffer.subarray(offset + payloadLength);
    }
    return buffer;
  }

  _handleClientTextMessage(socket, text) {
    try {
      const msg = JSON.parse(text);
      if (msg.action === "subscribe" && msg.topic) {
        this.subscribe(socket, msg.topic);
        this.sendJson(socket, { type: "SUBSCRIBED", topic: msg.topic });
      } else if (msg.action === "unsubscribe" && msg.topic) {
        this.unsubscribe(socket, msg.topic);
        this.sendJson(socket, { type: "UNSUBSCRIBED", topic: msg.topic });
      } else if (msg.action === "ping") {
        this.sendJson(socket, { type: "PONG", time: new Date().toISOString() });
      }
    } catch {
      // Non-JSON text message
      this.emit("client_message", { socket, text });
    }
  }

  /**
   * Telemetry status report.
   */
  getStatus() {
    return {
      connectedClientsCount: this.clients.size,
      activeTopics: Array.from(this.topics.entries()).map(([name, set]) => ({
        topic: name,
        subscribers: set.size
      })),
      totalBroadcasts: this.broadcastHistory.length,
      recentBroadcasts: this.broadcastHistory.slice(0, 10)
    };
  }
}

export const nativeWebSocketHub = new NativeWebSocketHub();
