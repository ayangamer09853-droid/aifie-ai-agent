import test from "node:test";
import assert from "node:assert/strict";
import { getIncomeStreamsOverview, harvestAllIncomeStreams } from "../src/multi-income-streams-engine.mjs";

test("getIncomeStreamsOverview reports 8 distinct revenue streams", () => {
  const overview = getIncomeStreamsOverview();
  assert.equal(overview.engineStatus, "MULTI_INCOME_STREAMS_ACTIVE_PAPER_SIMULATION");
  assert.equal(overview.totalActiveStreamsCount, 8);
  assert.equal(overview.estimatedDailyRevenueUSD, "$0.00 (Paper Simulation Mode)");
  assert.equal(overview.incomeStreams.length, 8);
});

test("harvestAllIncomeStreams collects daily multi-stream revenue into profit vault", () => {
  const harvest = harvestAllIncomeStreams();
  assert.equal(harvest.harvestStatus, "PAPER_SIMULATION_ZERO_REAL_MONEY_HARVESTED");
  assert.equal(harvest.realizedDailyHarvestUSD, "$0.00");
});
