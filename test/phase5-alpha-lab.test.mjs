import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { app } from "../server.mjs";

import {
  calculateOlsRegression,
  calculateAdfTest,
  calculateEngleGrangerCointegration,
  updateKalmanFilterHedgeRatio,
  calculateOrnsteinUhlenbeckHalfLife,
  generatePairsTradingSignal,
  calculateKalmanHedgeRatio,
  scanAllCointegratedPairs,
  getCointegrationEngineStatus
} from "../src/cointegration-stat-arb-engine.mjs";

import {
  partitionVolumeBuckets,
  classifyBulkVolume,
  calculateRollingVpin,
  calculateVpinIndex,
  getVpinEngineStatus
} from "../src/vpin-microstructure-toxicity-engine.mjs";

import {
  detectFractalPivots,
  identifyStructureBreaks,
  detectOrderBlocks,
  detectFairValueGaps,
  detectLiquiditySweeps,
  analyzeSmartMoneyStructure,
  getSmcEngineStatus
} from "../src/smc-market-structure.mjs";

import {
  createStrategyChromosome,
  evaluateGenomeFitness,
  crossoverChromosomes,
  mutateChromosome,
  runGeneticStrategyOptimization,
  runGeneticOptimizer,
  getGeneticOptimizerStatus
} from "../src/genetic-strategy-optimizer.mjs";

import {
  generateAll1000Strategies,
  queryStrategyMegafactory,
  searchStrategyMegafactory,
  filterOrthogonalStrategies,
  getMegafactoryStatus
} from "../src/strategy-megafactory-1000.mjs";

let server;
let baseUrl;

test.before(async () => {
  server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
});

test("Phase 5: Cointegration & Stat-Arb calculates OLS, ADF test, Kalman beta, and OU half-life", () => {
  // Generate cointegrated series: B = trend + noise, A = 2.0 * B + stationary spread
  const n = 60;
  const seriesB = [];
  const seriesA = [];
  for (let i = 0; i < n; i++) {
    const b = 100 + i * 0.5 + Math.sin(i / 2) * 2;
    const spread = Math.sin(i * 0.8) * 3;
    const a = 2.0 * b + 10 + spread;
    seriesB.push(Number(b.toFixed(2)));
    seriesA.push(Number(a.toFixed(2)));
  }

  // 1. OLS Regression
  const ols = calculateOlsRegression(seriesB, seriesA);
  assert.ok(Math.abs(ols.beta - 2.0) < 0.2, `OLS beta should be close to 2.0, got ${ols.beta}`);
  assert.ok(ols.rSquared > 0.90, "R-squared should be very high");
  assert.equal(ols.residuals.length, n);

  // 2. ADF Test on Residuals
  const adf = calculateAdfTest(ols.residuals);
  assert.ok(typeof adf.tStatistic === "number");
  assert.ok(adf.criticalValues["5%"] === -3.34);

  // 3. Engle-Granger Two-Step
  const coint = calculateEngleGrangerCointegration(seriesA, seriesB);
  assert.equal(coint.method, "ENGLE_GRANGER_TWO_STEP");
  assert.ok(coint.hedgeRatioBeta > 0);

  // 4. Recursive Kalman Filter
  let state = { beta: 1.5, p: 0.05, q: 0.0001, r: 0.005 };
  for (let i = 0; i < 20; i++) {
    state = updateKalmanFilterHedgeRatio({ ...state, priceA: seriesA[i], priceB: seriesB[i] });
  }
  assert.ok(state.beta > 0);
  assert.ok(state.p < 0.05, "Kalman error covariance should shrink with observations");

  // 5. Ornstein-Uhlenbeck Half-Life
  const stationaryResiduals = Array.from({ length: 40 }, (_, i) => Math.sin(i * 0.8) * 4);
  const ou = calculateOrnsteinUhlenbeckHalfLife(stationaryResiduals);
  assert.ok(ou.halfLifeBars > 0 && ou.halfLifeBars < 100, "Half-life should be finite and positive");

  // 6. Signal Generator
  const sig = generatePairsTradingSignal({ seriesA, seriesB });
  assert.equal(sig.success, true);
  assert.ok(["LONG_SPREAD_LONG_A_SHORT_B", "SHORT_SPREAD_LONG_B_SHORT_A", "NEUTRAL", "TAKE_PROFIT_CLOSE_SPREAD", "STOP_LOSS_BREAKOUT"].includes(sig.arbitrageSignal));

  // 7. Telemetry & Backward Compatibility
  const status = getCointegrationEngineStatus();
  assert.equal(status.status, "ACTIVE");
  const compat = calculateKalmanHedgeRatio();
  assert.equal(compat.isCointegrated, true);
  const scan = scanAllCointegratedPairs();
  assert.equal(scan.totalMonitoredPairs, 3);
});

test("Phase 5: VPIN Microstructure partitions tape, computes BVC, and detects predatory toxic flow", () => {
  // 1. Partition Volume Buckets
  const tradeTape = [
    { price: 100.0, volume: 30 },
    { price: 100.5, volume: 40 }, // Spans across bucket (30 + 20 = 50), leaves 20
    { price: 101.0, volume: 30 }, // Completes second bucket (20 + 30 = 50)
    { price: 101.5, volume: 60 }  // Completes third bucket, leaves 10
  ];
  const buckets = partitionVolumeBuckets(tradeTape, 50);
  assert.equal(buckets.length, 3, "Should produce exactly 3 completed buckets of 50 units");
  assert.equal(buckets[0].volume, 50);
  assert.equal(buckets[1].volume, 50);
  assert.equal(buckets[2].volume, 50);

  // 2. Bulk Volume Classification (BVC)
  const bvcUp = classifyBulkVolume(2.5, 1.0, 50);
  assert.ok(bvcUp.buyVolume > bvcUp.sellVolume, "Positive price delta must yield higher buy volume");
  assert.ok(Math.abs(bvcUp.buyVolume + bvcUp.sellVolume - 50) < 0.01);

  const bvcDown = classifyBulkVolume(-2.5, 1.0, 50);
  assert.ok(bvcDown.sellVolume > bvcDown.buyVolume, "Negative price delta must yield higher sell volume");

  // 3. Rolling VPIN Index Calculation
  const vpinReport = calculateRollingVpin({ symbol: "BTC/USDT", bucketVolume: 50, numberOfBuckets: 20 });
  assert.equal(vpinReport.success, true);
  assert.ok(vpinReport.vpin >= 0 && vpinReport.vpin <= 1.0, "VPIN must be bounded between 0 and 1");
  assert.ok(["NORMAL_FLOW", "ELEVATED_VOLATILITY_FLOW", "TOXIC_INFORMED_FLOW"].includes(vpinReport.toxicityRegime));
  assert.ok(vpinReport.recentBuckets.length > 0);

  // 4. Telemetry & Backward Compatibility
  const status = getVpinEngineStatus();
  assert.equal(status.status, "ACTIVE");
  const compat = calculateVpinIndex();
  assert.equal(compat.engineStatus, "VPIN_ENGINE_ACTIVE");
});

test("Phase 5: Smart Money Concepts detects fractal pivots, BOS/CHoCH, Order Blocks, FVGs, and Liquidity sweeps", () => {
  const prices = [
    100, 102, 105, 103, 101, // High at 105
    98, 97, 99, 104, 108,    // Low at 97, High at 108 (BOS)
    106, 104, 102, 95, 93,   // Violent breakdown
    96, 100, 103, 107, 110
  ];

  // 1. Fractal Pivots
  const pivots = detectFractalPivots(prices, 2, 2);
  assert.ok(pivots.swingHighs.length > 0, "Should detect swing highs");
  assert.ok(pivots.swingLows.length > 0, "Should detect swing lows");

  // 2. Structure Breaks (BOS / CHoCH)
  const breaks = identifyStructureBreaks(prices, pivots);
  assert.ok(breaks.marketStructureShift);
  assert.ok(["BULLISH_BOS", "BEARISH_BOS", "NONE"].includes(breaks.bosDetected));

  // 3. Order Blocks (OB)
  const orderBlocks = detectOrderBlocks(prices);
  assert.ok(Array.isArray(orderBlocks));

  // 4. Fair Value Gaps (FVG)
  const fvgs = detectFairValueGaps(prices);
  assert.ok(Array.isArray(fvgs));

  // 5. Liquidity Sweeps
  const sweeps = detectLiquiditySweeps(prices, pivots);
  assert.ok(typeof sweeps.bslSwept === "boolean");
  assert.ok(typeof sweeps.sslSwept === "boolean");

  // 6. Comprehensive Composite SMC Dossier
  const smc = analyzeSmartMoneyStructure(prices);
  assert.equal(smc.success, true);
  assert.ok(smc.currentPrice > 0);
  assert.ok(["PREMIUM_EXPENSIVE", "DISCOUNT_CHEAP"].includes(smc.pricingZone));
  assert.ok(smc.orderBlock);
  assert.ok(smc.fairValueGap);
  assert.ok(smc.liquidityPools);

  // 7. Telemetry
  const status = getSmcEngineStatus();
  assert.equal(status.status, "ACTIVE");
});

test("Phase 5: Genetic Strategy Hyper-Optimizer evolves multi-gene chromosomes across generations", () => {
  // 1. Chromosome Creation
  const chrom = createStrategyChromosome("CH_01", "TREND_MOMENTUM");
  assert.equal(chrom.id, "CH_01");
  assert.ok(chrom.genes.fastPeriod < chrom.genes.slowPeriod, "Fast period must be strictly less than slow period");
  assert.ok(chrom.genes.stopLossPercent >= 1.0);

  // 2. Fitness Evaluation
  const fitness = evaluateGenomeFitness(chrom);
  assert.ok(fitness.fitnessScore > 0, "Fitness score must be positive");
  assert.ok(typeof fitness.sharpeRatio === "number");
  assert.ok(typeof fitness.winRatePercent === "number");

  // 3. Crossover
  const chromB = createStrategyChromosome("CH_02", "TREND_MOMENTUM");
  const child = crossoverChromosomes(chrom, chromB, "CH_CHILD");
  assert.equal(child.id, "CH_CHILD");
  assert.ok(child.genes.fastPeriod < child.genes.slowPeriod);

  // 4. Mutation
  const mutated = mutateChromosome(child, 1.0); // 100% mutation rate for test
  assert.ok(mutated.genes.fastPeriod < mutated.genes.slowPeriod);

  // 5. Multi-Generational Evolutionary Run
  const evo = runGeneticStrategyOptimization({
    populationSize: 10,
    generations: 3,
    elitismCount: 2
  });
  assert.equal(evo.success, true);
  assert.equal(evo.optimizerStatus, "CONVERGED_OPTIMAL");
  assert.equal(evo.generationProgression.length, 3);
  assert.ok(evo.topCandidate.performance.fitnessScore > 0);
  assert.equal(evo.rankedCandidates.length, 10);

  // 6. Telemetry & Backward Compatibility
  const status = getGeneticOptimizerStatus();
  assert.equal(status.status, "ACTIVE");
  const compat = runGeneticOptimizer({ populationSize: 5, generations: 2 });
  assert.equal(compat.optimizerStatus, "COMPLETED");
});

test("Phase 5: Strategy Megafactory catalogs 1,000+ strategies and filters orthogonal alpha streams", () => {
  // 1. Generate 1,000 Strategies
  const all = generateAll1000Strategies();
  assert.ok(all.length >= 1000, `Megafactory must contain at least 1,000 strategies, got ${all.length}`);
  assert.equal(all[0].id, "STRAT_0001");

  // 2. Query Megafactory by Family & Min Sharpe
  const query = queryStrategyMegafactory({ family: "STATISTICAL_ARBITRAGE", minSharpe: 3.0, limit: 20 });
  assert.equal(query.engineStatus, "MEGAFACTORY_CATALOG_ACTIVE");
  assert.ok(query.matchedCount > 0);
  assert.ok(query.strategies.length <= 20);
  assert.ok(query.strategies.every(s => s.family === "STATISTICAL_ARBITRAGE"));

  // 3. Search Megafactory
  const search = searchStrategyMegafactory("MOMENTUM");
  assert.ok(search.resultsCount > 0);

  // 4. Orthogonality Filter
  const orthogonal = filterOrthogonalStrategies(all, 0.30);
  assert.equal(orthogonal.method, "ORTHOGONALITY_DIVERSIFICATION_FILTER");
  assert.ok(orthogonal.selectedOrthogonalCount >= 10, "Should select at least 10 orthogonal archetype representatives");

  // 5. Telemetry
  const status = getMegafactoryStatus();
  assert.equal(status.status, "ACTIVE");
  assert.equal(status.archetypeFamiliesCount, 10);
});

test("Phase 5: Server exposes all alpha lab and strategy megafactory REST endpoints", async () => {
  // 1. POST /api/alpha/cointegration
  const cointRes = await fetch(`${baseUrl}/api/alpha/cointegration`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetA: "BTC/USDT", assetB: "ETH/USDT" })
  });
  assert.equal(cointRes.status, 200);
  const cointData = await cointRes.json();
  assert.ok(cointData.arbitrageSignal);

  // 2. POST /api/alpha/vpin
  const vpinRes = await fetch(`${baseUrl}/api/alpha/vpin`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbol: "ETH/USDT", bucketVolume: 50, numberOfBuckets: 20 })
  });
  assert.equal(vpinRes.status, 200);
  const vpinData = await vpinRes.json();
  assert.equal(vpinData.success, true);
  assert.ok(vpinData.vpin >= 0);

  // 3. POST /api/alpha/smc
  const smcRes = await fetch(`${baseUrl}/api/alpha/smc`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prices: [100, 102, 105, 103, 101, 98, 97, 99, 104, 108] })
  });
  assert.equal(smcRes.status, 200);
  const smcData = await smcRes.json();
  assert.equal(smcData.success, true);
  assert.ok(smcData.orderBlock);
  assert.ok(smcData.fairValueGap);

  // 4. POST /api/alpha/genetic-optimize
  const genRes = await fetch(`${baseUrl}/api/alpha/genetic-optimize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ populationSize: 8, generations: 2 })
  });
  assert.equal(genRes.status, 200);
  const genData = await genRes.json();
  assert.equal(genData.success, true);
  assert.equal(genData.optimizerStatus, "CONVERGED_OPTIMAL");

  // 5. GET /api/alpha/megafactory
  const megaRes = await fetch(`${baseUrl}/api/alpha/megafactory?family=TREND_MOMENTUM&limit=10`);
  assert.equal(megaRes.status, 200);
  const megaData = await megaRes.json();
  assert.equal(megaData.success, true);
  assert.ok(megaData.strategies.length <= 10);

  // 6. GET /api/alpha/status
  const statusRes = await fetch(`${baseUrl}/api/alpha/status`);
  assert.equal(statusRes.status, 200);
  const statusData = await statusRes.json();
  assert.equal(statusData.success, true);
  assert.equal(statusData.phase, "PHASE_5_ALPHA_LAB_MEGAFACTORY");
  assert.equal(statusData.cointegration.status, "ACTIVE");
  assert.equal(statusData.vpin.status, "ACTIVE");
  assert.equal(statusData.smc.status, "ACTIVE");
  assert.equal(statusData.genetic.status, "ACTIVE");
  assert.equal(statusData.megafactory.status, "ACTIVE");
});
