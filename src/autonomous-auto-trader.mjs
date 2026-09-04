/**
 * 24/7 Autonomous Automatic Trading System v100.0
 * Pure Node.js ESM - Zero External Dependencies
 * 
 * Features:
 * 1. Continuous Multi-Asset Market Scanner (Crypto, Equities, Tech Giants).
 * 2. Multi-Model Confluence & Alpha Scoring (EMA, RSI, VWAP, CVD Delta).
 * 3. Multi-Genome Ensemble Consensus Integration (>= 2/3 agreement gate).
 * 4. Dynamic Fractional Half-Kelly Position Sizing (Volatility-adjusted lot sizes).
 * 5. Automatic Paper Order Execution & Real PnL Ledger Recording.
 * 6. Automated Dynamic Stop-Loss (-3.0%) & Take-Profit (+6.5% - +7.5%) Risk Gate.
 * 7. Real-Time Telegram Alerts & Web Dashboard Telemetry.
 */

import { randomUUID } from "node:crypto";
import { fetchLiveQuote } from "./market-fetcher.mjs";
import { placePaperOrder, setQuote, accountSnapshot } from "./paper-engine.mjs";
import { calculateDynamicLotSize, evaluateMultiGenomeConsensus } from "./trading-bot.mjs";
import { getEvolutionStatus } from "./self-evolving-swarm.mjs";
import { recordLedgerTransaction } from "./real-pnl-accounting-ledger.mjs";
import { sendTradeAlert } from "./telegram-notifier.mjs";
import { alpacaBroker } from "./live-broker-alpaca.mjs";
import { aiInterconnectionBus } from "./ai-interconnection-neural-bus.mjs";

const autoTraderState = {
  isRunning: false,
  mode: "ACTIVE_AUTONOMOUS_SWARM",
  intervalMs: 10000,
  watchSymbols: ["BTC/USDT", "ETH/USDT", "AAPL", "TSLA", "NVDA"],
  minAlphaConfidence: 0.65,
  stopLossPercent: 3.0,
  takeProfitPercent: 7.0,
  maxTradeQuantity: 5,
  totalAutoTradesExecuted: 0,
  successfulProfitsCount: 0,
  stopLossCount: 0,
  lastScanTimestamp: null,
  recentAutoTrades: [],
  logs: [],
  timerHandle: null
};

function logAutoTraderEvent(msg) {
  const entry = { id: randomUUID(), message: msg, timestamp: new Date().toISOString() };
  autoTraderState.logs.unshift(entry);
  if (autoTraderState.logs.length > 50) autoTraderState.logs.pop();
  return entry;
}

export function getAutoTraderStatus() {
  const evolution = getEvolutionStatus();
  return {
    isRunning: autoTraderState.isRunning,
    mode: autoTraderState.mode,
    intervalMs: autoTraderState.intervalMs,
    watchSymbols: [...autoTraderState.watchSymbols],
    minAlphaConfidence: autoTraderState.minAlphaConfidence,
    stopLossPercent: autoTraderState.stopLossPercent,
    takeProfitPercent: autoTraderState.takeProfitPercent,
    maxTradeQuantity: autoTraderState.maxTradeQuantity,
    totalAutoTradesExecuted: autoTraderState.totalAutoTradesExecuted,
    successfulProfitsCount: autoTraderState.successfulProfitsCount,
    stopLossCount: autoTraderState.stopLossCount,
    lastScanTimestamp: autoTraderState.lastScanTimestamp,
    championStrategy: evolution.championGenome?.name || "CVD Delta Absorption Divergence",
    recentAutoTrades: autoTraderState.recentAutoTrades.slice(0, 10),
    recentLogs: autoTraderState.logs.slice(0, 10)
  };
}

/**
 * Scans markets and executes automated trades when setup conditions align
 */
export async function executeAutonomousTradeCycle({ paper = { account: { cash: 100000, positions: {} }, quotes: {} }, orders = [], persist = null, forceExecute = false } = {}) {
  autoTraderState.lastScanTimestamp = new Date().toISOString();
  const cycleTrades = [];

  // 1. Position Risk Gate: Auto-Close Positions hitting Take-Profit or Stop-Loss
  const openPositions = Object.entries(paper.account?.positions || {});
  for (const [sym, pos] of openPositions) {
    if (pos.quantity <= 0) continue;
    try {
      const currentQuote = paper.quotes?.[sym] || await fetchLiveQuote(sym);
      const curPrice = currentQuote.price;
      const avgPrice = pos.averagePrice;
      const pnlPct = avgPrice > 0 ? ((curPrice - avgPrice) / avgPrice) * 100 : 0;

      if (pnlPct >= autoTraderState.takeProfitPercent) {
        // Auto Take-Profit Execution
        const fill = placePaperOrder(paper, { symbol: sym, side: "sell", quantity: pos.quantity });
        const closeOrder = {
          id: randomUUID(),
          ...fill,
          mode: "paper",
          audit: {
            source: "auto_trader_take_profit",
            pnlPercent: Number(pnlPct.toFixed(2)),
            rationale: `Automatic Take-Profit Hit (+${pnlPct.toFixed(2)}% >= +${autoTraderState.takeProfitPercent}%)`
          }
        };
        orders.push(closeOrder);
        autoTraderState.successfulProfitsCount++;
        if (["AAPL", "TSLA", "NVDA"].includes(sym)) {
          alpacaBroker.placeOrder(sym, pos.quantity, "sell", "market").catch(() => {});
        }
        const pnlVal = Number((pos.quantity * (fill.fillPrice - avgPrice)).toFixed(2));
        recordLedgerTransaction({
          symbol: sym,
          side: "SELL",
          quantity: pos.quantity,
          fillPrice: fill.fillPrice,
          realizedPnLUSD: pnlVal
        });
        aiInterconnectionBus.emit("TRADE_EXECUTED", {
          symbol: sym,
          side: "SELL",
          quantity: pos.quantity,
          realizedPnLUSD: pnlVal,
          strategy: "TAKE_PROFIT_AUTO",
          marketCondition: "BULL_PROFIT_RUN"
        });
        const msg = `🎯 AUTO TAKE-PROFIT: Closed ${pos.quantity} ${sym} at $${fill.fillPrice} (PnL: +${pnlPct.toFixed(2)}%)`;
        logAutoTraderEvent(msg);
        cycleTrades.push(closeOrder);
        sendTradeAlert({
          symbol: sym,
          side: "sell",
          quantity: pos.quantity,
          price: fill.fillPrice,
          rationale: `Auto Take-Profit (+${pnlPct.toFixed(2)}%)`,
          isPaper: true
        }).catch(() => {});
      } else if (pnlPct <= -autoTraderState.stopLossPercent) {
        // Auto Stop-Loss Execution
        const fill = placePaperOrder(paper, { symbol: sym, side: "sell", quantity: pos.quantity });
        const closeOrder = {
          id: randomUUID(),
          ...fill,
          mode: "paper",
          audit: {
            source: "auto_trader_stop_loss",
            pnlPercent: Number(pnlPct.toFixed(2)),
            rationale: `Automatic Stop-Loss Hit (${pnlPct.toFixed(2)}% <= -${autoTraderState.stopLossPercent}%)`
          }
        };
        orders.push(closeOrder);
        autoTraderState.stopLossCount++;
        if (["AAPL", "TSLA", "NVDA"].includes(sym)) {
          alpacaBroker.placeOrder(sym, pos.quantity, "sell", "market").catch(() => {});
        }
        const slLossVal = Number((pos.quantity * (fill.fillPrice - avgPrice)).toFixed(2));
        recordLedgerTransaction({
          symbol: sym,
          side: "SELL",
          quantity: pos.quantity,
          fillPrice: fill.fillPrice,
          realizedPnLUSD: slLossVal
        });
        aiInterconnectionBus.emit("TRADE_EXECUTED", {
          symbol: sym,
          side: "SELL",
          quantity: pos.quantity,
          realizedPnLUSD: slLossVal,
          strategy: "STOP_LOSS_AUTO",
          marketCondition: "ADVERSE_VOLATILITY"
        });
        const msg = `🛡️ AUTO STOP-LOSS: Closed ${pos.quantity} ${sym} at $${fill.fillPrice} (PnL: ${pnlPct.toFixed(2)}%)`;
        logAutoTraderEvent(msg);
        cycleTrades.push(closeOrder);
        sendTradeAlert({
          symbol: sym,
          side: "sell",
          quantity: pos.quantity,
          price: fill.fillPrice,
          rationale: `Auto Stop-Loss (${pnlPct.toFixed(2)}%)`,
          isPaper: true
        }).catch(() => {});
      }
    } catch (_posErr) {}
  }

  // 2. Alpha Opportunity Scanner: Find high-conviction entry setup
  for (const symbol of autoTraderState.watchSymbols) {
    try {
      const quote = paper.quotes?.[symbol] || await fetchLiveQuote(symbol);
      setQuote(paper, quote);

      const held = paper.account?.positions?.[symbol]?.quantity || 0;
      if (held >= autoTraderState.maxTradeQuantity) continue;

      // Evaluate consensus & sizing
      const consensus = evaluateMultiGenomeConsensus(symbol, quote);
      const sizing = calculateDynamicLotSize({
        symbol,
        cash: paper.account?.cash || 100000,
        currentPrice: quote.price
      });

      // Should we enter automatically?
      const shouldBuy = forceExecute || (consensus.consensusPassed && consensus.buyVotes >= 2);

      if (shouldBuy && held < autoTraderState.maxTradeQuantity) {
        const maxNotional = paper.risk?.maxPositionNotional || 50000;
        let qtyToBuy = Math.min(autoTraderState.maxTradeQuantity - held, sizing.calculatedLotSize || 1);
        if (quote.price * qtyToBuy > maxNotional) {
          qtyToBuy = Math.max(0, Math.floor(maxNotional / quote.price));
        }
        if (qtyToBuy < 1) continue;

        const fill = placePaperOrder(paper, { symbol, side: "buy", quantity: qtyToBuy });

        const autoOrder = {
          id: randomUUID(),
          ...fill,
          mode: "paper",
          audit: {
            source: "autonomous_auto_trader",
            strategy: consensus.championGenome || "Multi-Genome Ensemble",
            consensusRate: consensus.agreementRatePercent,
            lotSizing: sizing.recommendedAllocPercent,
            rationale: `24/7 Automated Trade Entry: Consensus ${consensus.agreementRatePercent}% (${consensus.buyVotes}/3 Genomes) | Sizing: ${sizing.recommendedAllocPercent}`
          }
        };

        orders.push(autoOrder);
        autoTraderState.totalAutoTradesExecuted++;

        if (["AAPL", "TSLA", "NVDA"].includes(symbol)) {
          alpacaBroker.placeOrder(symbol, qtyToBuy, "buy", "market").catch(() => {});
        }

        recordLedgerTransaction({
          symbol,
          side: "BUY",
          quantity: qtyToBuy,
          fillPrice: fill.fillPrice,
          realizedPnLUSD: 0
        });

        aiInterconnectionBus.emit("TRADE_EXECUTED", {
          symbol,
          side: "BUY",
          quantity: qtyToBuy,
          fillPrice: fill.fillPrice,
          realizedPnLUSD: 0,
          strategy: consensus.championGenome || "MULTI_GENOME_CONSENSUS",
          marketCondition: "BULL_TREND_CONFLUENCE"
        });

        autoTraderState.recentAutoTrades.unshift({
          orderId: autoOrder.id,
          symbol,
          side: "BUY",
          quantity: qtyToBuy,
          price: fill.fillPrice,
          timestamp: new Date().toISOString()
        });
        if (autoTraderState.recentAutoTrades.length > 50) autoTraderState.recentAutoTrades.pop();

        const logMsg = `⚡ AUTO-TRADE EXECUTED: Bought ${qtyToBuy} ${symbol} at $${fill.fillPrice} | Multi-Genome Consensus: ${consensus.agreementRatePercent}%`;
        logAutoTraderEvent(logMsg);
        cycleTrades.push(autoOrder);

        sendTradeAlert({
          symbol,
          side: "buy",
          quantity: qtyToBuy,
          price: fill.fillPrice,
          rationale: `24/7 Auto-Trader: Consensus ${consensus.agreementRatePercent}% [Lot: ${qtyToBuy}]`,
          isPaper: true
        }).catch(() => {});

        if (typeof persist === "function") {
          try { persist(); } catch (_pErr) {}
        }

        // If forceExecute was called, execute one trade and return
        if (forceExecute) break;
      }
    } catch (_scanErr) {}
  }

  return {
    success: true,
    scanTimestamp: autoTraderState.lastScanTimestamp,
    tradesExecutedCount: cycleTrades.length,
    trades: cycleTrades,
    totalAutoTradesEver: autoTraderState.totalAutoTradesExecuted
  };
}

export function startAutoTrader({ paper, orders, persist, intervalMs = 10000 } = {}) {
  if (autoTraderState.isRunning) return getAutoTraderStatus();

  autoTraderState.isRunning = true;
  autoTraderState.intervalMs = intervalMs;
  logAutoTraderEvent(`24/7 Autonomous Automatic Trading System STARTED (Interval: ${intervalMs}ms)`);

  // Initial immediate scan
  executeAutonomousTradeCycle({ paper, orders, persist, forceExecute: false }).catch(() => {});

  autoTraderState.timerHandle = setInterval(() => {
    executeAutonomousTradeCycle({ paper, orders, persist, forceExecute: false }).catch(err => {
      logAutoTraderEvent(`Auto-Trader cycle error: ${err.message}`);
    });
  }, intervalMs);

  autoTraderState.timerHandle.unref?.();

  return getAutoTraderStatus();
}

export function stopAutoTrader() {
  if (!autoTraderState.isRunning) return getAutoTraderStatus();

  autoTraderState.isRunning = false;
  if (autoTraderState.timerHandle) {
    clearInterval(autoTraderState.timerHandle);
    autoTraderState.timerHandle = null;
  }
  logAutoTraderEvent("24/7 Autonomous Automatic Trading System PAUSED");
  return getAutoTraderStatus();
}
