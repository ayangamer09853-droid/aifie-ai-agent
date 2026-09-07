// src/integrations/open-observability-suite.mjs
// Pillar 10: OpenTelemetry Tracing, Prometheus Metrics Exporter & Healthz Probes
// Zero-dependency Node.js ESM built-ins only

import crypto from "node:crypto";

export class OpenObservabilitySuite {
  constructor({ serviceName = "aifie-core-engine", environment = "production" } = {}) {
    this.serviceName = serviceName;
    this.environment = environment;
    this.activeSpans = new Map();
    this.completedSpans = [];
    this.metrics = {
      httpRequestsTotal: new Map(), // method_status -> count
      httpRequestDurationMs: [], // histogram array
      activeWebsocketConnections: 0,
      tradesExecutedTotal: 0,
      riskBreachesTotal: 0,
      llmTokensConsumedTotal: 0
    };
    this.structuredLogs = [];
    this.maxHistory = 300;
  }

  /**
   * Start an OpenTelemetry-compatible span.
   */
  startSpan(name, { parentSpanId = null, traceId = null, attributes = {} } = {}) {
    const spanId = crypto.randomBytes(8).toString("hex");
    const activeTraceId = traceId || crypto.randomBytes(16).toString("hex");
    const startTime = Date.now();

    const span = {
      spanId,
      traceId: activeTraceId,
      parentSpanId,
      name,
      startTime,
      attributes: {
        "service.name": this.serviceName,
        "deployment.environment": this.environment,
        ...attributes
      },
      status: "UNSET"
    };

    this.activeSpans.set(spanId, span);
    return {
      spanId,
      traceId: activeTraceId,
      end: (status = "OK", extraAttributes = {}) => this.endSpan(spanId, status, extraAttributes)
    };
  }

  /**
   * End and record a span.
   */
  endSpan(spanId, status = "OK", extraAttributes = {}) {
    const span = this.activeSpans.get(spanId);
    if (!span) return null;

    this.activeSpans.delete(spanId);
    const endTime = Date.now();
    const durationMs = endTime - span.startTime;

    const completed = {
      ...span,
      endTime,
      durationMs,
      status,
      attributes: { ...span.attributes, ...extraAttributes }
    };

    this.completedSpans.unshift(completed);
    if (this.completedSpans.length > this.maxHistory) this.completedSpans.pop();

    return completed;
  }

  /**
   * Record HTTP request metric.
   */
  recordHttpRequest(method, path, statusCode, durationMs) {
    const key = `${method.toUpperCase()}_${statusCode}`;
    this.metrics.httpRequestsTotal.set(key, (this.metrics.httpRequestsTotal.get(key) || 0) + 1);
    this.metrics.httpRequestDurationMs.push(durationMs);
    if (this.metrics.httpRequestDurationMs.length > 500) {
      this.metrics.httpRequestDurationMs.shift();
    }
  }

  /**
   * Generate standard Prometheus text format output for `/metrics`.
   */
  toPrometheusMetrics() {
    const lines = [];
    lines.push("# HELP aifie_http_requests_total Total number of HTTP requests processed.");
    lines.push("# TYPE aifie_http_requests_total counter");
    for (const [key, val] of this.metrics.httpRequestsTotal.entries()) {
      const [method, status] = key.split("_");
      lines.push(`aifie_http_requests_total{method="${method}",status="${status}"} ${val}`);
    }

    lines.push("\n# HELP aifie_active_websocket_connections Current count of active WebSocket subscribers.");
    lines.push("# TYPE aifie_active_websocket_connections gauge");
    lines.push(`aifie_active_websocket_connections ${this.metrics.activeWebsocketConnections}`);

    lines.push("\n# HELP aifie_trades_executed_total Total number of executed trades.");
    lines.push("# TYPE aifie_trades_executed_total counter");
    lines.push(`aifie_trades_executed_total ${this.metrics.tradesExecutedTotal}`);

    const latencies = this.metrics.httpRequestDurationMs;
    const sorted = [...latencies].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p90 = sorted[Math.floor(sorted.length * 0.9)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

    lines.push("\n# HELP aifie_http_request_duration_ms HTTP request latency percentiles in milliseconds.");
    lines.push("# TYPE aifie_http_request_duration_ms summary");
    lines.push(`aifie_http_request_duration_ms{quantile="0.5"} ${p50.toFixed(2)}`);
    lines.push(`aifie_http_request_duration_ms{quantile="0.9"} ${p90.toFixed(2)}`);
    lines.push(`aifie_http_request_duration_ms{quantile="0.99"} ${p99.toFixed(2)}`);

    return lines.join("\n") + "\n";
  }

  /**
   * Structured JSON Logger.
   */
  log(level, message, context = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      service: this.serviceName,
      traceId: context.traceId || null,
      spanId: context.spanId || null,
      context
    };

    this.structuredLogs.unshift(entry);
    if (this.structuredLogs.length > this.maxHistory) this.structuredLogs.pop();
    return entry;
  }

  /**
   * Healthcheck probes.
   */
  getLivenessProbe() {
    return { status: "ALIVE", timestamp: new Date().toISOString(), uptimeSeconds: process.uptime() };
  }

  getReadinessProbe() {
    return {
      status: "READY",
      timestamp: new Date().toISOString(),
      memoryRssMb: (process.memoryUsage().rss / (1024 * 1024)).toFixed(2),
      activeSpansCount: this.activeSpans.size
    };
  }

  /**
   * Telemetry status report.
   */
  getStatus() {
    return {
      serviceName: this.serviceName,
      environment: this.environment,
      completedSpansCount: this.completedSpans.length,
      activeSpansCount: this.activeSpans.size,
      totalLogsRecorded: this.structuredLogs.length,
      recentSpans: this.completedSpans.slice(0, 5),
      recentLogs: this.structuredLogs.slice(0, 5)
    };
  }
}

export const openObservabilitySuite = new OpenObservabilitySuite();
