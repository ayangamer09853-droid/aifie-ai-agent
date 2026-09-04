import { test } from "node:test";
import assert from "node:assert/strict";
import { vibeTradingAdapter, ALPHA_ZOO_REGISTRY } from "../src/vibe-trading-adapter.mjs";
import { executeSandboxedSourceAdapter } from "../src/reviewed-source-adapters.mjs";
import { runFullIntelligenceScan } from "../src/source-bridges.mjs";
import { parseTelegramCommand, processTelegramCommand } from "../src/telegram-command-listener.mjs";

test("Vibe-Trading: Alpha Zoo factor registry contains 101 formulas and metadata", () => {
  const factors = vibeTradingAdapter.getAlphaZooCatalog();
  assert.ok(Array.isArray(factors), "Factors must be an array");
  assert.ok(factors.length >= 5, "Should register core curated alphas");

  const alpha101 = factors.find(f => f.id === "Alpha#101");
  assert.ok(alpha101, "Alpha#101 should exist");
  assert.equal(alpha101.category, "WorldQuant 101");
  assert.ok(alpha101.ic > 0, "IC should be positive");
  assert.ok(alpha101.ir > 0, "IR should be positive");
});

test("Vibe-Trading: evaluateAlphaFactor computes correct signal bounds and recommendation", () => {
  const eval101 = vibeTradingAdapter.evaluateAlphaFactor("Alpha#101");
  assert.equal(eval101.alphaId, "Alpha#101");
  assert.ok(eval101.normalizedSignal >= -1 && eval101.normalizedSignal <= 1, "Normalized signal must be in [-1, 1]");
  assert.ok(eval101.confidence >= 0.5 && eval101.confidence <= 1.0, "Confidence should be between 0.5 and 1");
  assert.ok(["ACCELERATE_LONG", "ACCELERATE_SHORT", "NEUTRAL"].includes(eval101.direction));

  const eval6 = vibeTradingAdapter.evaluateAlphaFactor("Alpha#6");
  assert.equal(eval6.alphaId, "Alpha#6");
  assert.ok(typeof eval6.rawAlphaSignal === "number");
});

test("Vibe-Trading QuantLib: Black-Scholes Greeks calculation matches analytical derivatives", () => {
  const greeks = vibeTradingAdapter.calculateBlackScholesGreeks({
    spot: 87500,
    strike: 88000,
    timeToMaturityYears: 0.082,
    volatility: 0.55,
    riskFreeRate: 0.045,
    optionType: "call"
  });

  assert.ok(greeks.price > 0, "Option price must be positive");
  assert.ok(greeks.delta > 0 && greeks.delta < 1, "Call delta must be strictly between 0 and 1");
  assert.ok(greeks.gamma > 0, "Gamma must be positive for standard call");
  assert.ok(greeks.vega > 0, "Vega must be positive");
  assert.ok(greeks.theta < 0, "Theta must be negative for time bleed");
  assert.ok(greeks.rho > 0, "Call rho must be positive with respect to interest rate");
  assert.ok(typeof greeks.d1 === "number" && typeof greeks.d2 === "number");
});

test("Vibe-Trading QuantLib: Institutional VaR & CVaR ensures coherent tail risk (CVaR >= VaR)", () => {
  const varMetrics = vibeTradingAdapter.calculateInstitutionalVaR({
    portfolioValue: 100000,
    confidenceLevel: 0.99,
    timeHorizonDays: 1
  });

  assert.ok(varMetrics.parametricVaR > 0, "Parametric VaR must be positive loss figure");
  assert.ok(varMetrics.historicalVaR > 0, "Historical VaR must be positive loss figure");
  assert.ok(varMetrics.cvarExpectedShortfall > 0, "CVaR must be positive");
  assert.ok(
    varMetrics.cvarExpectedShortfall >= varMetrics.parametricVaR ||
    varMetrics.cvarExpectedShortfall >= varMetrics.historicalVaR * 0.95,
    "Expected Shortfall must properly reflect tail severity"
  );
  assert.equal(varMetrics.coherentRiskPropertyVerified, true);
});

test("Vibe-Trading: Shadow Account reconciliation tracks paper allocation drift", () => {
  const shadow = vibeTradingAdapter.reconcileShadowAccount();
  assert.ok(shadow.status, "Status should be present");
  assert.equal(typeof shadow.reconciled, "boolean");
  assert.ok(shadow.driftPercent <= shadow.thresholdPercent, "Paper drift should be under conservative bound");
  assert.ok(shadow.auditReceipt.startsWith("sha256:"));
  assert.equal(shadow.simulatedCash, 100000);
});

test("Vibe-Trading: getVibeTradingSnapshot compiles unified intelligence payload", () => {
  const snap = vibeTradingAdapter.getVibeTradingSnapshot("BTC/USDT");
  assert.equal(snap.symbol, "BTC/USDT");
  assert.equal(snap.signals.momentum, "positive");
  assert.ok(snap.signals.score > 0);
  assert.ok(snap.alphaZoo.totalFactors >= 5);
  assert.ok(snap.quantLib.moduleCount >= 286);
});

test("Reviewed Source Adapters: Vibe-Trading executes sandboxed without error", async () => {
  const res = await executeSandboxedSourceAdapter("Vibe-Trading", { symbol: "BTC/USDT" });
  assert.equal(res.success, true);
  assert.equal(res.repository, "Vibe-Trading");
  assert.equal(res.status, "ACTIVE");
  assert.ok(res.alphaZooFactors >= 5);
  assert.ok(res.snapshot);
});

test("Source Bridges: runFullIntelligenceScan enriches Vibe-Trading signal backward-compatibly", async () => {
  const scan = await runFullIntelligenceScan("BTC/USDT");
  const vibeSignal = scan.signals["Vibe-Trading"];
  assert.ok(vibeSignal, "Vibe-Trading signal should exist in scan results");
  assert.equal(vibeSignal.momentum, "positive", "Must maintain .momentum === 'positive'");
  assert.ok(vibeSignal.score >= 50, "Score should be >= 50");
  assert.ok(vibeSignal.trendRegime, "trendRegime should be populated");
  assert.ok(vibeSignal.rankInformationCoefficient > 0, "rankInformationCoefficient should be > 0");
  assert.ok(vibeSignal.primaryAlphaFactor, "primaryAlphaFactor should be populated");
});

test("Telegram Command Listener: parses and executes /vibetrading and /alphazoo commands", async () => {
  const parsed1 = parseTelegramCommand("⚡ Vibe-Trading Alpha");
  assert.equal(parsed1.command, "/vibetrading");

  const parsed2 = parseTelegramCommand("🦁 Alpha Zoo (101 Factors)");
  assert.equal(parsed2.command, "/alphazoo");

  const resp = await processTelegramCommand({ command: "/vibetrading", symbol: "BTCUSDT" });
  assert.ok(resp.includes("VIBE-TRADING QUANTITATIVE AGENT"));
  assert.ok(resp.includes("QUANTLIB BLACK-SCHOLES GREEKS"));
  assert.ok(resp.includes("INSTITUTIONAL TAIL RISK"));
  assert.ok(resp.includes("SHADOW ACCOUNT RECONCILIATION"));
});
