// @ts-check
import test from "node:test";
import assert from "node:assert/strict";
import { AifieAgent } from "../src/agent/agent-runtime.mjs";
import { AifieAgentRegistry } from "../src/agent/agent-registry.mjs";
import { CriticAgent } from "../src/intelligence/critic-agent.mjs";
import { StrategyAgent } from "../src/intelligence/strategy-agent.mjs";

test("AifieAgent: executes standard plan -> execute -> evaluate -> store loop", async () => {
  let memoryStored = false;
  const agent = new AifieAgent({
    id: "test-agent-01",
    role: "RESEARCH",
    policy: {
      plan: async (task) => ({ action: "ANALYZE_SYMBOL", target: task.symbol })
    },
    evaluator: {
      evaluate: async (res) => ({ score: 0.95, passed: true })
    },
    memory: {
      store: async (record) => {
        memoryStored = true;
        assert.equal(record.task.symbol, "AAPL");
      }
    }
  });

  const outcome = await agent.run({ symbol: "AAPL" });
  assert.equal(outcome.agentId, "test-agent-01");
  assert.equal(outcome.evaluation.passed, true);
  assert.equal(memoryStored, true);
});

test("AifieAgentRegistry: initializes default ensemble and queries by role", () => {
  const registry = new AifieAgentRegistry();
  const criticAgents = registry.getByRole("CRITIC");
  assert.ok(criticAgents.length >= 1);

  const governor = registry.get("alfie-governor");
  assert.ok(governor);
  assert.equal(governor.role, "GOVERNOR");
});

test("CriticAgent: rejects trade with severe regime mismatch and high spread", async () => {
  const critic = new CriticAgent();

  const proposal = {
    strategy: "momentum-breakout-v1",
    symbol: "BTCUSDT",
    direction: "BUY",
    confidence: 0.55 // Marginal confidence
  };

  const context = {
    regime: "RANGE_CHOPPY", // Mismatch for momentum
    spreadPercent: 0.28,    // Excessive spread
    imminentHighImpactNews: true // News volatility risk
  };

  const critique = await critic.critiqueTradeProposal(proposal, context);
  assert.equal(critique.approved, false);
  assert.ok(critique.rejectionConviction >= 0.50);
  assert.ok(critique.reasonCodes.includes("REGIME_MISMATCH_CHOPPY"));
  assert.ok(critique.reasonCodes.includes("EXCESSIVE_SPREAD_PENALTY"));
  assert.ok(critique.reasonCodes.includes("IMMINENT_NEWS_VOLATILITY_RISK"));
});

test("CriticAgent: approves clean high-confidence proposal in aligned market", async () => {
  const critic = new CriticAgent();

  const proposal = {
    strategy: "trend-following-v2",
    symbol: "ETHUSDT",
    direction: "BUY",
    confidence: 0.88
  };

  const context = {
    regime: "TRENDING_BULL",
    spreadPercent: 0.03,
    imminentHighImpactNews: false,
    activeCorrelatedExposure: 0.10
  };

  const critique = await critic.critiqueTradeProposal(proposal, context);
  assert.equal(critique.approved, true);
  assert.ok(critique.rejectionConviction < 0.50);
  assert.ok(critique.confidenceAdjustment > 0.80);
});

test("StrategyAgent: generates standardized alpha proposal without sizing positions", async () => {
  const strategy = new StrategyAgent({ strategyName: "mean-reversion-rsi" });
  const signal = await strategy.generateSignal({ symbol: "SOLUSDT", features: { rsi: 28 } });

  assert.equal(signal.strategy, "mean-reversion-rsi");
  assert.equal(signal.symbol, "SOLUSDT");
  assert.equal(signal.direction, "BUY");
  assert.ok(signal.reasonCodes.includes("OVERSOLD_RSI"));

  const explanation = await strategy.explain(signal);
  assert.ok(explanation.summary.includes("mean-reversion-rsi"));
});
