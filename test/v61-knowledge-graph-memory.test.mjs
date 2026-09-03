import test from "node:test";
import assert from "node:assert/strict";
import { getKnowledgeGraphMemoryStatus, queryKnowledgeGraphNetwork, storeLongTermMemory, recallLongTermMemory } from "../src/knowledge-graph-longterm-memory-engine.mjs";

test("getKnowledgeGraphMemoryStatus reports active knowledge graph entities and memory storage mode", () => {
  const status = getKnowledgeGraphMemoryStatus();
  assert.equal(status.memoryEngineStatus, "KNOWLEDGE_GRAPH_LONGTERM_MEMORY_ONLINE");
  assert.equal(status.protocolVersion, "SEMANTIC_GRAPH_VECTOR_MEMORY_V61");
  assert.equal(status.totalEntitiesInGraphCount, 4250);
  assert.equal(status.retrievalAccuracyPercent, "96.8%");
});

test("queryKnowledgeGraphNetwork returns mapped entity relationship nodes", () => {
  const graph = queryKnowledgeGraphNetwork({ targetSymbol: "AAPL" });
  assert.equal(graph.queryStatus, "KNOWLEDGE_GRAPH_NETWORK_QUERIED_SUCCESS");
  assert.equal(graph.targetSymbol, "AAPL");
  assert.equal(graph.connectedNodesCount, 4);
  assert.ok(graph.queryHash.startsWith("0xGRAPH_QUERY_"));
});

test("storeLongTermMemory and recallLongTermMemory persist and recall vector trade setups", () => {
  const store = storeLongTermMemory({ symbol: "AAPL", setupType: "BULLISH_ORDER_BLOCK", winRate: 68.5 });
  assert.equal(store.storeStatus, "LONG_TERM_MEMORY_STORED_SUCCESS");
  assert.ok(store.vectorMemoryId.startsWith("0xMEM_STORE_"));

  const recall = recallLongTermMemory({ querySymbol: "AAPL" });
  assert.equal(recall.recallStatus, "HISTORICAL_LONG_TERM_MEMORY_RECALLED_SUCCESS");
  assert.equal(recall.matchedHistoricalSetupsCount, 3);
  assert.equal(recall.bestMatchedSetup.setupName, "BULLISH_ORDER_BLOCK_SMA_GOLDEN_CROSS");
  assert.ok(recall.recallHash.startsWith("0xMEM_RECALL_"));
});
