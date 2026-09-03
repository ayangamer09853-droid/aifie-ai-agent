import test from "node:test";
import assert from "node:assert/strict";
import { getMetaGovernorStatus } from "../src/meta-governor.mjs";
import { evaluateAdversarialCase } from "../src/adversarial-agent.mjs";
import { getOpportunityRankings } from "../src/opportunity-ranker.mjs";
import { getKnowledgeGraphData } from "../src/knowledge-graph.mjs";
import { getTreasuryBuckets } from "../src/treasury-management.mjs";
import { getShadowTradingStatus } from "../src/shadow-trading.mjs";
import { getHedgeFundCommitteeStatus, runHedgeFundCycle } from "../src/hedge-fund-agents.mjs";
import { createPaperState } from "../src/paper-engine.mjs";
import { getConnectedSourceStatus, runFullIntelligenceScan } from "../src/source-bridges.mjs";
import { getNeuralGraphData } from "../src/neural-network.mjs";

test("getConnectedSourceStatus returns status for all 24 source repositories", () => {
  const sources = getConnectedSourceStatus();
  assert.equal(sources.length, 24);
  const tv = sources.find(s => s.repository === "TradingView-API");
  assert.ok(tv);
  assert.equal(tv.connected, true);

  const ccxt = sources.find(s => s.repository === "ccxt");
  assert.ok(ccxt);
  assert.equal(ccxt.connected, true);
});

test("runFullIntelligenceScan aggregates signals across 24 sources", () => {
  const scan = runFullIntelligenceScan("AAPL");
  assert.equal(scan.totalSourcesConnected, 24);
  assert.ok(scan.signals["TradingView-API"]);
  assert.ok(scan.signals.ccxt);
  assert.ok(scan.signals.questdb);
  assert.ok(scan.signals.FinanceToolkit);
  assert.ok(scan.signals.openalgo);
  assert.ok(scan.signals["hermes-agent"]);
  assert.ok(scan.signals["vercel-skills"]);
});

test("getNeuralGraphData returns 17 nodes and 16 connection links", () => {
  const graph = getNeuralGraphData();
  assert.equal(graph.nodeCount, 17);
  assert.equal(graph.edgeCount, 16);
});

test("getMetaGovernorStatus oversees Swarm CEOs and agent rankings", () => {
  const gov = getMetaGovernorStatus();
  assert.equal(gov.swarmCeos.length, 3);
  assert.ok(gov.weightedSwarmScore > 0);
  assert.equal(gov.swarmConsensus, "HOLD_DEFERRED");
});

test("evaluateAdversarialCase evaluates counter-bearish arguments", () => {
  const adv = evaluateAdversarialCase("AAPL", "BUY");
  assert.equal(adv.counterSignal, "BEARISH_COUNTER");
  assert.ok(adv.counterArguments.length > 0);
  assert.equal(adv.isTradeVetoedByAdversary, false);
});

test("getOpportunityRankings scores and ranks setups", () => {
  const opps = getOpportunityRankings(["AAPL", "BTC", "NIFTY50"]);
  assert.ok(opps.rankings.length >= 1);
  assert.ok(["TIER_1_PRIME", "TIER_2_SOLID", "TIER_3_WATCH"].includes(opps.topOpportunity.rankGrade));
});

test("getKnowledgeGraphData links macro nodes and sector impact chains", () => {
  const kg = getKnowledgeGraphData();
  assert.ok(kg.nodes.length >= 4);
  assert.ok(kg.impactChains.length >= 2);
});

test("getTreasuryBuckets partitions portfolio capital into 4 buckets", () => {
  const treasury = getTreasuryBuckets(100000);
  assert.equal(treasury.buckets.tradingCapital.amount, 50000);
  assert.equal(treasury.buckets.reserveCapital.amount, 30000);
  assert.equal(treasury.buckets.emergencyCapital.amount, 10000);
  assert.equal(treasury.buckets.profitVault.amount, 10000);
});

test("getShadowTradingStatus returns shadow execution benchmark status", () => {
  const shadow = getShadowTradingStatus();
  assert.equal(shadow.shadowPipelineStatus, "ACTIVE_BENCHMARKING");
  assert.ok(shadow.shadowRuns.length >= 2);
});

test("runHedgeFundCycle integrates Meta Governor, Opportunity Ranker, and Treasury Buckets", async () => {
  const paper = createPaperState({ account: { startingCash: 100000, cash: 100000 } });
  const orders = [];

  const status = await runHedgeFundCycle({ symbol: "AAPL", paper, orders });
  assert.ok(status.metaGovernor);
  assert.ok(status.opportunityRankings);
  assert.ok(status.treasuryBuckets);
  assert.ok(status.adversarialCase);
});
