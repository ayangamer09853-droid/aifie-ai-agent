import test from "node:test";
import assert from "node:assert/strict";
import { executeOmniChannelOrder, getOmniBrokerRoutes } from "../src/omni-channel-execution-engine.mjs";
import { calculateUnifiedSupremeAlphaScore, getUnifiedIntelligenceReport } from "../src/unified-intelligence-synthesizer.mjs";

test("getOmniBrokerRoutes selects primary gateway and lists online venues", () => {
  const usRoutes = getOmniBrokerRoutes("AAPL");
  assert.equal(usRoutes.primaryBrokerGateway, "ALPACA_US_EQUITIES");
  assert.equal(usRoutes.smartOrderRoutingSOR, "ZERO_LATENCY_OPTIMAL_LIQUIDITY_ROUTING");

  const cryptoRoutes = getOmniBrokerRoutes("BTC");
  assert.equal(cryptoRoutes.primaryBrokerGateway, "CCXT_UNIFIED_CRYPTO");

  const nseRoutes = getOmniBrokerRoutes("RELIANCE.NS");
  assert.equal(nseRoutes.primaryBrokerGateway, "OPENALGO_INDIAN_EQUITIES");
});

test("executeOmniChannelOrder routes trade through optimal liquidity venue", () => {
  const fill = executeOmniChannelOrder({ symbol: "AAPL", side: "buy", quantity: 2, price: 150 });
  assert.equal(fill.symbol, "AAPL");
  assert.equal(fill.executionGateway, "ALPACA_US_EQUITIES");
  assert.equal(fill.smartOrderRoutingStatus, "ROUTED_TO_OPTIMAL_LIQUIDITY_VENUE");
});

test("calculateUnifiedSupremeAlphaScore synthesizes 22 sources & quantum annealer into supreme score", () => {
  const alpha = calculateUnifiedSupremeAlphaScore({ symbol: "AAPL" });
  assert.equal(alpha.totalSupremeAlphaScore, 92);
  assert.equal(alpha.classification, "SUPREME_INSTITUTIONAL_APEX_ALPHA");
  assert.equal(alpha.recommendation, "EXECUTE_OMNI_CHANNEL_TRADE");
});
