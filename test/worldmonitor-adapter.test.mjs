import test from "node:test";
import assert from "node:assert/strict";
import {
  worldmonitorAdapter,
  WorldMonitorIntelligenceAdapter,
  CII_COUNTRY_CONFIGS,
  STRATEGIC_CHOKEPOINTS,
  GEOPOLITICAL_HOTSPOTS
} from "../src/worldmonitor-intelligence-adapter.mjs";
import { executeSandboxedWorldMonitorIntel } from "../src/reviewed-source-adapters.mjs";
import { runFullIntelligenceScan } from "../src/source-bridges.mjs";
import { parseTelegramCommand, processTelegramCommand } from "../src/telegram-command-listener.mjs";

test("WorldMonitor adapter computes Country Instability Index (CII v8) matrix", () => {
  const cii = worldmonitorAdapter.getCiiMatrix();
  assert.ok(cii.totalTracked >= 15);
  assert.ok(cii.averageCii > 0 && cii.averageCii < 100);
  assert.ok(Array.isArray(cii.countries));

  // Verify critical nations exist with proper baseline weights
  const ua = cii.countries.find(c => c.code === "UA");
  const ir = cii.countries.find(c => c.code === "IR");
  const tw = cii.countries.find(c => c.code === "TW");
  const us = cii.countries.find(c => c.code === "US");

  assert.ok(ua, "UA should be present");
  assert.ok(ir, "IR should be present");
  assert.ok(tw, "TW should be present");
  assert.ok(us, "US should be present");

  assert.equal(us.baselineRisk, 5);
  assert.equal(us.eventMultiplier, 0.3);
  assert.ok(ua.score >= 50, "Ukraine should have elevated/high instability score");
  assert.ok(ir.score >= 45, "Iran should have elevated/high instability score");
});

test("WorldMonitor adapter calculates Global Risk Index and DEFCON Alert Posture", () => {
  const globalRisk = worldmonitorAdapter.computeGlobalRiskIndex();
  assert.ok(globalRisk.compositeRisk >= 0 && globalRisk.compositeRisk <= 100);
  assert.ok(globalRisk.defconLevel >= 1 && globalRisk.defconLevel <= 5);
  assert.ok(["CRITICAL", "HIGH", "ELEVATED", "NORMAL", "LOW"].includes(globalRisk.level));
  assert.ok(typeof globalRisk.threatPosture === "string");
  assert.ok(globalRisk.topHotspots.length > 0);
});

test("WorldMonitor evaluates Macro Asset Geopolitical Impact (Transmission Model)", () => {
  // Test Oil
  const oilImpact = worldmonitorAdapter.evaluateAssetImpact("OIL");
  assert.equal(oilImpact.symbol, "OIL");
  assert.ok(["BULLISH", "NEUTRAL"].includes(oilImpact.direction));
  assert.ok(oilImpact.geopoliticalBeta > 1.0, "Oil should have high positive geopolitical beta");
  assert.ok(oilImpact.transmissionChain.length >= 3);
  assert.ok(oilImpact.rationale.includes("Hormuz"));

  // Test Gold
  const goldImpact = worldmonitorAdapter.evaluateAssetImpact("GOLD");
  assert.equal(goldImpact.symbol, "GOLD");
  assert.ok(goldImpact.geopoliticalBeta > 1.0, "Gold safe-haven beta should be positive");

  // Test Bitcoin
  const btcImpact = worldmonitorAdapter.evaluateAssetImpact("BTC");
  assert.equal(btcImpact.symbol, "BTC");
  assert.ok(btcImpact.geopoliticalBeta > 0.4);

  // Test Tech/Semis (Taiwan Strait vulnerability)
  const nvdaImpact = worldmonitorAdapter.evaluateAssetImpact("NVDA");
  assert.equal(nvdaImpact.symbol, "NVDA");
  assert.ok(nvdaImpact.geopoliticalBeta < 0, "Semis should have negative geopolitical beta to Taiwan Strait tension");
  assert.ok(nvdaImpact.rationale.includes("Taiwan"));
});

test("WorldMonitor Dynamic Macro Risk Governor throttles leverage and tightens stops", () => {
  const governor = worldmonitorAdapter.calculateDynamicRiskGovernor();
  assert.equal(governor.success, true);
  assert.ok(governor.leverageMultiplier > 0 && governor.leverageMultiplier <= 1.0);
  assert.ok(governor.maxAllowedPortfolioLeverage <= 2.0);
  assert.ok(governor.stopLossDistanceFactor > 0 && governor.stopLossDistanceFactor <= 1.0);
  assert.ok(typeof governor.vetoAggressiveLongs === "boolean");
  assert.ok(governor.riskBufferSummary.length > 10);
});

test("Backward compatibility with executeSandboxedWorldMonitorIntel()", () => {
  const intel = executeSandboxedWorldMonitorIntel();
  assert.equal(intel.success, true);
  assert.equal(intel.adapter, "worldmonitor_sandboxed");
  assert.ok(typeof intel.globalRiskIndex === "number");
  assert.ok(typeof intel.geopoliticalRisk === "string");
  assert.ok(intel.marketSentimentScore >= 0 && intel.marketSentimentScore <= 1.0);
  assert.ok(intel.trackedHotspotsCount >= 5);
  assert.equal(intel.isolationBound, "READ_ONLY_INTELLIGENCE");
  assert.ok(intel.riskGovernor);
});

test("runFullIntelligenceScan includes rich dynamic worldmonitor signals", () => {
  const scan = runFullIntelligenceScan("BTC/USDT");
  const wm = scan.signals.worldmonitor;
  assert.ok(wm, "signals.worldmonitor must be populated");
  assert.equal(wm.status, "active");
  assert.ok(wm.geopoliticalRisk);
  assert.ok(wm.defconLevel >= 1 && wm.defconLevel <= 5);
  assert.ok(wm.threatPosture);
  assert.ok(wm.compositeRisk > 0);
  assert.ok(wm.assetImpact);
});

test("Telegram Bot recognizes /worldmonitor command and mobile keyboard button", async () => {
  // Mobile keyboard parsing
  const cmd = parseTelegramCommand("🌍 WorldMonitor Intel");
  assert.equal(cmd.command, "/worldmonitor");

  // Handler execution
  const parsed = parseTelegramCommand("/worldmonitor");
  const response = await processTelegramCommand(parsed);

  assert.ok(response.includes("WORLDMONITOR GEOPOLITICAL & MACRO INTEL"));
  assert.ok(response.includes("DEFCON LEVEL"));
  assert.ok(response.includes("TOP UNSTABLE NATIONS"));
  assert.ok(response.includes("STRATEGIC MARITIME CHOKEPOINTS"));
  assert.ok(response.includes("MACRO RISK GOVERNOR ENFORCEMENT"));
});

test("Telegram Bot evaluates asset-specific geopolitical impact via /worldmonitor OIL", async () => {
  const parsed = parseTelegramCommand("/worldmonitor OIL");
  const response = await processTelegramCommand(parsed);

  assert.ok(response.includes("ASSET IMPACT TRANSMISSION (OIL)"));
  assert.ok(response.includes("Directional Bias:"));
  assert.ok(response.includes("Beta:"));
});

test("WorldMonitor HTTP Endpoints respond on live server port 8787", async () => {
  // Test /api/worldmonitor/status
  const statusRes = await fetch("http://localhost:8787/api/worldmonitor/status");
  assert.equal(statusRes.status, 200);
  const status = await statusRes.json();
  assert.equal(status.success, true);
  assert.equal(status.status, "APPROVED_ACTIVE");
  assert.ok(status.snapshot.globalRiskIndex);

  // Test /api/worldmonitor/briefing
  const briefingRes = await fetch("http://localhost:8787/api/worldmonitor/briefing");
  assert.equal(briefingRes.status, 200);
  const briefing = await briefingRes.json();
  assert.equal(briefing.success, true);
  assert.ok(briefing.topVulnerableNations.length >= 5);
  assert.ok(briefing.strategicWaterways.length >= 4);

  // Test /api/worldmonitor/asset-impact (POST)
  const impactRes = await fetch("http://localhost:8787/api/worldmonitor/asset-impact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbol: "GOLD" })
  });
  assert.equal(impactRes.status, 200);
  const impact = await impactRes.json();
  assert.equal(impact.success, true);
  assert.equal(impact.symbol, "GOLD");
  assert.ok(impact.geopoliticalBeta > 1.0);

  // Test /api/worldmonitor/risk-governor
  const govRes = await fetch("http://localhost:8787/api/worldmonitor/risk-governor");
  assert.equal(govRes.status, 200);
  const gov = await govRes.json();
  assert.equal(gov.success, true);
  assert.ok(gov.maxAllowedPortfolioLeverage <= 2.0);
});
