/**
 * Native Real-Time Event Streaming Engine for Aifie AI Agent
 * Implements Server-Sent Events (SSE) with replay buffer, keep-alive heartbeats,
 * and multi-channel broadcast across Alpha, Arbitrage, Risk, and Execution domains.
 * Built using 100% native Node.js ESM built-ins (zero dependencies).
 */

class RealtimeEventStreamManager {
  constructor(options = {}) {
    this.maxReplayBuffer = options.maxReplayBuffer || 50;
    this.clients = new Set();
    this.replayBuffer = [];
    this.heartbeatIntervalMs = options.heartbeatIntervalMs || 15000;
    this.totalEventsBroadcast = 0;
    this.startTime = Date.now();

    this._startHeartbeat();
  }

  /**
   * Start periodic keep-alive comments to prevent connection drops across proxies/browsers
   */
  _startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this._broadcastComment("heartbeat", { timestamp: new Date().toISOString(), clientsCount: this.clients.size });
    }, this.heartbeatIntervalMs);
    this.heartbeatTimer.unref?.();
  }

  /**
   * Register a new HTTP response as an SSE client
   * @param {import("node:http").ServerResponse} res
   * @param {Object} [options]
   */
  registerClient(res, options = {}) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*"
    });

    const clientObj = {
      id: `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      res,
      connectedAt: new Date().toISOString()
    };

    this.clients.add(clientObj);

    // Send initial handshake
    this._sendToClient(clientObj, "connected", {
      clientId: clientObj.id,
      timestamp: new Date().toISOString(),
      serverUptimeSec: Math.floor((Date.now() - this.startTime) / 1000),
      replayEventsCount: this.replayBuffer.length
    });

    // Replay recent events to give the client immediate context
    if (options.replay !== false) {
      for (const event of this.replayBuffer) {
        this._sendToClient(clientObj, event.type, event.data, event.id);
      }
    }

    const cleanup = () => {
      this.clients.delete(clientObj);
    };

    res.on("close", cleanup);
    res.on("finish", cleanup);
    res.on("error", cleanup);

    return clientObj.id;
  }

  /**
   * Send a raw SSE formatted message to a specific client
   */
  _sendToClient(client, eventType, data, eventId = null) {
    try {
      if (client.res.writableEnded || client.res.destroyed) {
        this.clients.delete(client);
        return;
      }
      let message = "";
      if (eventId) message += `id: ${eventId}\n`;
      message += `event: ${eventType}\n`;
      message += `data: ${JSON.stringify(data)}\n\n`;
      client.res.write(message);
    } catch (_err) {
      this.clients.delete(client);
    }
  }

  /**
   * Send an SSE comment (used for keep-alives)
   */
  _broadcastComment(comment, data = null) {
    const payload = data ? `:${comment} ${JSON.stringify(data)}\n\n` : `:${comment}\n\n`;
    for (const client of this.clients) {
      try {
        if (client.res.writableEnded || client.res.destroyed) {
          this.clients.delete(client);
          continue;
        }
        client.res.write(payload);
      } catch (_err) {
        this.clients.delete(client);
      }
    }
  }

  /**
   * Broadcast an event to all connected SSE clients and store in replay buffer
   * @param {string} eventType - e.g. "alpha_pulse", "arbitrage_opportunity", "paper_fill", "risk_alert"
   * @param {Object} data - Payload object
   */
  broadcast(eventType, data = {}) {
    const eventId = `evt_${Date.now()}_${++this.totalEventsBroadcast}`;
    const eventRecord = {
      id: eventId,
      type: eventType,
      data: {
        ...data,
        _streamTimestamp: new Date().toISOString()
      },
      timestamp: Date.now()
    };

    // Store in ring replay buffer
    this.replayBuffer.push(eventRecord);
    if (this.replayBuffer.length > this.maxReplayBuffer) {
      this.replayBuffer.shift();
    }

    // Broadcast to active clients
    for (const client of this.clients) {
      this._sendToClient(client, eventType, eventRecord.data, eventId);
    }

    return eventRecord;
  }

  /**
   * Get telemetry and diagnostics of the event stream engine
   */
  getTelemetry() {
    return {
      activeClientsCount: this.clients.size,
      totalEventsBroadcast: this.totalEventsBroadcast,
      replayBufferLength: this.replayBuffer.length,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000)
    };
  }

  /**
   * Return recent events from the replay buffer
   */
  getRecentEvents(limit = 20) {
    return this.replayBuffer.slice(-Math.min(limit, this.replayBuffer.length));
  }
}

export const realtimeEventStream = new RealtimeEventStreamManager();
