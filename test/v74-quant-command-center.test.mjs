import test from "node:test";
import assert from "node:assert/strict";
import {
  getNeuralCommandGraphData,
  getMarketTickerRibbonData,
  getOrderFlowAuroraData,
  getVolatilityClusteringData,
  getCoherenceFieldData,
  getBayesianUpdateData,
  getMonteCarloSimulationData
} from "../src/quant-command-center-engine.mjs";

test("Neural Command Graph outputs 10 causal stages with evidence", () => {
  const graph = getNeuralCommandGraphData({ symbol: "BTC/USDT" });
  assert.equal(graph.graphStatus, "NEURAL_COMMAND_GRAPH_ONLINE");
  assert.equal(graph.totalStagesCount, 10);
  assert.equal(graph.nodes[0].id, "DATA");
  assert.equal(graph.nodes[9].id, "LEARNING");
  assert.ok(graph.nodes[5].evidence.var95PercentUSD !== undefined || graph.nodes[5].var95PercentUSD > 0);
});

test("Market Ticker Ribbon returns 10 major assets", () => {
  const tickers = getMarketTickerRibbonData();
  assert.ok(tickers.length >= 10);
  assert.equal(tickers[0].symbol, "BTC/USD");
});

test("Order Flow Aurora calculates CVD delta and volume imbalance", () => {
  const of = getOrderFlowAuroraData();
  assert.ok(of.totalBidVolume > 0);
  assert.ok(of.totalAskVolume > 0);
  assert.ok(of.cumulativeVolumeDelta !== undefined);
  assert.ok(of.levels.length > 0);
});

test("Volatility Clustering, Coherence, Bayesian, and Monte Carlo engines generate distributions", () => {
  const vol = getVolatilityClusteringData();
  assert.ok(vol.currentVolRegime);

  const coh = getCoherenceFieldData();
  assert.ok(coh.overallCoherenceScore > 70);

  const bayes = getBayesianUpdateData();
  assert.ok(bayes.posteriorProbabilityPct > bayes.priorProbabilityPct);

  const mc = getMonteCarloSimulationData({ pathsCount: 10000 });
  assert.equal(mc.pathsSimulated, 10000);
  assert.ok(mc.percentile95thUSD > mc.percentile5thUSD);
});
