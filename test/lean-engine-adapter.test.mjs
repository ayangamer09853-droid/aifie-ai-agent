import test from "node:test";
import assert from "node:assert/strict";
import { leanEngineAdapter, LeanEngineAdapter } from "../src/lean-engine-adapter.mjs";

test("LeanEngineAdapter: getStatus returns engine metadata and supported brokers", () => {
  const status = leanEngineAdapter.getStatus();
  assert.equal(status.success, true);
  assert.equal(status.engine, "QuantConnect/Lean");
  assert.ok(status.supportedBrokers.includes("Alpaca"));
  assert.ok(status.supportedBrokers.includes("Binance"));
  assert.ok(status.supportedBrokers.includes("Coinbase"));
  assert.ok(status.supportedBrokers.includes("InteractiveBrokers"));
  assert.ok(status.supportedLanguages.includes("Python"));
  assert.ok(status.supportedLanguages.includes("C#"));
});

test("LeanEngineAdapter: generateAlgorithm creates production-ready QCAlgorithm code", () => {
  // Test SMC Order Block Strategy
  const smc = leanEngineAdapter.generateAlgorithm("SMC_ORDER_BLOCK", {
    symbol: "BTCUSD",
    initialCash: 100000,
    stopLossPct: 2.0
  });
  assert.equal(smc.success, true);
  assert.equal(smc.strategyType, "SMC_ORDER_BLOCK");
  assert.equal(smc.language, "Python");
  assert.ok(smc.code.includes("class AifieSmcAlgorithm(QCAlgorithm):"));
  assert.ok(smc.code.includes("self.SetCash(100000)"));
  assert.ok(smc.code.includes("self.AddCrypto(\"BTCUSD\""));
  assert.ok(smc.code.includes("self.ATR("));

  // Test Cross Exchange Arb Strategy
  const arb = leanEngineAdapter.generateAlgorithm("CROSS_EXCHANGE_ARB", {
    initialCash: 50000
  });
  assert.equal(arb.success, true);
  assert.ok(arb.code.includes("class AifieCrossExchangeArb(QCAlgorithm):"));
  assert.ok(arb.code.includes("self.binance_btc"));
  assert.ok(arb.code.includes("self.coinbase_btc"));

  // Test Euler Risk Parity Strategy
  const erp = leanEngineAdapter.generateAlgorithm("EULER_RISK_PARITY", {
    maxLeverage: 1.2
  });
  assert.equal(erp.success, true);
  assert.ok(erp.code.includes("class AifieEulerRiskParity(QCAlgorithm):"));
  assert.ok(erp.code.includes("self.Schedule.On("));
});

test("LeanEngineAdapter: runBacktest executes event-driven backtest simulation", () => {
  const result = leanEngineAdapter.runBacktest({
    strategy: "SMC_ORDER_BLOCK",
    symbol: "BTCUSD",
    initialCash: 100000,
    durationDays: 90
  });

  assert.equal(result.engine, "QuantConnect/Lean");
  assert.equal(result.status, "COMPLETED");
  assert.ok(result.backtestId.startsWith("QC-LEAN-"));
  assert.ok(result.finalEquity > result.initialEquity);
  assert.ok(result.sharpeRatio > 2.0);
  assert.ok(result.profitFactor > 1.5);
  assert.ok(result.winRatePercent > 50);
  assert.ok(result.capacityEstimateUsd >= 10000000);
  assert.equal(result.constitutionalCompliance.rulesPassed, "8_OF_8");
});

test("LeanEngineAdapter: getIndicatorCatalog returns 10+ core Lean indicators", () => {
  const catalog = leanEngineAdapter.getIndicatorCatalog();
  assert.ok(Array.isArray(catalog));
  assert.ok(catalog.length >= 10);
  const names = catalog.map(i => i.name);
  assert.ok(names.includes("ATR"));
  assert.ok(names.includes("BollingerBands"));
  assert.ok(names.includes("EMA"));
  assert.ok(names.includes("RSI"));
  assert.ok(names.includes("MACD"));
  assert.ok(names.includes("VWAP"));
});

test("LeanEngineAdapter: exportLeanConfig safely serializes configuration", () => {
  const exported = leanEngineAdapter.exportLeanConfig({
    symbol: "ETHUSD",
    environment: "backtesting"
  });

  assert.equal(exported.success, true);
  assert.ok(exported.config);
  assert.equal(exported.config["algorithm-language"], "Python");
  assert.equal(exported.config.parameters.symbol, "ETHUSD");
  assert.ok(exported.config["alpaca-secret-key"] !== undefined);
  // Ensure secret is never exposed in plain text if present
  assert.ok(!exported.config["alpaca-secret-key"].includes("Dacv7bQ8UTmKtJafnwzXuHy3LmZKS53mK1QNEcPJVUS3"));
});
