import test from "node:test";
import assert from "node:assert/strict";
import {
  generateAll1000Strategies,
  queryStrategyMegafactory,
  searchStrategyMegafactory
} from "../src/strategy-megafactory-1000.mjs";

test("Strategy Megafactory generates 1,000+ structured quantitative strategies", () => {
  const all = generateAll1000Strategies();
  assert.ok(all.length >= 1000, `Expected >= 1000 strategies, got ${all.length}`);
  assert.equal(all.length, 1100);

  // Validate properties of first and last strategy
  const first = all[0];
  assert.equal(first.id, "STRAT_0001");
  assert.equal(typeof first.inSampleSharpe, "number");
  assert.ok(first.inSampleSharpe > 2.0);
  assert.ok(first.winRatePercent > 50.0);

  const last = all[all.length - 1];
  assert.equal(last.id, "STRAT_1100");
  assert.ok(last.robustnessScore > 80);
});

test("Query and search functions filter strategies across families and keywords", () => {
  const queryAll = queryStrategyMegafactory();
  assert.equal(queryAll.engineStatus, "MEGAFACTORY_CATALOG_ACTIVE");
  assert.equal(queryAll.totalCatalogedStrategies, 1100);

  const filterFamily = queryStrategyMegafactory({ family: "TREND_MOMENTUM" });
  assert.equal(filterFamily.matchedCount, 120);

  const searchRes = searchStrategyMegafactory("ORDER_FLOW");
  assert.ok(searchRes.resultsCount >= 100);
});
