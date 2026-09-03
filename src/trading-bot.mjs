import { randomUUID } from "node:crypto";
import { fetchLiveQuote } from "./market-fetcher.mjs";
import { accountSnapshot, placePaperOrder, setQuote } from "./paper-engine.mjs";
import { evaluateDecision } from "./strategy-lab.mjs";
import { agentRegistry } from "./alfie-control-plane.mjs";
import { getLiveBrokerStatus, placeLiveOrder } from "./live-broker.mjs";
import { checkNewsVolatilityShield } from "./economic-tracker.mjs";
import { evaluateSmartAlerts } from "./price-alerts.mjs";
import { sendTradeAlert } from "./telegram-notifier.mjs";

const botState = {
  isRunning: false,
  intervalMs: 5000,
  watchSymbols: ["AAPL", "TSLA", "BTC", "ETH", "NVDA"],
  activeStrategyId: "sma_crossover",
  stopLossPercent: 3.0,
  takeProfitPercent: 6.0,
  maxTradeQuantity: 5,
  tickCount: 0,
  lastTickTime: null,
  logs: [],
  timerHandle: null
};

function logBotEvent(message) {
  const logEntry = { id: randomUUID(), message, timestamp: new Date().toISOString() };
  botState.logs.unshift(logEntry);
  if (botState.logs.length > 50) botState.logs.pop();
  return logEntry;
}

export function getBotStatus() {
  return {
    isRunning: botState.isRunning,
    intervalMs: botState.intervalMs,
    watchSymbols: [...botState.watchSymbols],
    activeStrategyId: botState.activeStrategyId,
    stopLossPercent: botState.stopLossPercent,
    takeProfitPercent: botState.takeProfitPercent,
    maxTradeQuantity: botState.maxTradeQuantity,
    tickCount: botState.tickCount,
    lastTickTime: botState.lastTickTime,
    recentLogs: botState.logs.slice(0, 15)
  };
}

export function configureBot(config = {}) {
  if (Array.isArray(config.watchSymbols)) {
    botState.watchSymbols = config.watchSymbols.map(s => String(s).trim().toUpperCase()).filter(Boolean);
  }
  if (typeof config.activeStrategyId === "string") {
    botState.activeStrategyId = config.activeStrategyId;
  }
  if (typeof config.stopLossPercent === "number" && config.stopLossPercent > 0) {
    botState.stopLossPercent = config.stopLossPercent;
  }
  if (typeof config.takeProfitPercent === "number" && config.takeProfitPercent > 0) {
    botState.takeProfitPercent = config.takeProfitPercent;
  }
  if (typeof config.maxTradeQuantity === "number" && config.maxTradeQuantity > 0) {
    botState.maxTradeQuantity = config.maxTradeQuantity;
  }
  if (typeof config.intervalMs === "number" && config.intervalMs >= 1000) {
    botState.intervalMs = config.intervalMs;
  }
  logBotEvent(`Bot reconfigured: Strategy=${botState.activeStrategyId}, Watchlist=[${botState.watchSymbols.join(", ")}]`);
  return getBotStatus();
}

export async function runBotCycle({ paper, strategyLab, orders, persist }) {
  // 1. Check Safety Kill Switch & Macro News Volatility Shield
  const registry = agentRegistry();
  if (registry.safety.killSwitchActive) {
    logBotEvent(`Bot cycle paused: Kill switch is active (${registry.safety.reason})`);
    return { status: "paused_by_kill_switch" };
  }

  const newsShield = checkNewsVolatilityShield();
  if (newsShield.isShieldActive) {
    logBotEvent(`Bot cycle paused: ${newsShield.reason}`);
    return { status: "paused_by_news_shield", reason: newsShield.reason };
  }

  const liveBrokerStatus = getLiveBrokerStatus();
  const isLiveTradingActive = liveBrokerStatus.isLiveModeUnlocked;
  const cycleLogs = [];

  // Evaluate Smart Price Alerts
  const triggeredAlerts = evaluateSmartAlerts(paper.quotes, {});
  for (const alert of triggeredAlerts) {
    const alertMsg = `🔔 ALERT TRIGGERED: ${alert.message}`;
    logBotEvent(alertMsg);
    cycleLogs.push(alertMsg);
  }

  // 2. Risk Gate: Auto Stop-Loss & Take-Profit on Open Positions
  const openPositions = Object.entries(paper.account.positions);

  for (const [symbol, position] of openPositions) {
    if (position.quantity <= 0) continue;
    
    // Respect existing quote if set, otherwise fetch live quote
    const rawQuote = paper.quotes[symbol];
    const quote = rawQuote ? { symbol, ...rawQuote } : await fetchLiveQuote(symbol);
    setQuote(paper, quote);

    const currentPrice = quote.price;
    const avgPrice = position.averagePrice;
    const pnlPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;

    if (pnlPercent <= -botState.stopLossPercent) {
      try {
        const fill = placePaperOrder(paper, { symbol, side: "sell", quantity: position.quantity });
        if (isLiveTradingActive) {
          await placeLiveOrder({ symbol, side: "sell", quantity: position.quantity, price: fill.fillPrice }).catch(() => {});
        }
        const order = { id: randomUUID(), ...fill, mode: isLiveTradingActive ? "live_real_money" : "paper", audit: { signalRationale: `STOP-LOSS Triggered (${pnlPercent.toFixed(2)}% <= -${botState.stopLossPercent}%)`, source: "bot_risk_gate" } };
        orders.push(order);
        const msg = `STOP-LOSS EXECUTED (${isLiveTradingActive ? "LIVE" : "PAPER"}): Sold ${position.quantity} ${symbol} at ${fill.fillPrice.toFixed(2)} (PnL: ${pnlPercent.toFixed(2)}%)`;
        logBotEvent(msg);
        cycleLogs.push(msg);
      } catch (err) {
        logBotEvent(`Stop-Loss order error for ${symbol}: ${err.message}`);
      }
    } else if (pnlPercent >= botState.takeProfitPercent) {
      try {
        const fill = placePaperOrder(paper, { symbol, side: "sell", quantity: position.quantity });
        if (isLiveTradingActive) {
          await placeLiveOrder({ symbol, side: "sell", quantity: position.quantity, price: fill.fillPrice }).catch(() => {});
        }
        const order = { id: randomUUID(), ...fill, mode: isLiveTradingActive ? "live_real_money" : "paper", audit: { signalRationale: `TAKE-PROFIT Triggered (+${pnlPercent.toFixed(2)}% >= +${botState.takeProfitPercent}%)`, source: "bot_risk_gate" } };
        orders.push(order);
        const msg = `TAKE-PROFIT EXECUTED (${isLiveTradingActive ? "LIVE" : "PAPER"}): Sold ${position.quantity} ${symbol} at ${fill.fillPrice.toFixed(2)} (PnL: +${pnlPercent.toFixed(2)}%)`;
        logBotEvent(msg);
        cycleLogs.push(msg);
      } catch (err) {
        logBotEvent(`Take-Profit order error for ${symbol}: ${err.message}`);
      }
    }
  }

  // 3. Technical Indicator & Strategy Signal Evaluation per Watch Symbol
  for (const symbol of botState.watchSymbols) {
    try {
      const rawQuote = paper.quotes[symbol];
      const quote = rawQuote ? { symbol, ...rawQuote } : await fetchLiveQuote(symbol);
      setQuote(paper, quote);

      const decision = evaluateDecision(strategyLab, {
        symbol,
        quote,
        account: accountSnapshot(paper),
        strategyId: botState.activeStrategyId
      });

      if (decision.action === "BUY") {
        const held = paper.account.positions[symbol]?.quantity || 0;
        if (held < botState.maxTradeQuantity) {
          const qtyToBuy = Math.min(botState.maxTradeQuantity - held, 2);
          const fill = placePaperOrder(paper, { symbol, side: "buy", quantity: qtyToBuy });
          if (isLiveTradingActive) {
            await placeLiveOrder({ symbol, side: "buy", quantity: qtyToBuy, price: fill.fillPrice }).catch(() => {});
          }
          const order = { id: randomUUID(), ...fill, mode: isLiveTradingActive ? "live_real_money" : "paper", audit: { signalRationale: decision.rationale, source: "bot_strategy_signal" } };
          orders.push(order);
          const msg = `BOT SIGNAL BUY (${isLiveTradingActive ? "LIVE" : "PAPER"}): Purchased ${qtyToBuy} ${symbol} at ${fill.fillPrice.toFixed(2)} | ${decision.rationale}`;
          logBotEvent(msg);
          cycleLogs.push(msg);
          sendTradeAlert({
            symbol,
            side: "buy",
            quantity: qtyToBuy,
            price: fill.fillPrice,
            rationale: decision.rationale,
            isPaper: !isLiveTradingActive
          }).catch(() => {});
        }
      } else if (decision.action === "SELL") {
        const held = paper.account.positions[symbol]?.quantity || 0;
        if (held > 0) {
          const fill = placePaperOrder(paper, { symbol, side: "sell", quantity: held });
          if (isLiveTradingActive) {
            await placeLiveOrder({ symbol, side: "sell", quantity: held, price: fill.fillPrice }).catch(() => {});
          }
          const order = { id: randomUUID(), ...fill, mode: isLiveTradingActive ? "live_real_money" : "paper", audit: { signalRationale: decision.rationale, source: "bot_strategy_signal" } };
          orders.push(order);
          const msg = `BOT SIGNAL SELL (${isLiveTradingActive ? "LIVE" : "PAPER"}): Sold ${held} ${symbol} at ${fill.fillPrice.toFixed(2)} | ${decision.rationale}`;
          logBotEvent(msg);
          cycleLogs.push(msg);
          sendTradeAlert({
            symbol,
            side: "sell",
            quantity: held,
            price: fill.fillPrice,
            rationale: decision.rationale,
            isPaper: !isLiveTradingActive
          }).catch(() => {});
        }
      }
    } catch (err) {
      // Risk gates fail closed gracefully
    }
  }

  botState.tickCount += 1;
  botState.lastTickTime = new Date().toISOString();

  if (typeof persist === "function") {
    persist();
  }

  return {
    status: "success",
    tickCount: botState.tickCount,
    lastTickTime: botState.lastTickTime,
    isLiveMode: isLiveTradingActive,
    cycleLogs
  };
}

export function startBot(context) {
  if (botState.isRunning) return getBotStatus();
  botState.isRunning = true;
  logBotEvent("Automated Trading Bot STARTED");

  runBotCycle(context).catch(() => {});

  botState.timerHandle = setInterval(() => {
    runBotCycle(context).catch(err => logBotEvent(`Bot cycle error: ${err.message}`));
  }, botState.intervalMs);
  botState.timerHandle.unref?.();

  return getBotStatus();
}

export function stopBot() {
  if (!botState.isRunning) return getBotStatus();
  botState.isRunning = false;
  if (botState.timerHandle) {
    clearInterval(botState.timerHandle);
    botState.timerHandle = null;
  }
  logBotEvent("Automated Trading Bot STOPPED");
  return getBotStatus();
}
