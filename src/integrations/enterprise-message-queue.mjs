// src/integrations/enterprise-message-queue.mjs
// Pillar 7: Enterprise Priority Message Queue & Distributed Pub/Sub Broker
// Zero-dependency Node.js ESM built-ins only

import { EventEmitter } from "node:events";
import crypto from "node:crypto";

export class EnterpriseMessageQueue extends EventEmitter {
  constructor({ maxQueueDepth = 10000, maxRetries = 3 } = {}) {
    super();
    this.maxQueueDepth = maxQueueDepth;
    this.maxRetries = maxRetries;
    this.queues = new Map(); // queueName -> Array of message items sorted by priority
    this.consumerGroups = new Map(); // queueName:groupName -> { consumers, cursor }
    this.inFlightMessages = new Map(); // msgId -> { msg, deliveredAt, attempts }
    this.deadLetterQueue = [];
    this.processedHistory = [];
    this.maxHistory = 200;
  }

  /**
   * Enqueue a task or event into a named queue with priority.
   * Priority: P0 (Critical/0), P1 (High/1), P2 (Normal/2), P3 (Low/3)
   */
  enqueue(queueName, payload = {}, { priority = "P2", delayMs = 0, deduplicationId = null } = {}) {
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
    }

    const queue = this.queues.get(queueName);
    if (queue.length >= this.maxQueueDepth) {
      throw new Error(`Queue '${queueName}' capacity exceeded (depth: ${queue.length})`);
    }

    const priorityWeights = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const pWeight = priorityWeights[priority] ?? 2;
    const msgId = "msg-" + crypto.randomUUID().slice(0, 8);

    const message = {
      msgId,
      queueName,
      payload,
      priority,
      pWeight,
      enqueuedAt: new Date().toISOString(),
      availableAt: Date.now() + delayMs,
      attempts: 0,
      deduplicationId
    };

    // Insert sorted by priority (lowest pWeight first)
    let inserted = false;
    for (let i = 0; i < queue.length; i++) {
      if (message.pWeight < queue[i].pWeight) {
        queue.splice(i, 0, message);
        inserted = true;
        break;
      }
    }
    if (!inserted) queue.push(message);

    this.emit("enqueued", { queueName, msgId, priority });
    return message;
  }

  /**
   * Dequeue next available message from queue.
   */
  dequeue(queueName, consumerId = "worker-1") {
    const queue = this.queues.get(queueName);
    if (!queue || queue.length === 0) return null;

    const now = Date.now();
    const idx = queue.findIndex(m => m.availableAt <= now);
    if (idx === -1) return null;

    const [msg] = queue.splice(idx, 1);
    msg.attempts++;
    msg.consumerId = consumerId;

    this.inFlightMessages.set(msg.msgId, {
      msg,
      deliveredAt: now,
      consumerId
    });

    this.emit("dequeued", { queueName, msgId: msg.msgId, consumerId });
    return msg;
  }

  /**
   * Acknowledge successful message processing (ACK).
   */
  ack(msgId) {
    const item = this.inFlightMessages.get(msgId);
    if (!item) return false;

    this.inFlightMessages.delete(msgId);
    const durationMs = Date.now() - item.deliveredAt;
    const record = {
      msgId,
      queueName: item.msg.queueName,
      status: "ACK",
      durationMs,
      timestamp: new Date().toISOString()
    };

    this.processedHistory.unshift(record);
    if (this.processedHistory.length > this.maxHistory) this.processedHistory.pop();

    this.emit("ack", record);
    return true;
  }

  /**
   * Negative acknowledgment on failure (NACK) - retries or routes to DLQ.
   */
  nack(msgId, errorReason = "PROCESSING_FAILED") {
    const item = this.inFlightMessages.get(msgId);
    if (!item) return false;

    this.inFlightMessages.delete(msgId);
    const { msg } = item;

    if (msg.attempts >= this.maxRetries) {
      // Permanent failure -> Move to DLQ
      const dlqRecord = {
        ...msg,
        failedAt: new Date().toISOString(),
        errorReason
      };
      this.deadLetterQueue.unshift(dlqRecord);
      if (this.deadLetterQueue.length > this.maxHistory) this.deadLetterQueue.pop();
      this.emit("dlq", dlqRecord);
      return { status: "DLQ", msgId, attempts: msg.attempts };
    } else {
      // Re-enqueue with exponential backoff delay (200ms * 2^attempts)
      msg.availableAt = Date.now() + (200 * Math.pow(2, msg.attempts));
      if (!this.queues.has(msg.queueName)) this.queues.set(msg.queueName, []);
      this.queues.get(msg.queueName).push(msg);
      this.emit("requeued", { msgId, attempts: msg.attempts });
      return { status: "REQUEUED", msgId, attempts: msg.attempts };
    }
  }

  /**
   * Register a consumer worker loop for a queue.
   */
  registerWorker(queueName, workerHandler, { concurrency = 1, intervalMs = 100 } = {}) {
    const workerId = `worker-${queueName}-${crypto.randomUUID().slice(0, 4)}`;
    const timer = setInterval(async () => {
      const msg = this.dequeue(queueName, workerId);
      if (msg) {
        try {
          await workerHandler(msg.payload, msg);
          this.ack(msg.msgId);
        } catch (err) {
          this.nack(msg.msgId, err.message);
        }
      }
    }, intervalMs);

    return { workerId, queueName, stop: () => clearInterval(timer) };
  }

  /**
   * Telemetry status report.
   */
  getStatus() {
    const queuesStats = {};
    for (const [name, list] of this.queues.entries()) {
      queuesStats[name] = {
        pendingCount: list.length,
        p0Count: list.filter(m => m.priority === "P0").length,
        p1Count: list.filter(m => m.priority === "P1").length,
        p2Count: list.filter(m => m.priority === "P2").length,
        p3Count: list.filter(m => m.priority === "P3").length
      };
    }

    return {
      activeQueuesCount: this.queues.size,
      queues: queuesStats,
      inFlightCount: this.inFlightMessages.size,
      deadLetterQueueCount: this.deadLetterQueue.length,
      totalProcessed: this.processedHistory.length,
      recentProcessed: this.processedHistory.slice(0, 10)
    };
  }
}

export const enterpriseMessageQueue = new EnterpriseMessageQueue();
