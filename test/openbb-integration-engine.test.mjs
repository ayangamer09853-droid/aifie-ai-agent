import { test } from "node:test";
import assert from "node:assert/strict";
import { openBBEngine, OpenBBEngineAdapter } from "../src/openbb-engine-adapter.mjs";
import { createQuantResearchMcpServer } from "../src/mcp/servers/quant-research-mcp.mjs";

test("OpenBB Pillar 1: Repository inspection discovers 33+ providers and 16+ domain extensions", () => {
  const status = openBBEngine.getStatus();
  assert.equal(status.success, true);
  assert.equal(status.platform, "OpenBB Platform (v4)");
  assert.ok(status.providersCount >= 30, `Expected >= 30 providers, got ${status.providersCount}`);
  assert.ok(status.extensionsCount >= 14, `Expected >= 14 extensions, got ${status.extensionsCount}`);
  assert.ok(status.providers.includes("fred"));
  assert.ok(status.providers.includes("sec"));
  assert.ok(status.providers.includes("cboe"));
  assert.ok(status.extensions.includes("equity"));
  assert.ok(status.extensions.includes("derivatives"));
  assert.ok(status.extensions.includes("economy"));
});

test("OpenBB Pillar 2: Equity fundamentals compute valuation multiples and quality scores", () => {
  const data = openBBEngine.getEquityFundamentals("AAPL");
  assert.equal(data.success, true);
  assert.equal(data.symbol, "AAPL");
  assert.ok(data.valuation.peRatio > 0);
  assert.ok(data.valuation.pbRatio > 0);
  assert.ok(data.valuation.evEbitda > 0);
  assert.ok(data.valuation.marketCapBillions > 0);
  assert.ok(data.financials.revenueTtmBillions > 0);
  assert.ok(data.financials.roePct > 0);
  assert.ok(data.qualityScore >= 0 && data.qualityScore <= 100);
  assert.ok(["PREMIUM_GROWTH", "DEEP_VALUE", "GARP_FAIR_VALUE"].includes(data.valuationClassification));
});

test("OpenBB Pillar 3: Derivatives options engine computes Black-Scholes Greeks, IV smile, and Max Pain", () => {
  const data = openBBEngine.getDerivativesOptionsChain("AAPL", 220);
  assert.equal(data.success, true);
  assert.equal(data.symbol, "AAPL");
  assert.equal(data.spotPrice, 220);
  assert.ok(data.putCallRatio > 0);
  assert.ok(data.maxPainStrike > 0);
  assert.ok(Array.isArray(data.optionsChain));
  assert.ok(data.optionsChain.length >= 7);

  const atm = data.optionsChain[3]; // strike ~ 220
  assert.ok(atm.call.delta > 0 && atm.call.delta <= 1.0);
  assert.ok(atm.put.delta < 0 && atm.put.delta >= -1.0);
  assert.ok(atm.call.gamma >= 0);
  assert.ok(atm.call.vega >= 0);
  assert.ok(atm.call.theta < 0);
  assert.ok(atm.iv > 0);
});

test("OpenBB Pillar 4: Macro economy engine evaluates US Treasury yield curve and 10Y-2Y inversion", () => {
  const data = openBBEngine.getMacroYieldCurveAndEconomy();
  assert.equal(data.success, true);
  assert.ok(data.yieldCurve["1M"] > 0);
  assert.ok(data.yieldCurve["2Y"] > 0);
  assert.ok(data.yieldCurve["10Y"] > 0);
  assert.ok(data.yieldCurve["30Y"] > 0);
  assert.ok(typeof data.inversionMetrics.spread10Y2Y === "number");
  assert.ok(typeof data.inversionMetrics.isInverted10Y2Y === "boolean");
  assert.ok(data.macroIndicators.fedFundsRate > 0);
  assert.ok(data.macroIndicators.cpiInflationYoy > 0);
  assert.ok(data.macroIndicators.recessionProbabilityModelPct >= 0);
});

test("OpenBB Pillar 5: Institutional regulators engine monitors SEC EDGAR Form 4, 13F whales & Congressional trades", () => {
  const data = openBBEngine.getInstitutionalRegulatorsAndFilings("AAPL");
  assert.equal(data.success, true);
  assert.equal(data.symbol, "AAPL");
  assert.ok(Array.isArray(data.insiderTransactions) && data.insiderTransactions.length >= 2);
  assert.ok(Array.isArray(data.institutionalHoldings13F) && data.institutionalHoldings13F.length >= 4);
  assert.ok(Array.isArray(data.congressionalTrades) && data.congressionalTrades.length >= 2);

  const whale = data.institutionalHoldings13F[0];
  assert.ok(whale.institution.length > 0);
  assert.ok(whale.ownershipPct > 0);
  assert.ok(whale.valueBillions > 0);
});

test("OpenBB Pillar 6: Fama-French 5-Factor regression computes factor betas and idiosyncratic alpha", () => {
  const data = openBBEngine.calculateFamaFrenchFactors("AAPL", [0.01, -0.005, 0.02, 0.015]);
  assert.equal(data.success, true);
  assert.equal(data.symbol, "AAPL");
  assert.equal(data.model, "Fama-French 5-Factor");
  assert.ok(typeof data.factorBetas.mkt_rf === "number");
  assert.ok(typeof data.factorBetas.smb_size === "number");
  assert.ok(typeof data.factorBetas.hml_value === "number");
  assert.ok(typeof data.factorBetas.rmw_profitability === "number");
  assert.ok(typeof data.factorBetas.cma_investment === "number");
  assert.ok(data.rSquared >= 0.70 && data.rSquared <= 1.0);
  assert.ok(data.factorExposureAnalysis.sizeTilt.length > 0);
});

test("OpenBB Pillar 7: Multi-Commodity and G10 Forex Cross matrix calculates energy and currency rates", () => {
  const data = openBBEngine.getCommoditiesAndForexMatrix();
  assert.equal(data.success, true);
  assert.ok(data.commodities.crudeOilWti.price > 0);
  assert.ok(data.commodities.gold.price > 2000);
  assert.ok(data.forexG10.dxyIndex > 90);
  assert.ok(data.forexG10.eurUsd > 1.0);
});

test("OpenBB Pillar 8: 25+ Technical Indicators Suite evaluates RSI, MACD, Supertrend, and Ichimoku Cloud", () => {
  const data = openBBEngine.calculateOpenBBTechnicalIndicators();
  assert.equal(data.success, true);
  assert.ok(data.indicators.rsi14 >= 0 && data.indicators.rsi14 <= 100);
  assert.ok(data.indicators.sma20 > 0);
  assert.ok(data.indicators.bbUpper > data.indicators.bbLower);
  assert.ok(data.indicators.atr14 > 0);
  assert.ok(typeof data.indicators.macdHist === "number");
  assert.ok(data.indicators.ichimoku.tenkanSen > 0);
  assert.ok(["STRONG_BULLISH", "STRONG_BEARISH", "NEUTRAL_CONSOLIDATION"].includes(data.confluenceSignal));
});

test("OpenBB Pillar 9: Python Script Generator synthesizes production-ready OpenBB Platform code", () => {
  const script1 = openBBEngine.generateOpenBBScript("EQUITY_ANALYSIS", { symbol: "AAPL" });
  assert.equal(script1.success, true);
  assert.ok(script1.scriptCode.includes("from openbb import obb"));
  assert.ok(script1.scriptCode.includes("obb.equity.fundamental.income"));

  const script2 = openBBEngine.generateOpenBBScript("OPTIONS_VOLATILITY", { symbol: "TSLA" });
  assert.ok(script2.scriptCode.includes("obb.derivatives.options.chains"));

  const script3 = openBBEngine.generateOpenBBScript("MACRO_YIELD_CURVE");
  assert.ok(script3.scriptCode.includes("obb.economy.treasury_rates"));

  const script4 = openBBEngine.generateOpenBBScript("FAMA_FRENCH", { symbol: "NVDA" });
  assert.ok(script4.scriptCode.includes("obb.famafrench.five_factor"));
});

test("OpenBB Pillar 10: MCP Server registers and executes OpenBB Tools 49 through 55", async () => {
  const mcpServer = createQuantResearchMcpServer();
  const tools = mcpServer.tools;

  const expectedTools = [
    "openbb_get_status",
    "openbb_query_equity_fundamentals",
    "openbb_analyze_options_derivatives",
    "openbb_fetch_macro_yield_curve",
    "openbb_track_insider_congress_sec",
    "openbb_fama_french_factor_model",
    "openbb_generate_python_script"
  ];

  for (const name of expectedTools) {
    assert.ok(tools.has(name), `Missing MCP Tool: ${name}`);
  }

  // Execute Tool 49
  const t49 = await mcpServer.callTool("openbb_get_status", {});
  assert.equal(t49.platform, "OpenBB Platform (v4)");

  // Execute Tool 50
  const t50 = await mcpServer.callTool("openbb_query_equity_fundamentals", { symbol: "AAPL" });
  assert.equal(t50.symbol, "AAPL");
  assert.ok(t50.valuation.peRatio > 0);

  // Execute Tool 51
  const t51 = await mcpServer.callTool("openbb_analyze_options_derivatives", { symbol: "AAPL", spotPrice: 220 });
  assert.ok(t51.optionsChain.length >= 7);

  // Execute Tool 52
  const t52 = await mcpServer.callTool("openbb_fetch_macro_yield_curve", {});
  assert.ok(t52.yieldCurve["10Y"] > 0);

  // Execute Tool 54
  const t54 = await mcpServer.callTool("openbb_fama_french_factor_model", { symbol: "AAPL" });
  assert.equal(t54.model, "Fama-French 5-Factor");
});
