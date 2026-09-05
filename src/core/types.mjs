// src/core/types.mjs
// Strict Architectural Contracts & TypeScript/JSDoc Type Definitions
// Enforces Hard Boundaries across Data, Feature, Alpha, Decision, Risk, Execution, Audit, and Observability.

/**
 * @typedef {Object} EvidenceItem
 * @property {string} source - Originating agent or feature (e.g. "rl-trademaster", "smc-ob", "afml-barrier")
 * @property {number} score - Normalized directional signal [-1.0 to 1.0]
 * @property {string} rationale - Mathematical or empirical justification
 * @property {number} metric - Quantitative metric (e.g. z-score, confidence, Hurst exponent)
 */

/**
 * @typedef {Object} TradeIntent
 * @property {string} id - Unique UUID of the trade intent
 * @property {string} correlationId - System-wide tracing correlation ID
 * @property {string} symbol - Normalized asset symbol (e.g. "BTCUSDT", "AAPL")
 * @property {"BUY" | "SELL"} side - Direction of trade
 * @property {string} strategy - Registered strategy identifier (e.g. "trend-v12")
 * @property {number} confidence - Calibrated probability [0.0 to 1.0]
 * @property {number} expectedReturn - Expected return in basis points or fractional percentage
 * @property {number} expectedLoss - Maximum expected loss in basis points or fractional percentage
 * @property {number} entry - Target entry price
 * @property {number} stopLoss - Mandatory hard stop loss price
 * @property {number} takeProfit - Mandatory target take profit price
 * @property {number} maxPosition - Maximum requested notional exposure in USD
 * @property {number} timeHorizon - Expected holding horizon in milliseconds
 * @property {EvidenceItem[]} evidence - List of verifiable evidentiary inputs
 * @property {string[]} invalidators - Conditions that immediately void the intent
 * @property {string[]} modelVersions - Contributing model version tags
 * @property {number} timestamp - DecisionTimestamp (milliseconds epoch)
 */

/**
 * @typedef {Object} AifieEvent
 * @property {string} eventId - Unique UUID for the event
 * @property {string} eventType - Standardized event type
 * @property {number} timestamp - ProcessTimestamp (milliseconds epoch)
 * @property {number} sequence - Strictly increasing monotonic sequence number
 * @property {string} source - Component emitting the event
 * @property {string} correlationId - Correlation ID spanning tick -> execution
 * @property {Record<string, any>} payload - Structured event data
 */

export const STANDARD_EVENT_TYPES = Object.freeze([
  "MARKET_TICK",
  "ORDERBOOK_UPDATE",
  "FEATURE_UPDATE",
  "SIGNAL_CREATED",
  "TRADE_INTENT_CREATED",
  "RISK_CHECK_STARTED",
  "RISK_APPROVED",
  "RISK_REJECTED",
  "ORDER_SUBMITTED",
  "ORDER_FILLED",
  "ORDER_CANCELLED",
  "POSITION_CHANGED",
  "RISK_BREACH",
  "SYSTEM_HALTED"
]);

/**
 * Validates a TradeIntent against architectural standards.
 * @param {any} intent
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTradeIntent(intent) {
  const errors = [];
  if (!intent || typeof intent !== "object") {
    return { valid: false, errors: ["TradeIntent must be a non-null object"] };
  }

  if (!intent.id || typeof intent.id !== "string") errors.push("Invalid or missing 'id'");
  if (!intent.correlationId || typeof intent.correlationId !== "string") errors.push("Invalid or missing 'correlationId'");
  if (!intent.symbol || typeof intent.symbol !== "string") errors.push("Invalid or missing 'symbol'");
  if (intent.side !== "BUY" && intent.side !== "SELL") errors.push("Side must be 'BUY' or 'SELL'");
  if (!intent.strategy || typeof intent.strategy !== "string") errors.push("Invalid or missing 'strategy'");

  if (typeof intent.confidence !== "number" || intent.confidence < 0 || intent.confidence > 1) {
    errors.push("Confidence must be a calibrated number between 0.0 and 1.0");
  }
  if (typeof intent.expectedReturn !== "number" || isNaN(intent.expectedReturn)) {
    errors.push("expectedReturn must be a valid number");
  }
  if (typeof intent.expectedLoss !== "number" || isNaN(intent.expectedLoss)) {
    errors.push("expectedLoss must be a valid number");
  }
  if (typeof intent.entry !== "number" || intent.entry <= 0) {
    errors.push("entry price must be greater than zero");
  }
  if (typeof intent.stopLoss !== "number" || intent.stopLoss <= 0) {
    errors.push("stopLoss must be greater than zero");
  }
  if (typeof intent.takeProfit !== "number" || intent.takeProfit <= 0) {
    errors.push("takeProfit must be greater than zero");
  }

  // Directional sanity check
  if (intent.side === "BUY") {
    if (intent.stopLoss >= intent.entry) errors.push("BUY stopLoss must be strictly lower than entry");
    if (intent.takeProfit <= intent.entry) errors.push("BUY takeProfit must be strictly higher than entry");
  } else if (intent.side === "SELL") {
    if (intent.stopLoss <= intent.entry) errors.push("SELL stopLoss must be strictly higher than entry");
    if (intent.takeProfit >= intent.entry) errors.push("SELL takeProfit must be strictly lower than entry");
  }

  if (typeof intent.maxPosition !== "number" || intent.maxPosition <= 0) {
    errors.push("maxPosition must be a positive number");
  }
  if (typeof intent.timeHorizon !== "number" || intent.timeHorizon <= 0) {
    errors.push("timeHorizon must be a positive duration in milliseconds");
  }
  if (!Array.isArray(intent.evidence) || intent.evidence.length === 0) {
    errors.push("evidence must be a non-empty array of verifiable evidence items");
  }
  if (!Array.isArray(intent.invalidators)) {
    errors.push("invalidators must be an array of invalidating condition strings");
  }
  if (!Array.isArray(intent.modelVersions) || intent.modelVersions.length === 0) {
    errors.push("modelVersions must be a non-empty array of contributing model identifiers");
  }
  if (typeof intent.timestamp !== "number" || intent.timestamp <= 0) {
    errors.push("timestamp must be a valid epoch millisecond timestamp");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a standardized AifieEvent.
 * @param {any} event
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAifieEvent(event) {
  const errors = [];
  if (!event || typeof event !== "object") {
    return { valid: false, errors: ["Event must be a non-null object"] };
  }
  if (!event.eventId || typeof event.eventId !== "string") errors.push("Missing eventId");
  if (!STANDARD_EVENT_TYPES.includes(event.eventType)) {
    errors.push(`Invalid eventType '${event.eventType}'. Must be one of: ${STANDARD_EVENT_TYPES.join(", ")}`);
  }
  if (typeof event.timestamp !== "number" || event.timestamp <= 0) errors.push("Invalid timestamp");
  if (typeof event.sequence !== "number" || event.sequence < 0) errors.push("Invalid sequence number");
  if (!event.source || typeof event.source !== "string") errors.push("Missing event source");
  if (!event.correlationId || typeof event.correlationId !== "string") errors.push("Missing correlationId");
  if (!event.payload || typeof event.payload !== "object") errors.push("Missing or non-object payload");

  return {
    valid: errors.length === 0,
    errors
  };
}
