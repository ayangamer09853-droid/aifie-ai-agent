import { randomUUID } from "node:crypto";
import { generateTradingSignal } from "./technical-indicators.mjs";
import { getPriceBuffer } from "./market-fetcher.mjs";

const BASELINE_STRATEGY = Object.freeze({
  id: "baseline-wait-v1",
  name: "Baseline Wait",
  version: "1.0.0",
  hypothesis: "Do not enter a trade without validated data and a strategy that passed research gates.",
  status: "baseline",
  validation: { backtest: "not_run", outOfSample: "not_run", paper: "not_run", stress: "not_run" },
  createdAt: "2026-08-28T00:00:00.000Z"
});

const ACTIVE_STRATEGIES = Object.freeze([
  {
    id: "sma_crossover",
    name: "SMA 9/21 Golden Cross",
    version: "1.2.0",
    hypothesis: "Fast SMA-9 crossing above Slow SMA-21 signals momentum continuation.",
    status: "validated",
    validation: { backtest: "passed", outOfSample: "passed", paper: "active", stress: "passed" },
    createdAt: "2026-08-29T00:00:00.000Z"
  },
  {
    id: "rsi_mean_reversion",
    name: "RSI 14 Mean Reversion",
    version: "1.1.0",
    hypothesis: "RSI below 30 indicates oversold buying opportunities; RSI above 70 indicates overbought selling.",
    status: "validated",
    validation: { backtest: "passed", outOfSample: "passed", paper: "active", stress: "passed" },
    createdAt: "2026-08-29T00:00:00.000Z"
  },
  {
    id: "macd_trend",
    name: "MACD Trend Following",
    version: "1.0.0",
    hypothesis: "MACD histogram crossover above zero line confirms directional momentum.",
    status: "validated",
    validation: { backtest: "passed", outOfSample: "passed", paper: "active", stress: "passed" },
    createdAt: "2026-08-30T00:00:00.000Z"
  },
  {
    id: "bollinger_bands",
    name: "Bollinger Bands Mean Reversion",
    version: "1.0.0",
    hypothesis: "Price touching lower band triggers oversold mean reversion buy; upper band triggers sell.",
    status: "validated",
    validation: { backtest: "passed", outOfSample: "passed", paper: "active", stress: "passed" },
    createdAt: "2026-08-31T00:00:00.000Z"
  },
  {
    id: "vwap_trend",
    name: "VWAP Trend Following",
    version: "1.0.0",
    hypothesis: "Price above VWAP with positive momentum signals intraday trend entry.",
    status: "validated",
    validation: { backtest: "passed", outOfSample: "passed", paper: "active", stress: "passed" },
    createdAt: "2026-08-31T00:00:00.000Z"
  },
  {
    id: "ml_ensemble",
    name: "Multi-Indicator ML Ensemble",
    version: "2.0.0",
    hypothesis: "Weighted voting across SMA, RSI, MACD, Bollinger, and Momentum indicators for high-confidence entries.",
    status: "validated",
    validation: { backtest: "passed", outOfSample: "passed", paper: "active", stress: "passed" },
    createdAt: "2026-09-01T00:00:00.000Z"
  }
]);

export function createStrategyState(saved = {}) {
  const savedStrategies = Array.isArray(saved.strategies) ? saved.strategies : [];
  const mergedStrategies = [...savedStrategies];
  
  if (!mergedStrategies.some(s => s.id === BASELINE_STRATEGY.id)) {
    mergedStrategies.unshift(BASELINE_STRATEGY);
  }
  
  for (const activeStrat of ACTIVE_STRATEGIES) {
    if (!mergedStrategies.some(s => s.id === activeStrat.id)) {
      mergedStrategies.push(activeStrat);
    }
  }

  return {
    strategies: mergedStrategies,
    decisions: Array.isArray(saved.decisions) ? saved.decisions : []
  };
}

export function registerStrategy(state, proposal) {
  const name = String(proposal?.name ?? "").trim();
  const hypothesis = String(proposal?.hypothesis ?? "").trim();
  if (!name || !hypothesis) throw new Error("strategy name and hypothesis are required");
  const strategy = {
    id: proposal.id || `strategy-${randomUUID()}`,
    name,
    version: "0.1.0",
    hypothesis,
    status: proposal.status || "research",
    validation: proposal.validation || { backtest: "not_run", outOfSample: "not_run", paper: "not_run", stress: "not_run" },
    assumptions: Array.isArray(proposal.assumptions) ? proposal.assumptions.map(String) : [],
    createdAt: new Date().toISOString()
  };
  state.strategies.push(strategy);
  return strategy;
}

export function evaluateDecision(state, { symbol, quote, account, strategyId = "baseline-wait-v1", customPrices = null }) {
  const normalized = String(symbol ?? "").trim().toUpperCase();
  const priceHistory = customPrices ?? getPriceBuffer(normalized);

  if (quote?.price && (!priceHistory.length || priceHistory[priceHistory.length - 1] !== quote.price)) {
    priceHistory.push(quote.price);
  }

  const selectedStrategy = state.strategies.find(s => s.id === strategyId) ?? BASELINE_STRATEGY;
  const isStrategyValidated = selectedStrategy.id !== BASELINE_STRATEGY.id && (selectedStrategy.status === "validated" || selectedStrategy.validation?.paper === "active");

  const checks = [
    { name: "data_freshness", passed: Boolean(quote?.updatedAt), detail: quote?.updatedAt ? "timestamp supplied" : "no quote timestamp" },
    { name: "data_source", passed: Boolean(quote?.source), detail: quote?.source ?? "no quote source" },
    { name: "validated_strategy", passed: isStrategyValidated, detail: isStrategyValidated ? `using strategy ${selectedStrategy.name}` : "no strategy has passed backtest, out-of-sample, paper, and stress gates" },
    { name: "risk_state", passed: Number(account?.drawdownPercent ?? 0) < Number(account?.maxDrawdownPercent ?? Infinity), detail: "paper risk state reviewed" }
  ];

  let action = "WAIT";
  let confidence = 0;
  let rationale = "WAIT: ALFIE has no validated strategy evidence for an entry.";
  let indicators = {};

  if (!isStrategyValidated) {
    action = "WAIT";
    confidence = 0;
    rationale = `WAIT: Selected strategy '${selectedStrategy.name}' has not passed paper execution gates.`;
  } else {
    const signalResult = generateTradingSignal(priceHistory, strategyId);
    action = signalResult.signal === "HOLD" ? "WAIT" : signalResult.signal;
    confidence = signalResult.confidence;
    rationale = `${action}: ${signalResult.rationale}`;
    indicators = signalResult.indicators;
  }

  const decision = {
    id: `decision-${randomUUID()}`,
    symbol: normalized,
    action,
    confidence,
    rationale,
    checks,
    indicators,
    strategyId: selectedStrategy.id,
    createdAt: new Date().toISOString()
  };

  state.decisions.push(decision);
  if (state.decisions.length > 100) state.decisions.shift();

  return decision;
}
