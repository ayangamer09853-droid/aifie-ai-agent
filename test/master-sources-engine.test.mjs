import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_60_SOURCES,
  getMasterSourcesStatus,
  computeFractionalDifferentiation,
  computeBlackScholesGreeks,
  computeHummingbotPmmSpread,
  computeFinanceToolkitDupont,
  computeValuecellDcf,
  computeWorldmonitorThreatIndex,
  evaluateTradeMasterPolicy,
  scanAll60Sources,
  executeMasterSourceOperation
} from "../src/master-sources-engine.mjs";

test("Master Sources Engine catalogs all 60 repositories across 8 pillars", () => {
  assert.equal(ALL_60_SOURCES.length, 60);

  const pillars = new Set(ALL_60_SOURCES.map(s => s.pillar));
  assert.ok(pillars.has("QUANT_EXECUTION"));
  assert.ok(pillars.has("FINANCIAL_ML_RL"));
  assert.ok(pillars.has("VALUATION_FUNDAMENTALS"));
  assert.ok(pillars.has("MACRO_GEOPOLITICS"));
  assert.ok(pillars.has("MICROSTRUCTURE_OPTIONS"));
  assert.ok(pillars.has("MULTI_AGENT_SWARM"));
  assert.ok(pillars.has("SKILLS_SECURITY_AUTOMATION"));
  assert.ok(pillars.has("DATA_INFRASTRUCTURE"));

  for (const s of ALL_60_SOURCES) {
    assert.ok(s.repository);
    assert.ok(s.pillar);
    assert.ok(s.domain);
    assert.ok(s.role);
    assert.ok(Array.isArray(s.operations) && s.operations.length > 0);
  }
});

test("getMasterSourcesStatus detects physical clones and file structures on disk", () => {
  const status = getMasterSourcesStatus();
  assert.equal(status.length, 60);

  const presentCount = status.filter(s => s.present).length;
  // All 60 sources are present in the local sources directory
  assert.equal(presentCount, 60);
  assert.ok(status.every(s => s.fileCount > 0));
});

test("AFML Fractional Differentiation preserves memory and computes weights", () => {
  const res = computeFractionalDifferentiation({
    series: [100, 102, 101, 105, 108, 107, 110, 114, 112, 115],
    d: 0.35
  });

  assert.equal(res.source, "financial-machine-learning");
  assert.equal(res.fractionalD, 0.35);
  assert.ok(res.weightsCount > 5);
  assert.equal(res.isStationary, true);
  assert.equal(res.memoryPreservationRatio, 0.65);
});

test("Vibe-Trading Black-Scholes engine calculates analytical Greeks", () => {
  const res = computeBlackScholesGreeks({
    spot: 150,
    strike: 150,
    timeToExpiry: 0.25,
    volatility: 0.25,
    riskFreeRate: 0.05,
    optionType: "call"
  });

  assert.equal(res.source, "Vibe-Trading");
  assert.ok(res.theoreticalPrice > 0);
  assert.ok(res.greeks.delta >= 0 && res.greeks.delta <= 1.0);
  assert.ok(res.greeks.gamma > 0);
  assert.ok(res.greeks.vega > 0);
});

test("Hummingbot PMM calculates optimal reservation price and inventory skew", () => {
  const res = computeHummingbotPmmSpread({
    midPrice: 150,
    inventory: 5,
    targetInventory: 0
  });

  assert.equal(res.source, "hummingbot");
  assert.ok(res.reservationPrice < res.midPrice); // Inventory skew lowers reservation price to sell inventory
  assert.ok(res.optimalBid < res.reservationPrice);
  assert.ok(res.optimalAsk > res.optimalBid);
  assert.equal(res.inventorySkewRecommendation, "AGGRESSIVE_SELL_SKEW");
});

test("FinanceToolkit Dupont decomposition calculates ROE and Altman Z-score", () => {
  const res = computeFinanceToolkitDupont();
  assert.equal(res.source, "FinanceToolkit");
  assert.ok(res.returnOnEquityPercent > 0);
  assert.ok(res.altmanZScore > 0);
  assert.equal(res.solvencyZone, "SAFE_ZONE");
});

test("Valuecell & AI-Berkshire calculate DCF intrinsic value and margin of safety", () => {
  const res = computeValuecellDcf({ currentPrice: 130, freeCashFlowPerShare: 7.0 });
  assert.ok(res.intrinsicValue > 100);
  assert.ok(typeof res.marginOfSafetyPercent === "number");
  assert.equal(res.economicMoatRating, "WIDE_MOAT_DURABLE");
});

test("Worldmonitor calculates composite geopolitical threat index and chokepoint risks", () => {
  const res = computeWorldmonitorThreatIndex({ symbol: "AAPL" });
  assert.equal(res.source, "worldmonitor");
  assert.ok(res.compositeGeopoliticalIndex > 50);
  assert.equal(res.chokepoints.length, 5);
});

test("TradeMaster evaluates deep reinforcement learning policy", () => {
  const res = evaluateTradeMasterPolicy();
  assert.equal(res.source, "TradeMaster");
  assert.ok(["BUY", "HOLD", "SELL"].includes(res.action));
  assert.ok(res.actionProbabilities.buy >= 0);
  assert.ok(res.actionProbabilities.hold >= 0);
  assert.ok(res.actionProbabilities.sell >= 0);
});

test("scanAll60Sources aggregates 360-degree intelligence across all 60 sources", () => {
  const scan = scanAll60Sources("NVDA");
  assert.equal(scan.symbol, "NVDA");
  assert.equal(scan.totalSourcesCount, 60);
  assert.equal(scan.activeSourcesOnDisk, 60);
  assert.ok(typeof scan.compositeAlphaScore === "number");
  assert.ok(scan.consensusVerdict);
  assert.ok(scan.subEngines.fractionalDifferentiation);
  assert.ok(scan.subEngines.optionsGreeks);
  assert.ok(scan.subEngines.pureMarketMaking);
  assert.ok(scan.subEngines.fundamentalDupont);
  assert.ok(scan.subEngines.dcfValuation);
  assert.ok(scan.subEngines.geopoliticalThreatIndex);
  assert.ok(scan.subEngines.reinforcementLearningPolicy);

  // Every single one of the 60 sources must have a signal entry
  assert.equal(Object.keys(scan.signals).length, 60);
});

test("executeMasterSourceOperation dispatches concrete operations to any of the 60 sources", () => {
  const afmlRes = executeMasterSourceOperation("financial-machine-learning", "fractionalDifferentiation", { d: 0.4 });
  assert.equal(afmlRes.source, "financial-machine-learning");

  const greeksRes = executeMasterSourceOperation("Vibe-Trading", "calculateOptionGreeks", { spot: 100, strike: 100 });
  assert.equal(greeksRes.source, "Vibe-Trading");

  const leanRes = executeMasterSourceOperation("Lean", "compileQCAlgorithm", { algorithm: "MacdCrossOver" });
  assert.equal(leanRes.source, "Lean");
  assert.equal(leanRes.syntaxValid, true);

  const questdbRes = executeMasterSourceOperation("questdb", "formatIlpTickRecord", { symbol: "BTC/USDT", price: 88000 });
  assert.equal(questdbRes.success, true);
  assert.equal(questdbRes.repository, "questdb");

  // Test newly added physical disk and mathematical engines:
  const finDbRes = executeMasterSourceOperation("FinanceDatabase", "lookupSymbolProfile", { symbol: "BTC" });
  assert.equal(finDbRes.source, "FinanceDatabase");
  assert.equal(finDbRes.verifiedOnDisk, true);

  const amexRes = executeMasterSourceOperation("Finance", "getAmexUniverse", { ticker: "AAAU" });
  assert.equal(amexRes.source, "Finance");
  assert.equal(amexRes.verifiedOnDisk, true);

  const sentimentRes = executeMasterSourceOperation("stocksight", "parseSentimentStream", { text: "Earnings growth surges to record high" });
  assert.equal(sentimentRes.source, "stocksight");
  assert.equal(sentimentRes.sentimentClassification, "BULLISH");

  const memoryRes = executeMasterSourceOperation("agentmemory", "recallSimilarRegimes", { targetVector: [0.2, 0.35, -0.02, 0.7] });
  assert.equal(memoryRes.source, "agentmemory");
  assert.ok(memoryRes.highestSimilarity > 0.8);

  const l3Res = executeMasterSourceOperation("exchange-core", "simulateMatchingEngine", { quantity: 100, limitPrice: 151 });
  assert.equal(l3Res.source, "exchange-core");
  assert.ok(["FULL_FILL", "PARTIAL_FILL"].includes(l3Res.fillStatus));
});
