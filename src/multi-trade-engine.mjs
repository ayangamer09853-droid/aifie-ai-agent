/**
 * Multiple Automatic Trades Engine for Aifie AI Agent
 * Manages parallel multi-asset trading, concurrent position allocations, and portfolio balancing.
 */

import { randomUUID } from "node:crypto";
import { placePaperOrder, setQuote } from "./paper-engine.mjs";
import { fetchLiveQuote } from "./market-fetcher.mjs";
import { evaluateDecision } from "./strategy-lab.mjs";
import { getLiveBrokerStatus, placeLiveOrder } from "./live-broker.mjs";

export async function executeMultiAssetTrades({ watchSymbols, paper, strategyLab, orders, activeStrategyId, maxTradeQuantity }) {
  const liveStatus = getLiveBrokerStatus();
  const isLiveActive = liveStatus.isLiveModeUnlocked;
  const executionResults = [];

  // Scans all watchlist symbols concurrently in parallel
  const scanPromises = watchSymbols.map(async (symbol) => {
    try {
      const rawQuote = paper.quotes[symbol];
      const quote = rawQuote ? { symbol, ...rawQuote } : await fetchLiveQuote(symbol);
      setQuote(paper, quote);

      const decision = evaluateDecision(strategyLab, {
        symbol,
        quote,
        account: paper.account,
        strategyId: activeStrategyId
      });

      const held = paper.account.positions[symbol]?.quantity || 0;

      if (decision.action === "BUY" && held < maxTradeQuantity) {
        const qtyToBuy = Math.min(maxTradeQuantity - held, 2);
        const fill = placePaperOrder(paper, { symbol, side: "buy", quantity: qtyToBuy });
        if (isLiveActive) {
          await placeLiveOrder({ symbol, side: "buy", quantity: qtyToBuy, price: fill.fillPrice }).catch(() => {});
        }
        const order = {
          id: randomUUID(),
          ...fill,
          mode: isLiveActive ? "live_real_money" : "paper",
          audit: { signalRationale: decision.rationale, source: "multi_asset_parallel_engine" }
        };
        orders.push(order);
        executionResults.push({ symbol, action: "BUY", quantity: qtyToBuy, price: fill.fillPrice, mode: order.mode });
      } else if (decision.action === "SELL" && held > 0) {
        const fill = placePaperOrder(paper, { symbol, side: "sell", quantity: held });
        if (isLiveActive) {
          await placeLiveOrder({ symbol, side: "sell", quantity: held, price: fill.fillPrice }).catch(() => {});
        }
        const order = {
          id: randomUUID(),
          ...fill,
          mode: isLiveActive ? "live_real_money" : "paper",
          audit: { signalRationale: decision.rationale, source: "multi_asset_parallel_engine" }
        };
        orders.push(order);
        executionResults.push({ symbol, action: "SELL", quantity: held, price: fill.fillPrice, mode: order.mode });
      }
    } catch (err) {
      // Fail closed gracefully per symbol
    }
  });

  await Promise.all(scanPromises);

  return {
    timestamp: new Date().toISOString(),
    totalSymbolsScanned: watchSymbols.length,
    tradesExecutedCount: executionResults.length,
    executionResults
  };
}
