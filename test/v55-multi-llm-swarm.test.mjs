import test from "node:test";
import assert from "node:assert/strict";
import { getMultiLlmSwarmStatus, routeLlmInquiry, run5ModelConsensusVote } from "../src/multi-llm-swarm-router-engine.mjs";

test("getMultiLlmSwarmStatus reports active Multi-LLM Swarm Router with 5 models", () => {
  const status = getMultiLlmSwarmStatus();
  assert.equal(status.swarmEngineStatus, "MULTI_LLM_SWARM_ROUTER_ONLINE");
  assert.equal(status.protocolVersion, "MULTI_LLM_CONSENSUS_V55");
  assert.equal(status.totalConnectedModelsCount, 5);
  assert.equal(status.consensusThresholdPercent, 80);
});

test("routeLlmInquiry routes query to specialized LLM with cost & latency estimation", () => {
  const route = routeLlmInquiry({
    prompt: "Calculate options gamma exposure for TSLA",
    preferredTaskType: "QUANT_MATH"
  });

  assert.equal(route.routingStatus, "LLM_INQUIRY_ROUTED_SUCCESS");
  assert.equal(route.selectedModel, "DEEPSEEK_R1_V3");
  assert.equal(route.provider, "DeepSeek");
  assert.ok(route.expectedLatencyMs > 0);
  assert.ok(route.routingHash.startsWith("0xLLM_ROUTE_"));
});

test("run5ModelConsensusVote evaluates 5 AI models and returns consensus verdict", () => {
  const res = run5ModelConsensusVote({
    symbol: "AAPL",
    marketContext: "BULL_TREND_CONFLUENCE"
  });

  assert.equal(res.consensusStatus, "5_MODEL_SWARM_CONSENSUS_COMPLETED");
  assert.equal(res.symbol, "AAPL");
  assert.equal(res.consensusVerdict, "STRONG_BUY_CONSENSUS_APPROVED");
  assert.equal(res.consensusPercent, "80%");
  assert.equal(res.modelVotes.length, 5);
});
