import test from "node:test";
import assert from "node:assert/strict";
import { createStrategyState, evaluateDecision, registerStrategy } from "../src/strategy-lab.mjs";

test("strategy laboratory keeps a baseline WAIT strategy", () => {
  assert.equal(createStrategyState().strategies[0].id, "baseline-wait-v1");
});

test("new strategies start in research and cannot skip validation", () => {
  const strategy = registerStrategy(createStrategyState(), { name: "Momentum", hypothesis: "Momentum persists" });
  assert.equal(strategy.status, "research");
  assert.equal(strategy.validation.paper, "not_run");
});

test("decision protocol records WAIT without validated strategy evidence", () => {
  const state = createStrategyState();
  const decision = evaluateDecision(state, { symbol: "AAPL", quote: { source: "mock", updatedAt: new Date().toISOString() }, account: { drawdownPercent: 0, maxDrawdownPercent: 10 } });
  assert.equal(decision.action, "WAIT");
  assert.equal(decision.checks.find(check => check.name === "validated_strategy").passed, false);
});
