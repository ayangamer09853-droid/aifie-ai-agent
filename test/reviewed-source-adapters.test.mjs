import test from "node:test";
import assert from "node:assert/strict";
import {
  executeSandboxedCcxtTicker,
  executeSandboxedOpenBbFundamentals,
  executeSandboxedFinanceToolkitRatios,
  executeSandboxedKronosForecast,
  executeSandboxedNautilusBacktest,
  executeSandboxedSourceAdapter,
  runAllSourcesConsensus,
  getSandboxedAdaptersCatalog
} from "../src/reviewed-source-adapters.mjs";

test("getSandboxedAdaptersCatalog returns all 24 audited adapters and safety guarantees", () => {
  const cat = getSandboxedAdaptersCatalog();
  assert.equal(cat.status, "SANDBOXED_SOURCE_ADAPTERS_PIPELINE_ACTIVE");
  assert.equal(cat.totalAuditedAdapters, 24);
  assert.ok(cat.adapters.ccxt.isSandboxed);
  assert.equal(cat.adapters.ccxt.paperSafetyLock, "LIVE_ORDERS_DISALLOWED");
  assert.ok(cat.adapters.Kronos.isSandboxed);
  assert.ok(cat.adapters.nautilus_trader.isSandboxed);
  assert.ok(cat.adapters["hermes-agent"].isSandboxed);
  assert.ok(cat.adapters["vercel-skills"].isSandboxed);
});

test("executeSandboxedCcxtTicker returns ticker with isolation bounds", () => {
  const ticker = executeSandboxedCcxtTicker({ exchange: "binance", symbol: "BTC/USDT" });
  assert.equal(ticker.success, true);
  assert.equal(ticker.symbol, "BTC/USDT");
  assert.equal(ticker.isolationBound, "NON_CUSTODIAL_READ_ONLY");
  assert.ok(ticker.last > 0);
});

test("executeSandboxedOpenBbFundamentals extracts financial ratios cleanly", () => {
  const fund = executeSandboxedOpenBbFundamentals({ symbol: "AAPL" });
  assert.equal(fund.success, true);
  assert.equal(fund.symbol, "AAPL");
  assert.ok(fund.peRatio > 0);
  assert.equal(fund.sector, "Technology");
});

test("executeSandboxedFinanceToolkitRatios computes Sharpe ratio offline", () => {
  const ratios = executeSandboxedFinanceToolkitRatios();
  assert.equal(ratios.success, true);
  assert.ok(typeof ratios.sharpeRatio === "number");
  assert.equal(ratios.isolationBound, "PURE_OFFLINE_MATH");
});

test("executeSandboxedSourceAdapter dispatches across any of the 24 sources", () => {
  const kronos = executeSandboxedSourceAdapter("Kronos", { symbol: "ETH/USDT" });
  assert.equal(kronos.success, true);
  assert.ok(kronos.forecastTrend);

  const nautilus = executeSandboxedSourceAdapter("nautilus_trader", { symbol: "TSLA" });
  assert.equal(nautilus.success, true);
  assert.ok(nautilus.winRate > 0);

  const hermes = executeSandboxedSourceAdapter("hermes-agent");
  assert.equal(hermes.success, true);
  assert.equal(hermes.isolationBound, "READ_ONLY_SANDBOX");
});

test("runAllSourcesConsensus queries and aggregates intelligence from all 24 sources", () => {
  const consensus = runAllSourcesConsensus({ symbol: "AAPL" });
  assert.equal(consensus.success, true);
  assert.equal(consensus.totalSourcesQueried, 24);
  assert.equal(consensus.successfulAdaptersCount, 24);
  assert.equal(consensus.consensusScore, 1.0);
  assert.equal(consensus.consensusVerdict, "UNIFIED_ALL_24_SOURCES_OPTIMAL");
  assert.ok(consensus.results.TradingAgents.success);
  assert.ok(consensus.results.Kronos.success);
  assert.ok(consensus.results.ccxt.success);
  assert.ok(consensus.results.questdb.success);
  assert.ok(consensus.results["hermes-agent"].success);
  assert.ok(consensus.results["vercel-skills"].success);
});

