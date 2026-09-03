import test from "node:test";
import assert from "node:assert/strict";
import { getGlobalMarketUniverse, getInstrumentsByMarketType, scanOmniMarketUniverse } from "../src/global-omni-market-stock-universe.mjs";

test("getGlobalMarketUniverse reports 6 asset classes and 52 tracked instruments", () => {
  const universe = getGlobalMarketUniverse();
  assert.equal(universe.universeStatus, "GLOBAL_OMNI_MARKET_UNIVERSE_ACTIVE");
  assert.equal(universe.totalMarketsConnected, 6);
  assert.equal(universe.totalTrackedInstrumentsCount, 52);
  assert.ok(universe.marketCategories.US_EQUITIES);
  assert.ok(universe.marketCategories.INDIAN_EQUITIES_NSE_BSE);
  assert.ok(universe.marketCategories.FOREX_CURRENCIES);
  assert.ok(universe.marketCategories.CRYPTO_247);
  assert.ok(universe.marketCategories.COMMODITIES);
  assert.ok(universe.marketCategories.GLOBAL_INDICES);
});

test("getInstrumentsByMarketType returns specific market instruments and stock types", () => {
  const indian = getInstrumentsByMarketType("INDIAN_EQUITIES_NSE_BSE");
  assert.equal(indian.instruments.includes("RELIANCE.NS"), true);
  assert.equal(indian.instruments.includes("NIFTY50"), true);
  assert.ok(indian.stockTypes.includes("Blue-Chip Large Cap"));
});

test("scanOmniMarketUniverse scans all 6 markets across 52 instruments", () => {
  const scan = scanOmniMarketUniverse();
  assert.equal(scan.scanVerdict, "OMNI_MARKET_UNIVERSE_SCAN_COMPLETED");
  assert.equal(scan.totalMarketsScanned, 6);
  assert.equal(scan.totalInstrumentsScanned, 52);
});
