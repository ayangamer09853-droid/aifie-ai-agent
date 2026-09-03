import test from "node:test";
import assert from "node:assert/strict";
import { getThoughtDecisionGraphStatus, ingestUserThoughtDecision, linkThoughtToDecision, queryUserThoughtGraph } from "../src/thought-decision-knowledge-graph-engine.mjs";

test("getThoughtDecisionGraphStatus reports active thought decision graph status", () => {
  const status = getThoughtDecisionGraphStatus();
  assert.equal(status.thoughtGraphStatus, "THOUGHT_DECISION_KNOWLEDGE_GRAPH_ONLINE");
  assert.equal(status.protocolVersion, "USER_THOUGHT_CAUSALITY_GRAPH_V63");
  assert.equal(status.totalThoughtsIngestedCount, 382);
  assert.equal(status.graphStorageMode, "VECTOR_SQLITE_CAUSALITY_GRAPH_V63");
});

test("ingestUserThoughtDecision ingests strategic thoughts and returns node ID", () => {
  const ingest = ingestUserThoughtDecision({ category: "STRATEGY_IDEA", thoughtText: "Accumulate AAPL pre-earnings dip", symbol: "AAPL" });
  assert.equal(ingest.ingestStatus, "USER_THOUGHT_INGESTED_SUCCESS");
  assert.equal(ingest.symbol, "AAPL");
  assert.ok(ingest.nodeId.startsWith("0xNODE_THOUGHT_"));
});

test("linkThoughtToDecision and queryUserThoughtGraph link causality and query matching thoughts", () => {
  const link = linkThoughtToDecision({ thoughtNodeId: "0xNODE_THOUGHT_123", decisionAction: "BUY", targetSymbol: "AAPL" });
  assert.equal(link.linkStatus, "THOUGHT_LINKED_TO_DECISION_SUCCESS");
  assert.ok(link.linkHash.startsWith("0xLINK_DECISION_"));

  const query = queryUserThoughtGraph({ queryKeyword: "AAPL" });
  assert.equal(query.queryStatus, "USER_THOUGHT_GRAPH_QUERIED_SUCCESS");
  assert.equal(query.matchedNodesCount, 2);
  assert.equal(query.matchedNodes[0].symbol, "AAPL");
  assert.ok(query.queryHash.startsWith("0xQUERY_THOUGHT_"));
});
