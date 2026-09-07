// @ts-check

/**
 * Standardized Aifie Error Hierarchy
 */

export class AifieBaseError extends Error {
  /**
   * @param {string} message
   * @param {Object} [metadata={}]
   */
  constructor(message, metadata = {}) {
    super(message);
    this.name = this.constructor.name;
    this.metadata = metadata;
    this.timestamp = Date.now();
  }
}

export class RetryableError extends AifieBaseError {
  constructor(message, metadata = {}) {
    super(message, metadata);
    this.isRetryable = true;
    this.suggestedAction = "EXPONENTIAL_BACKOFF_RETRY";
  }
}

export class FatalError extends AifieBaseError {
  constructor(message, metadata = {}) {
    super(message, metadata);
    this.isRetryable = false;
    this.suggestedAction = "HALT_AND_ALERT_OPERATOR";
  }
}

export class DataUnsafeError extends AifieBaseError {
  constructor(message, metadata = {}) {
    super(message, metadata);
    this.isRetryable = false;
    this.suggestedAction = "MARK_FEED_UNSAFE_AND_FALLBACK";
  }
}

export class RiskBreachError extends AifieBaseError {
  constructor(message, metadata = {}) {
    super(message, metadata);
    this.isRetryable = false;
    this.suggestedAction = "REJECT_ORDER_AND_ENFORCE_LIMITS";
  }
}

export class SecurityBreachError extends AifieBaseError {
  constructor(message, metadata = {}) {
    super(message, metadata);
    this.isRetryable = false;
    this.suggestedAction = "QUARANTINE_SOURCE_AND_REVOKE_CREDENTIALS";
  }
}

/**
 * Classify any error into standardized recovery taxonomy
 * @param {Error|any} err
 * @returns {Object}
 */
export function classifyError(err) {
  if (!err) {
    return { type: "UNKNOWN", isRetryable: false, action: "NONE" };
  }

  if (err instanceof RetryableError) {
    return { type: "RETRYABLE", isRetryable: true, action: err.suggestedAction, error: err.message };
  }

  if (err instanceof DataUnsafeError) {
    return { type: "DATA_UNSAFE", isRetryable: false, action: err.suggestedAction, error: err.message };
  }

  if (err instanceof RiskBreachError) {
    return { type: "RISK_BREACH", isRetryable: false, action: err.suggestedAction, error: err.message };
  }

  if (err instanceof SecurityBreachError) {
    return { type: "SECURITY_BREACH", isRetryable: false, action: err.suggestedAction, error: err.message };
  }

  if (err instanceof FatalError) {
    return { type: "FATAL", isRetryable: false, action: err.suggestedAction, error: err.message };
  }

  const message = String(err?.message || err).toLowerCase();

  // Transient network error heuristics
  if (message.includes("econnreset") || message.includes("etimedout") || message.includes("fetch failed") || message.includes("429") || message.includes("rate limit")) {
    return { type: "RETRYABLE", isRetryable: true, action: "EXPONENTIAL_BACKOFF_RETRY", error: err.message };
  }

  // Data anomaly heuristics
  if (message.includes("stale") || message.includes("sequence gap") || message.includes("price sanity")) {
    return { type: "DATA_UNSAFE", isRetryable: false, action: "MARK_FEED_UNSAFE_AND_FALLBACK", error: err.message };
  }

  return { type: "FATAL", isRetryable: false, action: "HALT_AND_ALERT_OPERATOR", error: err.message || String(err) };
}
