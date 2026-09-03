import test from "node:test";
import assert from "node:assert/strict";
import { getConnectedSourceStatus, runFullIntelligenceScan } from "../src/source-bridges.mjs";

test("getConnectedSourceStatus returns active bridge status for all 24 repositories", () => {
  const sources = getConnectedSourceStatus();
  assert.equal(sources.length, 24);
  for (const src of sources) {
    assert.equal(src.connected, true);
    assert.ok(typeof src.repository === "string");
    assert.ok(typeof src.role === "string");
    assert.ok(src.state.includes("connected"));
  }
});

test("runFullIntelligenceScan aggregates signals across all 24 connected sources", () => {
  const result = runFullIntelligenceScan("TSLA");
  assert.equal(result.symbol, "TSLA");
  assert.equal(result.totalSourcesConnected, 24);
  assert.equal(result.activeCount, 24);
  assert.ok(result.consensusScore >= 0);
  assert.ok(result.consensusVerdict);
  assert.ok(result.signals.TradingAgents);
  assert.ok(result.signals["Vibe-Trading"]);
  assert.ok(result.signals.worldmonitor);
  assert.ok(result.signals.OpenBB);
  assert.ok(result.signals.Kronos);
  assert.ok(result.signals.nautilus_trader);
  assert.ok(result.signals.MiroFish);
  assert.ok(result.signals.QuantDinger);
  assert.ok(result.signals.openclaw);
  assert.ok(result.signals.semantica);
  assert.ok(result.signals["TradingView-API"]);
  assert.ok(result.signals.ccxt);
  assert.ok(result.signals.questdb);
  assert.ok(result.signals.FinanceToolkit);
  assert.ok(result.signals.openalgo);
  assert.ok(result.signals["hermes-agent"]);
  assert.ok(result.signals["vercel-skills"]);
});
