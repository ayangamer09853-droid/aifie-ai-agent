import test from "node:test";
import assert from "node:assert/strict";
import {
  getHermesAgentStatus,
  parseHermesOutput,
  runHermesAutonomousAgent,
  hermesSynthesizeSkill,
  HERMES_TOOL_REGISTRY
} from "../src/hermes-agent-integration.mjs";

test("getHermesAgentStatus returns Hermes-3 architecture and active skills", () => {
  const status = getHermesAgentStatus();
  assert.equal(status.success, true);
  assert.equal(status.agentName, "NousResearch/Hermes-3-Agent");
  assert.equal(status.status, "ONLINE_ACTIVE");
  assert.ok(status.totalLearnedSkills >= 4);
  assert.ok(status.availableTools.includes("cloud_terminal"));
  assert.ok(status.availableTools.includes("alpha_consensus"));
  assert.ok(status.availableTools.includes("upside_predict"));
  assert.ok(status.availableTools.includes("fxfactory_shield"));
});

test("parseHermesOutput parses <thought> and <tool_call> JSON tokens", () => {
  const sampleText = `<thought>I need to check BTC/USDT alpha score.</thought>\n<tool_call>{"name": "alpha_consensus", "arguments": {"symbol": "BTC/USDT"}}</tool_call>`;
  const parsed = parseHermesOutput(sampleText);
  assert.equal(parsed.thought, "I need to check BTC/USDT alpha score.");
  assert.ok(parsed.toolCall);
  assert.equal(parsed.toolCall.name, "alpha_consensus");
  assert.equal(parsed.toolCall.arguments.symbol, "BTC/USDT");
});

test("HERMES_TOOL_REGISTRY tools execute cleanly", async () => {
  // Test cloud terminal tool
  const termRes = await HERMES_TOOL_REGISTRY.cloud_terminal.handler({ command: "echo Hermes Online" });
  assert.equal(termRes.success, true);
  assert.match(termRes.stdout, /Hermes Online/);

  // Test alpha consensus tool
  const acRes = await HERMES_TOOL_REGISTRY.alpha_consensus.handler({ symbol: "BTC/USDT" });
  assert.equal(acRes.success, true);
  assert.equal(acRes.alphaVectors.length, 6);

  // Test fxfactory shield tool
  const fxfRes = await HERMES_TOOL_REGISTRY.fxfactory_shield.handler({ asset: "BTC/USDT" });
  assert.equal(fxfRes.isShieldActive, false);

  // Test upside predict tool
  const uoRes = await HERMES_TOOL_REGISTRY.upside_predict.handler({
    symbol: "BTC/USDT",
    direction: "BULLISH",
    convictionScore: 90.0
  });
  assert.equal(uoRes.success, true);
  assert.equal(uoRes.prediction.bayesShieldApproval, "EXECUTED_WITH_PROP_CAPITAL");
});

test("runHermesAutonomousAgent executes multi-step reasoning loop and records memory", async () => {
  const goal = "Audit FxFactory calendar, check Alpha Consensus, and deploy UpsideOnly prediction";
  const result = await runHermesAutonomousAgent({ goal, maxIterations: 3 });

  assert.equal(result.success, true);
  assert.equal(result.agent, "NousResearch/Hermes-3-Agent");
  assert.equal(result.status, "COMPLETED_SUCCESS");
  assert.ok(result.iterationsCount >= 3);
  assert.ok(result.finalAnswer.includes("Hermes Agent"));

  // Check trace steps
  const thoughts = result.executionTrace.filter(t => t.thought);
  assert.ok(thoughts.length >= 2);

  // Check episodic memory updated
  const statusAfter = getHermesAgentStatus();
  assert.ok(statusAfter.totalMemories >= 2);
});

test("hermesSynthesizeSkill dynamically adds and persists a new skill", () => {
  const initialCount = getHermesAgentStatus().totalLearnedSkills;
  const res = hermesSynthesizeSkill({
    name: "Cross-DEX Arbitrage Sweeper",
    category: "DEFI_MEV",
    description: "Autonomously detects and sweeps multi-hop DEX liquidity discrepancies."
  });

  assert.equal(res.success, true);
  assert.equal(res.skill.name, "Cross-DEX Arbitrage Sweeper");
  assert.equal(res.totalLearnedSkills, initialCount + 1);

  const statusAfter = getHermesAgentStatus();
  assert.ok(statusAfter.skills.some(s => s.name === "Cross-DEX Arbitrage Sweeper"));
});
