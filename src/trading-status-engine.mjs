/**
 * AI Trading Multi-Status Lifecycle Engine for Aifie AI Agent
 * Manages operational status states: OFFLINE, PRE_MARKET_SCANNING, PAPER_SIMULATION,
 * REAL_MONEY_LIVE, RISK_GATED, MACRO_NEWS_SHIELD, SELF_OPTIMIZING, PORTFOLIO_BALANCING.
 */

import { randomUUID } from "node:crypto";

export const TRADING_STATUSES = Object.freeze({
  OFFLINE: { key: "OFFLINE", label: "Offline / Halted", color: "var(--muted)", description: "Agent or bot is currently stopped or paused by kill switch." },
  PRE_MARKET_SCANNING: { key: "PRE_MARKET_SCANNING", label: "Pre-Market Scanning", color: "var(--indigo)", description: "Scans overnight gaps, pre-market volume, and session bias." },
  PAPER_SIMULATION: { key: "PAPER_SIMULATION", label: "Paper Execution", color: "var(--teal)", description: "Running risk-free paper trades with simulated fills & slippage." },
  REAL_MONEY_LIVE: { key: "REAL_MONEY_LIVE", label: "Real Money Live", color: "var(--red)", description: "Authenticated REST API live order routing to real brokerage account." },
  RISK_GATED: { key: "RISK_GATED", label: "Risk Gated", color: "var(--gold)", description: "Capital preservation active with auto stop-loss & take-profit gates." },
  MACRO_NEWS_SHIELD: { key: "MACRO_NEWS_SHIELD", label: "Macro News Shield", color: "var(--red)", description: "Trading paused due to high-impact economic news release." },
  SELF_OPTIMIZING: { key: "SELF_OPTIMIZING", label: "Self Optimizing", color: "var(--green)", description: "Auto-tuning parameters and evaluating strategy tournament rankings." },
  PORTFOLIO_BALANCING: { key: "PORTFOLIO_BALANCING", label: "Portfolio Balancing", color: "var(--teal)", description: "Rebalancing multi-asset position allocations and capital weights." }
});

const statusState = {
  currentStatus: "PAPER_SIMULATION",
  rationale: "Default safe operation mode: Risk-free paper execution.",
  updatedAt: new Date().toISOString(),
  history: [
    { id: randomUUID(), status: "PAPER_SIMULATION", rationale: "System initialized in Paper Execution mode.", timestamp: new Date().toISOString() }
  ]
};

export function getCurrentTradingStatus() {
  const currentMeta = TRADING_STATUSES[statusState.currentStatus] || TRADING_STATUSES.PAPER_SIMULATION;
  return {
    statusKey: statusState.currentStatus,
    label: currentMeta.label,
    description: currentMeta.description,
    rationale: statusState.rationale,
    updatedAt: statusState.updatedAt,
    availableStatuses: Object.values(TRADING_STATUSES),
    recentHistory: statusState.history.slice(0, 15)
  };
}

export function setTradingStatus(statusKey, rationale = "Manual status update") {
  const normKey = String(statusKey).toUpperCase().trim();
  if (!TRADING_STATUSES[normKey]) {
    throw new Error(`Invalid status '${statusKey}'. Valid statuses: ${Object.keys(TRADING_STATUSES).join(", ")}`);
  }

  statusState.currentStatus = normKey;
  statusState.rationale = rationale;
  statusState.updatedAt = new Date().toISOString();

  const transitionLog = {
    id: randomUUID(),
    status: normKey,
    rationale,
    timestamp: statusState.updatedAt
  };

  statusState.history.unshift(transitionLog);
  if (statusState.history.length > 50) statusState.history.pop();

  return getCurrentTradingStatus();
}

export function evaluateAutomaticStatusTransition({ killSwitchActive = false, isNewsShieldActive = false, isLiveMode = false, isBotRunning = false }) {
  if (killSwitchActive) {
    return setTradingStatus("OFFLINE", "Kill switch is active. Halting trading operations.");
  }
  if (isNewsShieldActive) {
    return setTradingStatus("MACRO_NEWS_SHIELD", "High-impact macro event active. Volatility shield engaged.");
  }
  if (!isBotRunning) {
    return setTradingStatus("OFFLINE", "Trading bot is currently stopped.");
  }
  if (isLiveMode) {
    return setTradingStatus("REAL_MONEY_LIVE", "Authenticated real-money broker execution active.");
  }
  return setTradingStatus("PAPER_SIMULATION", "Automated paper trading active.");
}
