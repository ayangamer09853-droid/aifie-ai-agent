// src/observability/structured-logger.mjs
// Enterprise Structured JSON Logger & Correlation Tracer
// Formats all system logs according to Point 21 of the Senior Engineer Blueprint.

export const LOG_LEVELS = Object.freeze({
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
  CRITICAL: 50
});

export class StructuredLogger {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.minLevel="INFO"]
   * @param {number} [options.maxBufferSize=1000]
   * @param {boolean} [options.silent=false]
   */
  constructor(options = {}) {
    this.minLevelName = options.minLevel || process.env.LOG_LEVEL || "INFO";
    this.minLevel = LOG_LEVELS[this.minLevelName] || LOG_LEVELS.INFO;
    this.maxBufferSize = options.maxBufferSize || 1000;
    this.silent = options.silent ?? false;
    this.recentLogs = [];
  }

  /**
   * Creates a structured log entry.
   * @param {"DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL"} level
   * @param {string} service - e.g. "risk-engine", "data-sentinel", "governor"
   * @param {string} event - e.g. "VPIN_BREACH", "TRADE_APPROVED", "TICK_INGESTED"
   * @param {Record<string, any>} [payload={}] - arbitrary details (symbol, value, correlationId, etc.)
   * @returns {Object} Structured log object
   */
  log(level, service, event, payload = {}) {
    const levelVal = LOG_LEVELS[level] || LOG_LEVELS.INFO;
    if (levelVal < this.minLevel) return null;

    const entry = {
      level,
      timestamp: new Date().toISOString(),
      service,
      event,
      correlationId: payload.correlationId || "corr_unassigned",
      ...payload
    };

    if (this.recentLogs.length >= this.maxBufferSize) {
      this.recentLogs.shift();
    }
    this.recentLogs.push(entry);

    if (!this.silent) {
      const jsonString = JSON.stringify(entry);
      if (level === "ERROR" || level === "CRITICAL") {
        console.error(jsonString);
      } else if (level === "WARN") {
        console.warn(jsonString);
      } else {
        console.log(jsonString);
      }
    }

    return Object.freeze(entry);
  }

  debug(service, event, payload) { return this.log("DEBUG", service, event, payload); }
  info(service, event, payload) { return this.log("INFO", service, event, payload); }
  warn(service, event, payload) { return this.log("WARN", service, event, payload); }
  error(service, event, payload) { return this.log("ERROR", service, event, payload); }
  critical(service, event, payload) { return this.log("CRITICAL", service, event, payload); }

  getRecentLogs(limit = 100, filter = {}) {
    let result = [...this.recentLogs];
    if (filter.service) result = result.filter(l => l.service === filter.service);
    if (filter.level) result = result.filter(l => l.level === filter.level);
    if (filter.correlationId) result = result.filter(l => l.correlationId === filter.correlationId);
    return result.slice(-limit);
  }

  clear() {
    this.recentLogs = [];
  }
}

export const logger = new StructuredLogger({ silent: process.env.NODE_ENV === "test" });
