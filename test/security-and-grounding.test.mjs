import test from "node:test";
import assert from "node:assert/strict";
import { startPersistentPublicTunnelDaemon } from "../src/persistent-public-tunnel-daemon.mjs";
import { DASHBOARD } from "../src/dashboard.mjs";
import { HERMES_TOOL_REGISTRY } from "../src/hermes-agent-integration.mjs";
import { getMasterNexusStatus } from "../src/master-autonomous-nexus.mjs";

test("Security: Persistent public tunnel daemon is disabled by default", () => {
  const result = startPersistentPublicTunnelDaemon({ port: 8787 });
  assert.equal(result.status, "DISABLED_BY_SECURITY_POLICY");
  assert.equal(result.publicUrl, null);
});

test("Security & Grounding: Dashboard contains zero exposed secrets, tunnels, or fake claims", () => {
  const html = DASHBOARD;

  // No ephemeral public tunnel links
  assert.equal(html.includes("lhr.life"), false, "Dashboard must not contain ephemeral public tunnel links");
  assert.equal(html.includes("3bcfba236278b9"), false, "Dashboard must not contain hardcoded tunnel domain");

  // No live credential password input fields in browser forms
  assert.equal(html.includes('id="cfg_ALPACA_SECRET_KEY"'), false, "Dashboard must not have Alpaca secret key input");
  assert.equal(html.includes('id="cfg_BINANCE_SECRET_KEY"'), false, "Dashboard must not have Binance secret key input");
  assert.equal(html.includes('id="cfg_SUPABASE_ANON_KEY"'), false, "Dashboard must not have Supabase key input");
  assert.equal(html.includes('id="cfg_BANK_UPI_ID"'), false, "Dashboard must not have Bank UPI ID input");

  // No contradictory Live Cash option
  assert.equal(html.includes("LIVE CASH"), false, "Dashboard must not contradict paper mode with LIVE CASH option");
  assert.equal(html.includes("SIMULATED PAPER MODE"), true, "Dashboard must clearly show Simulated Paper Mode");

  // No fabricated UpsideOnly $75,000 prop claims
  assert.equal(html.includes("UpsideOnly"), false, "Dashboard must not contain UpsideOnly fantasy claims");
  assert.equal(html.includes("$75,000"), false, "Dashboard must not claim $75,000 prop capital");
  assert.equal(html.includes("100% ABSORBED BY COMPANY"), false, "Dashboard must not contain fictional marketing copy");

  // No phantom 1,100 strategies empty table
  assert.equal(html.includes("1,100 STRATEGIES INDEXED"), false, "Dashboard must not claim phantom 1,100 strategies");
  assert.equal(html.includes("VALIDATED QUANTITATIVE STRATEGY CATALOG"), true, "Dashboard must display authentic strategy catalog");

  // Tables are populated with real rows statically (not empty tbody)
  assert.equal(html.includes("sma_crossover"), true, "Strategy table must include SMA Crossover row");
  assert.equal(html.includes("rsi_mean_reversion"), true, "Strategy table must include RSI Mean Reversion row");
  assert.equal(html.includes("macd_trend"), true, "Strategy table must include MACD Trend row");
  assert.equal(html.includes("bollinger_bands"), true, "Strategy table must include Bollinger Bands row");
  assert.equal(html.includes("vwap_trend"), true, "Strategy table must include VWAP Trend row");
  assert.equal(html.includes("ml_ensemble"), true, "Strategy table must include ML Ensemble row");

  // Black swan table has real crisis rows
  assert.equal(html.includes("2008 Lehman Collapse"), true, "Black swan table must include 2008 Lehman Collapse row");
  assert.equal(html.includes("2020 COVID Flash Crash"), true, "Black swan table must include 2020 COVID row");
});

test("Security: Hermes LLM is decoupled from root terminal and shell execution", () => {
  assert.equal(HERMES_TOOL_REGISTRY.cloud_terminal, undefined, "Hermes must NOT have cloud_terminal tool");
  assert.equal(HERMES_TOOL_REGISTRY.cloud_browser, undefined, "Hermes must NOT have cloud_browser tool");
  assert.equal(HERMES_TOOL_REGISTRY.upside_predict, undefined, "Hermes must NOT have upside_predict tool");

  // Only safe analytical tools
  assert.ok(HERMES_TOOL_REGISTRY.technical_analysis, "Hermes has safe technical_analysis tool");
  assert.ok(HERMES_TOOL_REGISTRY.alpha_consensus, "Hermes has safe alpha_consensus tool");
  assert.ok(HERMES_TOOL_REGISTRY.fxfactory_shield, "Hermes has safe fxfactory_shield tool");
});

test("Grounding: Master Nexus status reports authentic paper trading architecture", () => {
  const status = getMasterNexusStatus();
  assert.equal(status.success, true);
  assert.equal(status.layer4_PaperExecutionEngine.executionMode, "SIMULATED_PAPER");
  assert.equal(status.layer4_PaperExecutionEngine.startingEquity, "$100,000 USD");
  assert.equal(status.layer5_GatewaysAndMonitoring.publicTunnel, "DISABLED (SECURITY POLICY)");
});
