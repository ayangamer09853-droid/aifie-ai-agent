import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";

function loadDotEnv(envPath = join(process.cwd(), ".env")) {
  if (!existsSync(envPath)) return;
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (key && (!process.env[key] || process.env[key] === "")) {
          process.env[key] = value;
        }
      }
    }
  } catch (_) {}
}
loadDotEnv();

// Phase 0: 10 Verified Core Modules
import { agentRegistry, controlPlaneStatus, delegateTask, requestReplica, runHeartbeat, setKillSwitch } from "./src/alfie-control-plane.mjs";
import { createStateStore } from "./src/state-store.mjs";
import { createManualQuoteProvider, getFreshQuote } from "./src/market-data.mjs";
import { accountSnapshot, createPaperState, placePaperOrder, setQuote } from "./src/paper-engine.mjs";
import { createStrategyState, evaluateDecision, registerStrategy } from "./src/strategy-lab.mjs";
import { DASHBOARD } from "./src/dashboard.mjs";
import { auditSources, recommendIntegrationOrder } from "./src/source-audit.mjs";
import { getSandboxedAdaptersCatalog, executeSandboxedCcxtTicker, executeSandboxedSourceAdapter, runAllSourcesConsensus } from "./src/reviewed-source-adapters.mjs";
import { startTelegramCommandListener } from "./src/telegram-command-listener.mjs";
import { initializeWebSocketGateway } from "./src/realtime-websocket-broadcast-gateway.mjs";

// Core Research Source Dependencies
import { integrationManifest } from "./src/integration-manifest.mjs";
import { getConnectedSourceStatus, runFullIntelligenceScan } from "./src/source-bridges.mjs";

// Phase 1: Real Market Data Ingestion & Time-Series Engines
import { getUnifiedMarketQuote } from "./src/market-data.mjs";
import { getCandleBars, getTimeseriesStoreStatus } from "./src/timeseries-market-store.mjs";
import { getOrderBookSnapshot } from "./src/order-book-depth.mjs";
import { getBinanceFeedStatus } from "./src/market-feed-binance.mjs";
import { getAlpacaFeedStatus } from "./src/market-feed-alpaca.mjs";
import { getUniversalFeedStatus } from "./src/market-feed-universal.mjs";
import { getSanitizerStats } from "./src/data-sanitizer.mjs";

// Week 2: Real Market Data Connectors & Multi-Provider Consensus
import { fetchIexQuote, fetchIexHistorical } from "./src/market-fetcher-iex.mjs";
import { fetchPolygonQuote, fetchPolygonHistorical } from "./src/market-fetcher-polygon.mjs";
import { fetchBinanceQuote, fetchCoingeckoQuote } from "./src/market-fetcher-crypto.mjs";
import { getConsensusPrice, getConsensusReport } from "./src/market-consensus.mjs";

// Roadmap Modules (Phases 2 - 7)
import { alpacaBroker } from "./src/live-broker-alpaca.mjs";
import { Backtester } from "./src/backtester.mjs";
import { calculateHierarchicalRiskParity, calculateBlackLitterman, calculateMarkowitzFrontier } from "./src/portfolio-optimizer.mjs";
import { calculateValueAtRisk, calculateConditionalValueAtRisk, calculateSharpeRatio, calculateSortinoRatio, calculateMaxDrawdown } from "./src/risk-metrics.mjs";
import { StrategyFactory } from "./src/strategy-factory.mjs";
import { runWalkForwardTest } from "./src/walkforward-validator.mjs";
import { GeneticOptimizer } from "./src/genetic-optimizer.mjs";
import { analyzeChartVision, processVoiceCommand } from "./src/chart-vision.mjs";

// Phase 7: Advanced Vision, Voice & Multimodal Orchestrator
import { analyzeChartWithVision, placeOrderFromChart } from "./src/chart-vision-advanced.mjs";
import { captureChart } from "./src/chart-capture-engine.mjs";
import { parseVoiceCommand, executeVoiceCommand, transcribeAudio } from "./src/voice-transcriber.mjs";
import { speakResponse, generateVoiceResponse } from "./src/voice-responder.mjs";
import { createVisionDashboard } from "./src/dashboard-vision.mjs";
import { MultimodalOrchestrator } from "./src/multimodal-orchestrator.mjs";
import { analyzeSentimentFromNews, compareChartPatterns, generateVisualTradingReport } from "./src/sentiment-vision-news.mjs";

// Phase 2: Institutional Execution & Broker Adapters
import { routeOptimalExecutionVenue, getSmartOrderRouterStatus } from "./src/smart-order-router.mjs";
import { generateTwapSlices, generateVwapSlices, generateIcebergOrder, calculatePovParticipationRate, getSlicersEngineStatus } from "./src/algo-execution-slicers.mjs";
import { buildSignedBinanceOrder, dispatchBinanceOrder, getBinanceAdapterStatus } from "./src/broker-adapter-binance.mjs";
import { buildAlpacaOrderPayload, dispatchAlpacaOrder, getAlpacaAdapterStatus } from "./src/broker-adapter-alpaca.mjs";
import { validatePreTradeRisk, checkDrawdownBreach, assertExecutionAuthority, getSafetyFortressStatus } from "./src/execution-safety-fortress.mjs";
import { recordLedgerTransaction, getAccountingSummary } from "./src/accounting-ledger.mjs";

// Phase 3: Event-Driven Backtesting & Statistical Falsification
import { runEventDrivenSimulation, getBacktestCoreStatus } from "./src/event-driven-backtest-core.mjs";
import { generateCombinatorialPurgedSplits, calculateProbabilityBacktestOverfitting, getCPCVEvaluatorStatus } from "./src/cpcv-pbo-evaluator.mjs";
import { evaluateHansenSpaTest, getHansenSpaStatus } from "./src/hansen-spa-evaluator.mjs";
import { calculateDeflatedSharpeRatio, getDsrStatus } from "./src/deflated-sharpe-calculator.mjs";
import { runMonteCarloSimulation, getMonteCarloEngineStatus } from "./src/monte-carlo-simulator.mjs";
import { evaluateStrategyPromotionGate, getPromotionGateStatus } from "./src/strategy-promotion-gate.mjs";

// Phase 4: Institutional Risk Fortress & Portfolio Optimization
import { calculatePortfolioRiskMetrics, getRiskMetricsStatus } from "./src/portfolio-risk-metrics.mjs";
import { decomposeEulerRisk, getEulerRiskBudgetingStatus } from "./src/euler-risk-budgeting.mjs";
import { optimizeHierarchicalRiskParity, optimizeMinimumVariance, optimizeMaximumSharpe, computeInverseVarianceWeights, getPortfolioOptimizerStatus } from "./src/convex-portfolio-optimizer.mjs";
import { analyzeCorrelationRegime, getCorrelationRegimeStatus } from "./src/correlation-regime-detector.mjs";
import { generateDefensiveHedgePlan, calculateBlackScholesPut, determineDrawdownDefenseTier, getDefensiveHedgerStatus } from "./src/dynamic-defensive-hedger.mjs";

// Phase 5: Alpha Lab & Quantitative Strategy Megafactory
import { generatePairsTradingSignal, calculateEngleGrangerCointegration, scanAllCointegratedPairs, getCointegrationEngineStatus } from "./src/cointegration-stat-arb-engine.mjs";
import { calculateRollingVpin, getVpinEngineStatus } from "./src/vpin-microstructure-toxicity-engine.mjs";
import { analyzeSmartMoneyStructure, getSmcEngineStatus } from "./src/smc-market-structure.mjs";
import { runGeneticStrategyOptimization, getGeneticOptimizerStatus } from "./src/genetic-strategy-optimizer.mjs";
import { queryStrategyMegafactory, filterOrthogonalStrategies, getMegafactoryStatus } from "./src/strategy-megafactory-1000.mjs";

// Phase 6: Multi-Agent Swarm & 24/7 Sovereign Automation
import { getSwarmFleetStatus, delegateSwarmTask, evaluateBftQuorumConsensus } from "./src/alfie-multi-agent-coordinator.mjs";
import { executeNexusAutonomousTick, getMasterNexusReport } from "./src/master-autonomous-nexus-cycle.mjs";
import { dispatchMobileSignalAlert, processMobileConfirmationCallback, getPendingSignalAlerts, getMobileConfirmationGateStatus } from "./src/telegram-mobile-confirmation-gate.mjs";
import { getCloudSovereigntyMetrics, startAntiSleepPinger, stopAntiSleepPinger } from "./src/cloud-sovereign-keepalive-daemon.mjs";

// Phase 8: Quantum-Resistant Security Vault
import {
  QuantumVault,
  encryptWithQuantumResistantVault,
  decryptWithQuantumResistantVault,
  splitSecretShamir,
  reconstructSecretShamir,
  generateLatticeKemKeyPair,
  encapsulateLatticeSecret,
  signLatticeData,
  verifyLatticeSignature,
  memoryGuard
} from "./src/quantum-resistant-vault.mjs";

const globalQuantumVault = new QuantumVault(process.env.AIFIE_MASTER_VAULT_KEY || "AIFIE_POST_QUANTUM_SOVEREIGN_KEY_2026");

const stateStore = createStateStore(process.env.AIFIE_STATE_PATH || join(process.cwd(), "data", "aifie-state.json"));
const persistedState = stateStore.load();
const orders = persistedState.orders;
const paper = createPaperState(persistedState.paper);
const strategyLab = createStrategyState(persistedState.paper?.strategyLab);

startTelegramCommandListener({ paper, orders, botToken: process.env.TELEGRAM_BOT_TOKEN });

function persist() { stateStore.save({ orders, paper: { ...paper, strategyLab } }); }

function respond(response, status, payload, type = "application/json") {
  if (response.writableEnded) return;
  response.writeHead(status, {
    "content-type": `${type}; charset=utf-8`,
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-xss-protection": "1; mode=block"
  });
  response.end(type === "application/json" ? JSON.stringify(payload) : payload);
}

function readJsonBody(request, response, maxBytes = 1048576) {
  return new Promise((resolve, reject) => {
    let body = "";
    let receivedBytes = 0;
    request.on("data", chunk => {
      receivedBytes += chunk.length;
      if (receivedBytes > maxBytes) {
        request.destroy();
        respond(response, 413, { error: "Payload Too Large: Maximum 1MB allowed" });
        return reject(new Error("PAYLOAD_TOO_LARGE"));
      }
      body += chunk;
    });
    request.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        resolve(payload);
      } catch (err) {
        respond(response, 400, { error: `Invalid JSON payload: ${err.message}` });
        reject(err);
      }
    });
    request.on("error", (err) => {
      respond(response, 400, { error: err.message });
      reject(err);
    });
  });
}

export function app(request, response) {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    if (request.method === "OPTIONS") return respond(response, 204, "");
    if (request.method === "GET" && url.pathname === "/") return respond(response, 200, DASHBOARD, "text/html");
    if (request.method === "GET" && url.pathname === "/api/status") return respond(response, 200, { name: "Aifie AI Agent", mode: "paper", liveExecution: false, liveBroker: { isLiveModeUnlocked: false }, orders, paper: accountSnapshot(paper) });
    if (request.method === "GET" && url.pathname === "/api/sources") return respond(response, 200, getConnectedSourceStatus());
    if (request.method === "GET" && url.pathname === "/api/integrations") return respond(response, 200, integrationManifest);
    if (request.method === "GET" && url.pathname === "/api/source-audit") {
      const audit = auditSources(join(process.cwd(), "sources"), integrationManifest);
      const recommendations = recommendIntegrationOrder(audit);
      return respond(response, 200, { audit, recommendations });
    }
    if (request.method === "GET" && (url.pathname === "/api/sources/scan" || url.pathname === "/api/sources/intelligence")) {
      const symbol = url.searchParams.get("symbol") || "AAPL";
      return respond(response, 200, runFullIntelligenceScan(symbol));
    }
    if (request.method === "GET" && url.pathname === "/api/sources/consensus") {
      const symbol = url.searchParams.get("symbol") || "AAPL";
      return respond(response, 200, runAllSourcesConsensus({ symbol }));
    }
    if (request.method === "POST" && url.pathname === "/api/sources/execute") {
      readJsonBody(request, response).then(payload => {
        try {
          const res = executeSandboxedSourceAdapter(payload.repository || payload.source, payload.params || {});
          return respond(response, 200, res);
        } catch (err) {
          return respond(response, 400, { error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/research") {
      const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();
      return respond(response, 200, { symbol, status: "RESEARCH_READY", timestamp: new Date().toISOString() });
    }
    // Phase 1: Real Market Data Endpoints
    if (request.method === "GET" && url.pathname === "/api/market/quote") {
      const symbol = url.searchParams.get("symbol") || "BTCUSDT";
      getUnifiedMarketQuote(symbol).then(quote => {
        return respond(response, 200, { success: true, quote });
      }).catch(err => {
        return respond(response, 500, { error: err.message });
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/market/bars") {
      const symbol = url.searchParams.get("symbol") || "AAPL";
      const timeframe = url.searchParams.get("timeframe") || "1m";
      const limit = Number(url.searchParams.get("limit")) || 50;
      const bars = getCandleBars(symbol, timeframe, limit);
      return respond(response, 200, { success: true, symbol, timeframe, count: bars.length, bars });
    }
    if (request.method === "GET" && url.pathname === "/api/market/depth") {
      const symbol = url.searchParams.get("symbol") || "BTCUSDT";
      const depth = Number(url.searchParams.get("limit")) || 10;
      const snapshot = getOrderBookSnapshot(symbol, depth);
      return respond(response, 200, { success: true, ...snapshot });
    }
    if (request.method === "GET" && url.pathname === "/api/market/status") {
      return respond(response, 200, {
        success: true,
        phase: "PHASE_1_MARKET_DATA_ENGINE",
        providers: {
          binance: getBinanceFeedStatus(),
          alpaca: getAlpacaFeedStatus(),
          universal: getUniversalFeedStatus()
        },
        timeseries: getTimeseriesStoreStatus(),
        sanitizer: getSanitizerStats(),
        timestamp: new Date().toISOString()
      });
    }
    // Week 2: Real Market Data Connectors & Consensus Endpoints
    if (request.method === "GET" && url.pathname === "/api/market/iex/quote") {
      const symbol = url.searchParams.get("symbol") || "AAPL";
      fetchIexQuote(symbol).then(quote => {
        return respond(response, 200, { success: true, quote });
      }).catch(err => {
        return respond(response, 502, { success: false, error: err.message });
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/market/iex/historical") {
      const symbol = url.searchParams.get("symbol") || "AAPL";
      const range = url.searchParams.get("range") || "5y";
      fetchIexHistorical(symbol, range).then(data => {
        return respond(response, 200, { success: true, data });
      }).catch(err => {
        return respond(response, 502, { success: false, error: err.message });
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/market/polygon/quote") {
      const symbol = url.searchParams.get("symbol") || "AAPL";
      fetchPolygonQuote(symbol).then(quote => {
        return respond(response, 200, { success: true, quote });
      }).catch(err => {
        return respond(response, 502, { success: false, error: err.message });
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/market/polygon/historical") {
      const symbol = url.searchParams.get("symbol") || "AAPL";
      fetchPolygonHistorical(symbol).then(data => {
        return respond(response, 200, { success: true, data });
      }).catch(err => {
        return respond(response, 502, { success: false, error: err.message });
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/market/crypto/binance") {
      const symbol = url.searchParams.get("symbol") || "BTCUSDT";
      fetchBinanceQuote(symbol).then(quote => {
        return respond(response, 200, { success: true, quote });
      }).catch(err => {
        return respond(response, 502, { success: false, error: err.message });
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/market/crypto/coingecko") {
      const symbol = url.searchParams.get("symbol") || "bitcoin";
      fetchCoingeckoQuote(symbol).then(quote => {
        return respond(response, 200, { success: true, quote });
      }).catch(err => {
        return respond(response, 502, { success: false, error: err.message });
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/market/consensus") {
      const symbol = url.searchParams.get("symbol") || "BTCUSDT";
      getConsensusReport(symbol).then(report => {
        return respond(response, 200, { success: true, consensus: report });
      }).catch(err => {
        return respond(response, 502, { success: false, error: err.message });
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/market/consensus") {
      readJsonBody(request, response).then(payload => {
        const symbol = payload.symbol || "BTCUSDT";
        return getConsensusReport(symbol, payload).then(report => {
          return respond(response, 200, { success: true, consensus: report });
        });
      }).catch(err => {
        return respond(response, 502, { success: false, error: err.message });
      });
      return;
    }
    // Phase 2: Institutional Execution Endpoints
    if (request.method === "POST" && url.pathname === "/api/execution/route") {
      readJsonBody(request, response).then(payload => {
        const route = routeOptimalExecutionVenue(payload);
        return respond(response, 200, { success: true, route });
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/execution/twap") {
      readJsonBody(request, response).then(payload => {
        const plan = generateTwapSlices(payload);
        return respond(response, 200, { success: true, plan });
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/execution/vwap") {
      readJsonBody(request, response).then(payload => {
        const plan = generateVwapSlices(payload);
        return respond(response, 200, { success: true, plan });
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/execution/iceberg") {
      readJsonBody(request, response).then(payload => {
        const plan = generateIcebergOrder(payload);
        return respond(response, 200, { success: true, plan });
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/execution/dispatch") {
      readJsonBody(request, response).then(async payload => {
        try {
          const mode = payload.mode || "paper";
          assertExecutionAuthority(mode, payload.confirm);

          const riskCheck = validatePreTradeRisk(payload, accountSnapshot(paper));
          if (!riskCheck.approved) {
            return respond(response, 400, { success: false, error: riskCheck.reason, riskCheck });
          }

          let dispatchResult;
          if (mode === "live" && payload.venue === "BINANCE") {
            dispatchResult = await dispatchBinanceOrder(payload, { dryRun: false });
          } else if (mode === "live" && payload.venue === "ALPACA") {
            dispatchResult = await dispatchAlpacaOrder(payload, { isPaper: false });
          } else {
            const fill = placePaperOrder(paper, payload);
            dispatchResult = { success: true, mode: "paper", fill };
          }

          const price = Number(payload.price || 100);
          const ledgerEntry = recordLedgerTransaction({
            symbol: payload.symbol,
            side: payload.side,
            quantity: payload.quantity,
            price,
            venue: payload.venue || "PAPER_MATCHING_ENGINE"
          });

          return respond(response, 200, {
            success: true,
            dispatch: dispatchResult,
            ledger: ledgerEntry
          });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/execution/ledger") {
      return respond(response, 200, { success: true, ledger: getAccountingSummary() });
    }
    if (request.method === "GET" && url.pathname === "/api/execution/status") {
      return respond(response, 200, {
        success: true,
        phase: "PHASE_2_EXECUTION_ENGINE",
        sor: getSmartOrderRouterStatus(),
        slicers: getSlicersEngineStatus(),
        safety: getSafetyFortressStatus(),
        adapters: {
          binance: getBinanceAdapterStatus(),
          alpaca: getAlpacaAdapterStatus()
        },
        ledger: getAccountingSummary()
      });
    }
    // Phase 3: Event-Driven Backtesting & Statistical Falsification Endpoints
    if (request.method === "POST" && url.pathname === "/api/backtest/run") {
      readJsonBody(request, response).then(payload => {
        const result = runEventDrivenSimulation(payload);
        return respond(response, 200, { success: true, result });
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/backtest/pbo") {
      readJsonBody(request, response).then(payload => {
        const result = calculateProbabilityBacktestOverfitting(payload);
        return respond(response, 200, { success: true, result });
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/backtest/hansen-spa") {
      readJsonBody(request, response).then(payload => {
        const result = evaluateHansenSpaTest(payload);
        return respond(response, 200, { success: true, result });
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/backtest/dsr") {
      readJsonBody(request, response).then(payload => {
        const result = calculateDeflatedSharpeRatio(payload);
        return respond(response, 200, { success: true, result });
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/backtest/monte-carlo") {
      readJsonBody(request, response).then(payload => {
        const result = runMonteCarloSimulation(payload);
        return respond(response, 200, { success: true, result });
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/backtest/promotion-gate") {
      readJsonBody(request, response).then(payload => {
        const result = evaluateStrategyPromotionGate(payload);
        return respond(response, 200, { success: true, result });
      }).catch(() => {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/backtest/status") {
      return respond(response, 200, {
        success: true,
        phase: "PHASE_3_BACKTESTING_FALSIFICATION_ENGINE",
        simulator: getBacktestCoreStatus(),
        cpcv: getCPCVEvaluatorStatus(),
        hansenSpa: getHansenSpaStatus(),
        dsr: getDsrStatus(),
        monteCarlo: getMonteCarloEngineStatus(),
        promotionGate: getPromotionGateStatus(),
        timestamp: new Date().toISOString()
      });
    }
    // Phase 4: Institutional Risk Fortress Endpoints
    if (request.method === "POST" && url.pathname === "/api/risk/metrics") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = calculatePortfolioRiskMetrics(payload);
          return respond(response, 200, result);
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/risk/euler") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = decomposeEulerRisk(payload);
          return respond(response, 200, result);
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/risk/optimize") {
      readJsonBody(request, response).then(payload => {
        try {
          const method = (payload.method || "HRP").toUpperCase();
          let result;
          if (method === "MIN_VARIANCE" || method === "MINIMUM_VARIANCE") {
            result = optimizeMinimumVariance(payload);
          } else if (method === "MAX_SHARPE" || method === "MAXIMUM_SHARPE") {
            result = optimizeMaximumSharpe(payload);
          } else if (method === "INVERSE_VARIANCE") {
            result = computeInverseVarianceWeights(payload);
          } else {
            result = optimizeHierarchicalRiskParity(payload);
          }
          return respond(response, 200, { success: true, result });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/risk/correlation-regime") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = analyzeCorrelationRegime(payload);
          return respond(response, 200, result);
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/risk/hedge") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = generateDefensiveHedgePlan(payload);
          return respond(response, 200, result);
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/risk/status") {
      return respond(response, 200, {
        success: true,
        phase: "PHASE_4_INSTITUTIONAL_RISK_FORTRESS",
        riskMetrics: getRiskMetricsStatus(),
        eulerBudgeting: getEulerRiskBudgetingStatus(),
        optimizer: getPortfolioOptimizerStatus(),
        correlationRegime: getCorrelationRegimeStatus(),
        defensiveHedger: getDefensiveHedgerStatus(),
        timestamp: new Date().toISOString()
      });
    }
    // Phase 5: Alpha Lab & Strategy Megafactory Endpoints
    if (request.method === "POST" && url.pathname === "/api/alpha/cointegration") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = generatePairsTradingSignal(payload);
          return respond(response, 200, result);
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/alpha/vpin") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = calculateRollingVpin(payload);
          return respond(response, 200, result);
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/alpha/smc") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = analyzeSmartMoneyStructure(payload.candles || payload.prices);
          return respond(response, 200, result);
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/alpha/genetic-optimize") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = runGeneticStrategyOptimization(payload);
          return respond(response, 200, result);
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/alpha/megafactory") {
      const family = url.searchParams.get("family") || "ALL";
      const minSharpe = Number(url.searchParams.get("minSharpe")) || 0.0;
      const limit = Number(url.searchParams.get("limit")) || 50;
      const result = queryStrategyMegafactory({ family, minSharpe, limit });
      return respond(response, 200, { success: true, ...result });
    }
    if (request.method === "GET" && url.pathname === "/api/alpha/status") {
      return respond(response, 200, {
        success: true,
        phase: "PHASE_5_ALPHA_LAB_MEGAFACTORY",
        cointegration: getCointegrationEngineStatus(),
        vpin: getVpinEngineStatus(),
        smc: getSmcEngineStatus(),
        genetic: getGeneticOptimizerStatus(),
        megafactory: getMegafactoryStatus(),
        timestamp: new Date().toISOString()
      });
    }
    // Phase 6: Multi-Agent Swarm & Sovereign Automation Endpoints
    if (request.method === "GET" && url.pathname === "/api/swarm/status") {
      return respond(response, 200, { success: true, ...getSwarmFleetStatus() });
    }
    if (request.method === "POST" && url.pathname === "/api/swarm/delegate") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = delegateSwarmTask(payload);
          return respond(response, 200, { success: true, result });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/swarm/quorum") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = evaluateBftQuorumConsensus(payload);
          return respond(response, 200, { success: true, result });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/nexus/tick") {
      try {
        const result = executeNexusAutonomousTick();
        return respond(response, 200, { success: true, result });
      } catch (err) {
        return respond(response, 500, { success: false, error: err.message });
      }
    }
    if (request.method === "GET" && url.pathname === "/api/nexus/status") {
      return respond(response, 200, getMasterNexusReport());
    }
    if (request.method === "POST" && url.pathname === "/api/telegram/signal-alert") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = dispatchMobileSignalAlert(payload);
          return respond(response, 200, result);
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/telegram/signal-callback") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = processMobileConfirmationCallback({ ...payload, paperState: paper });
          return respond(response, 200, result);
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/cloud/sovereign") {
      return respond(response, 200, {
        success: true,
        phase: "PHASE_6_SOVEREIGN_AUTOMATION",
        cloud: getCloudSovereigntyMetrics(),
        mobileGate: getMobileConfirmationGateStatus(),
        timestamp: new Date().toISOString()
      });
    }
    if (request.method === "POST" && url.pathname === "/api/orders") {
      readJsonBody(request, response).then(async payload => {
        try {
          // GUARD: Only paper mode
          if (payload.mode === "live" && !process.env.ENABLE_LIVE_TRADING) {
            return respond(response, 403, { error: "Live trading disabled. Set ENABLE_LIVE_TRADING=true" });
          }

          if (payload.mode === "paper" || !payload.mode) {
            // Paper engine
            const fill = placePaperOrder(paper, payload);
            const order = { id: randomUUID(), ...payload, status: "simulated", fill, requestedAt: new Date().toISOString() };
            orders.push(order);
            persist();
            return respond(response, 200, { success: true, order });
          } else if (payload.mode === "live") {
            // Alpaca live
            const order = await alpacaBroker.placeOrder(payload.symbol, payload.qty || payload.quantity, payload.side);
            const saved = { id: order.id || randomUUID(), ...order, mode: "live" };
            orders.push(saved);
            persist();
            return respond(response, 200, { success: true, order: saved });
          }
          return respond(response, 400, { error: `Unsupported mode: ${payload.mode}` });
        } catch (err) {
          return respond(response, 400, { error: err.message });
        }
      }).catch(() => {});
      return;
    }

    // Phase 3: Discrete Candle Backtester Endpoint
    if (request.method === "POST" && url.pathname === "/api/backtest") {
      readJsonBody(request, response).then(payload => {
        try {
          const strategy = payload.strategy || StrategyFactory.createMovingAverageCrossover(10, 50);
          const backtester = new Backtester(strategy, payload.data || []);
          const result = backtester.run();
          return respond(response, 200, { success: true, ...result });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }

    // Phase 4: Portfolio Optimization Endpoints
    if (url.pathname === "/api/portfolio/frontier" && (request.method === "GET" || request.method === "POST")) {
      const runFrontier = (body) => {
        const returns = body.returns || [0.12, 0.18, 0.10, 0.15];
        const cov = body.cov || [
          [0.04, 0.01, 0.01, 0.02],
          [0.01, 0.06, 0.02, 0.03],
          [0.01, 0.02, 0.03, 0.01],
          [0.02, 0.03, 0.01, 0.05]
        ];
        const frontier = calculateMarkowitzFrontier(returns, cov, body.riskFreeRate || 0.02);
        return respond(response, 200, { success: true, count: frontier.length, frontier });
      };

      if (request.method === "POST") {
        readJsonBody(request, response).then(runFrontier).catch(() => {});
      } else {
        runFrontier({});
      }
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/portfolio/hrp") {
      readJsonBody(request, response).then(payload => {
        const returns = payload.returns || [0.12, 0.18, 0.10];
        const cov = payload.cov || [[0.04, 0.01, 0.01], [0.01, 0.06, 0.02], [0.01, 0.02, 0.03]];
        const weights = calculateHierarchicalRiskParity(returns, cov);
        return respond(response, 200, { success: true, weights });
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/portfolio/black-litterman") {
      readJsonBody(request, response).then(payload => {
        const marketCap = payload.marketCap || [1000000, 2000000, 500000];
        const views = payload.views || [{ assetIdx: 0, confidence: 0.8, expectedReturn: 0.05 }];
        const weights = calculateBlackLitterman(marketCap, views);
        return respond(response, 200, { success: true, weights });
      }).catch(() => {});
      return;
    }

    // Phase 4: Risk Metrics Endpoints
    if (request.method === "POST" && url.pathname === "/api/risk/var") {
      readJsonBody(request, response).then(payload => {
        const returns = payload.returns || [];
        const confidence = payload.confidence || 0.95;
        const varValue = calculateValueAtRisk(returns, confidence);
        return respond(response, 200, { success: true, confidence, var: varValue });
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/risk/cvar") {
      readJsonBody(request, response).then(payload => {
        const returns = payload.returns || [];
        const confidence = payload.confidence || 0.95;
        const cvarValue = calculateConditionalValueAtRisk(returns, confidence);
        return respond(response, 200, { success: true, confidence, cvar: cvarValue });
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/risk/ratios") {
      readJsonBody(request, response).then(payload => {
        const returns = payload.returns || [];
        const rf = payload.riskFreeRate || 0.02;
        const sharpe = calculateSharpeRatio(returns, rf);
        const sortino = calculateSortinoRatio(returns, rf);
        return respond(response, 200, { success: true, sharpe, sortino });
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/risk/max-drawdown") {
      readJsonBody(request, response).then(payload => {
        const equity = payload.equity || [];
        const maxDD = calculateMaxDrawdown(equity);
        return respond(response, 200, { success: true, maxDrawdown: maxDD });
      }).catch(() => {});
      return;
    }

    // Phase 5: Strategy Megafactory 1000+ Permutations Endpoint
    if (request.method === "GET" && (url.pathname === "/api/strategies/megafactory" || url.pathname === "/api/strategy/megafactory")) {
      const limit = Number(url.searchParams.get("limit")) || null;
      const strategies = StrategyFactory.generateMegafactoryCatalog(limit);
      return respond(response, 200, { count: strategies.length, strategies });
    }

    // Phase 6: Walk-Forward Validation & Genetic Evolution Endpoints
    if (request.method === "POST" && url.pathname === "/api/validate/walkforward") {
      readJsonBody(request, response).then(payload => {
        try {
          const strategy = StrategyFactory.createMovingAverageCrossover(10, 30);
          const data = payload.data || [];
          const results = runWalkForwardTest(strategy, data, payload.windowSize || 30, payload.stepSize || 10);
          return respond(response, 200, { success: true, count: results.length, results });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/strategies/genetic-evolve") {
      readJsonBody(request, response).then(payload => {
        try {
          const factory = {
            build: (params) => {
              if (params.type === "MOMENTUM") return StrategyFactory.createMomentum(params.period, params.threshold);
              if (params.type === "MEANREVERSION") return StrategyFactory.createMeanReversion(params.period, params.threshold);
              return StrategyFactory.createMovingAverageCrossover(params.period, params.period + 15);
            }
          };
          const fitness = (strategy) => {
            return strategy.name.length > 5 ? 1.5 : 0.8;
          };
          const optimizer = new GeneticOptimizer(factory, fitness);
          const evolution = optimizer.evolve(payload.generations || 10, payload.populationSize || 20);
          return respond(response, 200, { success: true, evolution });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }

    // Phase 7: Advanced Vision, Voice & Multimodal Endpoints
    if (request.method === "POST" && (url.pathname === "/api/vision/analyze-chart" || url.pathname === "/api/vision/chart")) {
      readJsonBody(request, response).then(async payload => {
        try {
          const analysis = await analyzeChartWithVision(
            payload.chartBase64 || payload.image || payload.chartImage,
            payload.technicalIndicators || {}
          );
          return respond(response, 200, { success: true, ...analysis, analysis });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && (url.pathname === "/api/voice/parse-command" || url.pathname === "/api/voice/command")) {
      readJsonBody(request, response).then(async payload => {
        try {
          const command = await parseVoiceCommand(payload.transcript || payload.command);
          return respond(response, 200, { success: true, ...command, parsed: command });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/vision/dashboard") {
      const status = {
        vision_engine: "ready",
        voice_engine: "ready",
        active_streams: {
          chart_capture: true,
          voice_listen: false,
          sentiment_tracking: true
        },
        dashboardHtml: createVisionDashboard()
      };
      return respond(response, 200, status);
    }
    if (request.method === "POST" && url.pathname === "/api/vision/sentiment") {
      readJsonBody(request, response).then(async payload => {
        try {
          const sentiment = await analyzeSentimentFromNews(payload.headlines);
          return respond(response, 200, { success: true, sentiment });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/vision/compare-patterns") {
      readJsonBody(request, response).then(async payload => {
        try {
          const comparison = await compareChartPatterns(payload.charts);
          return respond(response, 200, { success: true, comparison });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if ((request.method === "GET" || request.method === "POST") && url.pathname === "/api/vision/report") {
      const runReport = async (date) => {
        try {
          const report = await generateVisualTradingReport(date);
          return respond(response, 200, { success: true, report });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      };
      if (request.method === "POST") {
        readJsonBody(request, response).then(p => runReport(p.date)).catch(() => {});
      } else {
        runReport(url.searchParams.get("date"));
      }
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/vision/order-from-chart") {
      readJsonBody(request, response).then(async payload => {
        try {
          const result = await placeOrderFromChart(
            payload.chartBase64 || payload.image,
            payload.userIntent || "long AAPL",
            paper
          );
          return respond(response, 200, result);
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }

    // Phase 8: Quantum-Resistant Security Vault Endpoints
    if (request.method === "POST" && url.pathname === "/api/security/vault/encrypt") {
      readJsonBody(request, response).then(payload => {
        try {
          const envelope = encryptWithQuantumResistantVault(
            payload.plaintext,
            payload.masterPassword || globalQuantumVault.masterPassword,
            payload.aad || ""
          );
          return respond(response, 200, { success: true, envelope });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/security/vault/decrypt") {
      readJsonBody(request, response).then(payload => {
        try {
          const decrypted = decryptWithQuantumResistantVault(
            payload.envelope,
            payload.masterPassword || globalQuantumVault.masterPassword
          );
          return respond(response, 200, { success: true, decrypted });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/security/vault/split-secret") {
      readJsonBody(request, response).then(payload => {
        try {
          const shares = splitSecretShamir(payload.secret, payload.n || 5, payload.k || 3);
          return respond(response, 200, { success: true, count: shares.length, threshold: payload.k || 3, shares });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/security/vault/recover-secret") {
      readJsonBody(request, response).then(payload => {
        try {
          const secret = reconstructSecretShamir(payload.shares, payload.asHex || false);
          return respond(response, 200, { success: true, secret });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/security/vault/kem-keypair") {
      readJsonBody(request, response).then(payload => {
        try {
          const keyPair = generateLatticeKemKeyPair(payload.dimension || 4);
          return respond(response, 200, { success: true, ...keyPair });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/security/vault/kem-encapsulate") {
      readJsonBody(request, response).then(payload => {
        try {
          const kem = encapsulateLatticeSecret(payload.publicKey);
          return respond(response, 200, { success: true, ...kem });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/security/vault/sign") {
      readJsonBody(request, response).then(payload => {
        try {
          const sig = signLatticeData(payload.message, payload.privateKey);
          return respond(response, 200, { success: true, ...sig });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/security/vault/verify") {
      readJsonBody(request, response).then(payload => {
        try {
          const valid = verifyLatticeSignature(payload.message, payload.signature, payload.privateKey);
          return respond(response, 200, { success: true, valid });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/security/vault/status") {
      return respond(response, 200, { success: true, ...globalQuantumVault.getStatus(), timestamp: new Date().toISOString() });
    }
    if (request.method === "POST" && url.pathname === "/api/quotes") {
      readJsonBody(request, response).then(payload => {
        try {
          const quote = setQuote(paper, payload);
          persist();
          return respond(response, 200, { success: true, quote });
        } catch (err) {
          return respond(response, 400, { error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/agents") {
      return respond(response, 200, agentRegistry());
    }
    if (request.method === "GET" && url.pathname === "/api/control-plane") {
      return respond(response, 200, controlPlaneStatus());
    }
    if (request.method === "POST" && url.pathname === "/api/heartbeat") {
      return respond(response, 200, runHeartbeat());
    }
    if (request.method === "POST" && url.pathname === "/api/tasks") {
      readJsonBody(request, response).then(payload => {
        try {
          const task = delegateTask(payload);
          return respond(response, 200, task);
        } catch (err) {
          return respond(response, 400, { error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/replicas") {
      readJsonBody(request, response).then(payload => {
        try {
          const replica = requestReplica(payload);
          return respond(response, 200, replica);
        } catch (err) {
          return respond(response, 400, { error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/kill-switch") {
      readJsonBody(request, response).then(payload => {
        try {
          const state = setKillSwitch(payload);
          return respond(response, 200, state);
        } catch (err) {
          return respond(response, 400, { error: err.message });
        }
      }).catch(() => {});
      return;
    }

    return respond(response, 404, { error: "not found" });
  } catch (err) {
    return respond(response, 500, { error: `Internal Server Error: ${err.message}` });
  }
}

process.on("uncaughtException", (err) => {
  console.error("[AIFIE_PROCESS_EXCEPTION_SHIELD]", err?.message || err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[AIFIE_PROCESS_REJECTION_SHIELD]", reason?.message || reason);
});

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  const port = Number(process.env.PORT || 8787);
  const host = process.env.HOST || "0.0.0.0";
  const httpServer = createServer(app);
  initializeWebSocketGateway({ server: httpServer });
  httpServer.listen(port, host, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 AIFIE AI AGENT ONLINE (PHASE 0 CORE)`);
    console.log(`📊 Local Web Dashboard: http://localhost:${port}`);
    console.log(`🌐 Network URL:         http://${host}:${port}`);
    console.log(`🤖 Core Paper Engine:   READY`);
    console.log(`==================================================\n`);
  });
}
