/**
 * Smart Price & Technical Alerts Engine for Aifie AI Agent
 * Evaluates real-time price threshold triggers, technical breakouts, and oversold spikes.
 */

import { randomUUID } from "node:crypto";
import { generateTradingSignal } from "./technical-indicators.mjs";

const alertState = {
  rules: [
    { id: "rule-1", symbol: "AAPL", condition: "ABOVE", targetPrice: 200, type: "PRICE_TARGET", triggered: false },
    { id: "rule-2", symbol: "BTC", condition: "BELOW", targetPrice: 50000, type: "PRICE_TARGET", triggered: false },
    { id: "rule-3", symbol: "TSLA", condition: "RSI_OVERSOLD", targetPrice: 30, type: "TECHNICAL_RSI", triggered: false }
  ],
  activeTriggeredAlerts: []
};

export function getActiveAlerts() {
  return {
    rules: alertState.rules,
    triggeredHistory: alertState.activeTriggeredAlerts.slice(0, 20)
  };
}

export function createAlertRule({ symbol, condition = "ABOVE", targetPrice, type = "PRICE_TARGET" }) {
  if (!symbol || !targetPrice) throw new Error("symbol and targetPrice are required");
  const rule = {
    id: `rule-${randomUUID().slice(0, 8)}`,
    symbol: String(symbol).toUpperCase().trim(),
    condition: String(condition).toUpperCase(),
    targetPrice: Number(targetPrice),
    type: String(type).toUpperCase(),
    createdAt: new Date().toISOString(),
    triggered: false
  };
  alertState.rules.push(rule);
  return rule;
}

export function evaluateSmartAlerts(quotes = {}, priceBuffers = {}) {
  const newlyTriggered = [];

  for (const rule of alertState.rules) {
    if (rule.triggered) continue;

    const symbol = rule.symbol;
    const quote = quotes[symbol];
    const prices = priceBuffers[symbol] || [];

    let isTriggered = false;
    let rationale = "";

    if (rule.type === "PRICE_TARGET" && quote?.price) {
      if (rule.condition === "ABOVE" && quote.price >= rule.targetPrice) {
        isTriggered = true;
        rationale = `${symbol} price ₹${quote.price} crossed ABOVE target ₹${rule.targetPrice}`;
      } else if (rule.condition === "BELOW" && quote.price <= rule.targetPrice) {
        isTriggered = true;
        rationale = `${symbol} price ₹${quote.price} crossed BELOW target ₹${rule.targetPrice}`;
      }
    } else if (rule.type === "TECHNICAL_RSI" && prices.length >= 5) {
      const signal = generateTradingSignal(prices, "rsi_mean_reversion");
      const rsi = signal.indicators?.rsi;
      if (rsi !== null && rsi <= rule.targetPrice) {
        isTriggered = true;
        rationale = `${symbol} RSI (${rsi}) dropped to OVERSOLD target (${rule.targetPrice})`;
      }
    }

    if (isTriggered) {
      rule.triggered = true;
      const alertEvent = {
        id: randomUUID(),
        ruleId: rule.id,
        symbol: rule.symbol,
        condition: rule.condition,
        targetPrice: rule.targetPrice,
        triggeredAt: new Date().toISOString(),
        message: rationale
      };
      newlyTriggered.push(alertEvent);
      alertState.activeTriggeredAlerts.unshift(alertEvent);
    }
  }

  return newlyTriggered;
}
