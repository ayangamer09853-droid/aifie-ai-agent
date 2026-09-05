import { createServer } from "node:http";
import { randomUUID, createHash } from "node:crypto";
import { monitorEventLoopDelay } from "node:perf_hooks";
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
import { accountSnapshot, createPaperState, placePaperOrder, setQuote, AsyncMutex } from "./src/paper-engine.mjs";
import { marketCache } from "./src/market-cache.mjs";
import { createStrategyState, evaluateDecision, registerStrategy } from "./src/strategy-lab.mjs";
import { DASHBOARD } from "./src/dashboard.mjs";
import { auditSources, recommendIntegrationOrder } from "./src/source-audit.mjs";
import { getSandboxedAdaptersCatalog, executeSandboxedCcxtTicker, executeSandboxedSourceAdapter, runAllSourcesConsensus } from "./src/reviewed-source-adapters.mjs";
import { startTelegramCommandListener } from "./src/telegram-command-listener.mjs";
import { initializeWebSocketGateway } from "./src/realtime-websocket-broadcast-gateway.mjs";

// 5-Stage 24/7 AI Trading Machine Engine
import {
  get5StagePipelineStatus,
  runStage1ScannerWithRealData,
  runFull5StagePipelineCycle,
  executeHumanDecision,
  getPerformanceReport,
  runPipelineBacktest
} from "./src/modular-5stage-ai-trading-machine-v94.mjs";

// Core Research Source Dependencies
import { integrationManifest } from "./src/integration-manifest.mjs";
import { getConnectedSourceStatus, runFullIntelligenceScan } from "./src/source-bridges.mjs";
import {
  ALL_60_SOURCES,
  getMasterSourcesStatus,
  scanAll60Sources,
  executeMasterSourceOperation
} from "./src/master-sources-engine.mjs";
import {
  getLive60SourceAlphaMatrix,
  start60SourceFusionDaemon
} from "./src/continuous-60-source-fusion.mjs";
import { realtimeEventStream } from "./src/realtime-event-stream.mjs";
import { institutionalArbitrageEngine } from "./src/institutional-arbitrage-engine.mjs";
import { institutionalRiskEngine } from "./src/institutional-risk-engine.mjs";
import { algorithmicExecutionSlicer } from "./src/execution/algorithmic-execution-slicer.mjs";
import { factorDecaySentry } from "./src/quant/factor-decay-sentry.mjs";
import { institutionalPortfolioOptimizer } from "./src/portfolio/institutional-portfolio-optimizer.mjs";
import { eventSourcingWalJournal } from "./src/storage/event-sourcing-wal.mjs";
import { LimitOrderBook, computeAlmgrenChrissTrajectory } from "./src/microstructure/limit-order-book-simulator.mjs";
import { realtimeFeatureStore } from "./src/quant/realtime-feature-store.mjs";
import { multiArmedBanditAllocator } from "./src/portfolio/multi-armed-bandit-allocator.mjs";
import { runMacroStressTestingMatrix, computeExtremeValueTheoryTailRisk } from "./src/risk/macro-stress-testing-matrix.mjs";

const serverLob = new LimitOrderBook("AAPL", 150.0);

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

import { constitutionalGuard } from "./src/constitutional-constraints-guard.mjs";
import { orderFlowTracker } from "./src/order-flow-whale-tape.mjs";
import { crossExchangeArbitrage } from "./src/cross-exchange-arbitrage.mjs";
import { leanEngineAdapter } from "./src/lean-engine-adapter.mjs";
import { worldmonitorAdapter, GEOPOLITICAL_HOTSPOTS, STRATEGIC_CHOKEPOINTS } from "./src/worldmonitor-intelligence-adapter.mjs";
import { vibeTradingAdapter, ALPHA_ZOO_REGISTRY } from "./src/vibe-trading-adapter.mjs";
import { autonomousSelfLearningEngine } from "./src/autonomous-self-learning-engine.mjs";
import { continuousSelfOptimizationDaemon } from "./src/continuous-self-optimization-daemon.mjs";
import { startAutoTrader, stopAutoTrader, getAutoTraderStatus, executeAutonomousTradeCycle } from "./src/autonomous-auto-trader.mjs";
import { aiInterconnectionBus } from "./src/ai-interconnection-neural-bus.mjs";
import { 
  conductAiPeerDialogue, 
  getSelfKnowledgeTelemetry, 
  applySelfKnowledgeToDecision 
} from "./src/ai-peer-dialogue-collaboration-engine.mjs";
import { WAR_ROOM_HTML } from "./src/ai-war-room-canvas.mjs";
import { semanticVectorRagEngine } from "./src/semantic-vector-rag-engine.mjs";
import { dispatchV1Route } from "./src/api/v1-router.mjs";
import { dispatchV100Route } from "./src/api/v100-roadmap-router.mjs";
import { mcpHub } from "./src/mcp/mcp-hub.mjs";

const globalQuantumVault = new QuantumVault(process.env.AIFIE_MASTER_VAULT_KEY || "AIFIE_POST_QUANTUM_SOVEREIGN_KEY_2026");

const loopDelayMonitor = monitorEventLoopDelay({ resolution: 20 });
loopDelayMonitor.enable();

const orderMutex = new AsyncMutex();
const MAX_MEMORY_ORDERS = 10000;

const DASHBOARD_ETAG = `"${createHash("md5").update(DASHBOARD).digest("hex").slice(0, 16)}"`;
const WAR_ROOM_ETAG = `"${createHash("md5").update(WAR_ROOM_HTML).digest("hex").slice(0, 16)}"`;

const RATE_LIMIT_WINDOW_MS = 10000;
const RATE_LIMIT_MAX_REQUESTS = 200;
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  if (!ip || ip === "127.0.0.1" || ip === "::1") return true;
  const now = Date.now();
  let record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(ip, record);
    if (rateLimitMap.size > 2000) {
      for (const [k, v] of rateLimitMap) {
        if (now > v.resetTime) rateLimitMap.delete(k);
      }
    }
    return true;
  }
  record.count++;
  return record.count <= RATE_LIMIT_MAX_REQUESTS;
}

const stateStore = createStateStore(process.env.AIFIE_STATE_PATH || join(process.cwd(), "data", "aifie-state.json"), { maxOrders: MAX_MEMORY_ORDERS });
const persistedState = stateStore.load();
const orders = persistedState.orders;
const paper = createPaperState(persistedState.paper);
const strategyLab = createStrategyState(persistedState.paper?.strategyLab);

startTelegramCommandListener({ paper, orders, botToken: process.env.TELEGRAM_BOT_TOKEN });

function persist() { stateStore.save({ orders, paper: { ...paper, strategyLab } }); }

function respond(response, status, payload, type = "application/json", headers = {}) {
  if (response.writableEnded) return;
  response.writeHead(status, {
    "content-type": `${type}; charset=utf-8`,
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-xss-protection": "1; mode=block",
    ...headers
  });
  response.end(type === "application/json" ? JSON.stringify(payload) : payload);
}

function readJsonBody(request, response, maxBytes = 1048576) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let receivedBytes = 0;
    request.on("data", chunk => {
      receivedBytes += chunk.length;
      if (receivedBytes > maxBytes) {
        request.destroy();
        respond(response, 413, { error: "Payload Too Large: Maximum 1MB allowed" });
        return reject(new Error("PAYLOAD_TOO_LARGE"));
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        const raw = chunks.length === 0 ? "{}" : Buffer.concat(chunks, receivedBytes).toString("utf8");
        const payload = JSON.parse(raw.trim() || "{}");
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

    const clientIp = request.socket?.remoteAddress || request.headers["x-forwarded-for"] || "127.0.0.1";
    if (!checkRateLimit(clientIp)) {
      return respond(response, 429, { error: "Too Many Requests: Rate limit exceeded. Please back off." });
    }

    // Model Context Protocol (MCP) JSON-RPC 2.0 Endpoint
    if (url.pathname === "/mcp" || url.pathname === "/api/mcp") {
      if (request.method === "POST") {
        readJsonBody(request, response).then(async payload => {
          try {
            const mcpResponse = await mcpHub.handleMessage(payload);
            return respond(response, 200, mcpResponse);
          } catch (err) {
            return respond(response, 500, {
              jsonrpc: "2.0",
              id: null,
              error: { code: -32603, message: err.message }
            });
          }
        }).catch(() => {});
        return;
      }
      if (request.method === "GET") {
        return respond(response, 200, mcpHub.getTelemetry());
      }
    }

    // Consolidated /api/v1 Hard Boundaries REST Gateway
    if (url.pathname === "/api/v1" || url.pathname.startsWith("/api/v1/")) {
      if (request.method === "POST" || request.method === "PUT") {
        readJsonBody(request, response).then(async payload => {
          try {
            const v1Result = await dispatchV1Route(url.pathname, request.method, url.searchParams, payload);
            return respond(response, v1Result.status, v1Result);
          } catch (err) {
            return respond(response, 400, { error: err.message });
          }
        }).catch(() => {});
        return;
      }
      Promise.resolve(dispatchV1Route(url.pathname, request.method, url.searchParams)).then(v1Result => {
        return respond(response, v1Result.status, v1Result);
      });
      return;
    }

    // Roadmap /api/v100 Routes
    if (url.pathname === "/api/v100" || url.pathname.startsWith("/api/v100/")) {
      if (request.method === "POST") {
        readJsonBody(request, response).then(payload => {
          try {
            const v100Result = dispatchV100Route(url.pathname, request.method, url.searchParams, payload);
            return respond(response, v100Result.status, v100Result.payload);
          } catch (err) {
            return respond(response, 400, { error: err.message });
          }
        }).catch(() => {});
        return;
      }
      const v100Result = dispatchV100Route(url.pathname, request.method, url.searchParams);
      return respond(response, v100Result.status, v100Result.payload);
    }

    if (request.method === "GET" && (url.pathname === "/api/performance/telemetry" || url.pathname === "/api/telemetry/performance")) {
      const mem = process.memoryUsage();
      return respond(response, 200, {
        success: true,
        uptimeSeconds: Math.floor(process.uptime()),
        eventLoop: {
          meanLagMs: Number((loopDelayMonitor.mean / 1e6).toFixed(3)),
          p95LagMs: Number((loopDelayMonitor.percentile(95) / 1e6).toFixed(3)),
          maxLagMs: Number((loopDelayMonitor.max / 1e6).toFixed(3))
        },
        memory: {
          heapUsedMb: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
          heapTotalMb: Number((mem.heapTotal / 1024 / 1024).toFixed(2)),
          rssMb: Number((mem.rss / 1024 / 1024).toFixed(2))
        },
        orders: {
          inMemoryCount: orders.length,
          maxRetained: MAX_MEMORY_ORDERS
        },
        marketCache: marketCache.getTelemetry(),
        orderMutex: {
          isLocked: orderMutex.isLocked()
        },
        timestamp: new Date().toISOString()
      });
    }

    if (request.method === "GET" && url.pathname === "/") {
      if (request.headers["if-none-match"] === DASHBOARD_ETAG) {
        response.writeHead(304, { "ETag": DASHBOARD_ETAG });
        return response.end();
      }
      return respond(response, 200, DASHBOARD, "text/html", { "ETag": DASHBOARD_ETAG, "Cache-Control": "public, max-age=60" });
    }
    if (request.method === "GET" && (url.pathname === "/war-room" || url.pathname === "/ai-war-room")) {
      if (request.headers["if-none-match"] === WAR_ROOM_ETAG) {
        response.writeHead(304, { "ETag": WAR_ROOM_ETAG });
        return response.end();
      }
      return respond(response, 200, WAR_ROOM_HTML, "text/html", { "ETag": WAR_ROOM_ETAG, "Cache-Control": "public, max-age=60" });
    }
    if (request.method === "GET" && url.pathname === "/api/status") return respond(response, 200, { name: "Aifie AI Agent", mode: "paper", liveExecution: false, liveBroker: { isLiveModeUnlocked: false }, orders, paper: accountSnapshot(paper) });
    if (request.method === "GET" && (url.pathname === "/api/sources/all" || url.pathname === "/api/sources/universe")) {
      return respond(response, 200, {
        totalSources: ALL_60_SOURCES.length,
        pillarsCount: 8,
        sources: getMasterSourcesStatus()
      });
    }
    if (request.method === "GET" && url.pathname === "/api/sources/catalog") {
      return respond(response, 200, {
        total: ALL_60_SOURCES.length,
        sources: ALL_60_SOURCES
      });
    }
    if (request.method === "GET" && (url.pathname === "/api/sources/fusion" || url.pathname === "/api/sources/matrix")) {
      return respond(response, 200, getLive60SourceAlphaMatrix());
    }
    if (request.method === "GET" && url.pathname === "/api/sources") {
      if (url.searchParams.get("all") === "true" || url.searchParams.get("universe") === "60") {
        return respond(response, 200, getMasterSourcesStatus());
      }
      return respond(response, 200, getConnectedSourceStatus(), "application/json", { "X-Total-Universe-Sources": "60" });
    }
    if (request.method === "GET" && url.pathname === "/api/integrations") return respond(response, 200, integrationManifest);
    if (request.method === "GET" && url.pathname === "/api/source-audit") {
      const audit = auditSources(join(process.cwd(), "sources"), integrationManifest);
      const recommendations = recommendIntegrationOrder(audit);
      return respond(response, 200, { audit, recommendations });
    }
    if (request.method === "GET" && (url.pathname === "/api/sources/scan" || url.pathname === "/api/sources/intelligence")) {
      const symbol = url.searchParams.get("symbol") || "AAPL";
      if (url.searchParams.get("all") === "true" || url.searchParams.get("universe") === "60") {
        return respond(response, 200, scanAll60Sources(symbol));
      }
      const baseScan = runFullIntelligenceScan(symbol);
      const masterScan = scanAll60Sources(symbol);
      return respond(response, 200, {
        ...baseScan,
        master60Sources: masterScan
      });
    }
    if (request.method === "GET" && url.pathname === "/api/sources/consensus") {
      const symbol = url.searchParams.get("symbol") || "AAPL";
      return respond(response, 200, runAllSourcesConsensus({ symbol }));
    }
    if (request.method === "POST" && url.pathname === "/api/sources/execute") {
      readJsonBody(request, response).then(payload => {
        try {
          const repo = payload.repository || payload.source;
          let res;
          try {
            res = executeSandboxedSourceAdapter(repo, payload.params || {});
          } catch (_) {
            res = executeMasterSourceOperation(repo, payload.operation, payload.params || {});
          }
          return respond(response, 200, res);
        } catch (err) {
          return respond(response, 400, { error: err.message });
        }
      }).catch(() => {});
      return;
    }

    // Native Server-Sent Events (SSE) Real-Time Alpha & Execution Stream
    if (request.method === "GET" && (url.pathname === "/api/stream/events" || url.pathname === "/api/stream")) {
      return realtimeEventStream.registerClient(response);
    }
    if (request.method === "GET" && url.pathname === "/api/stream/telemetry") {
      return respond(response, 200, realtimeEventStream.getTelemetry());
    }
    if (request.method === "GET" && url.pathname === "/api/stream/recent") {
      return respond(response, 200, realtimeEventStream.getRecentEvents(parseInt(url.searchParams.get("limit") || "20", 10)));
    }

    // Institutional Multi-Venue Arbitrage & Liquidity Engine
    if (request.method === "GET" && (url.pathname === "/api/arbitrage/matrix" || url.pathname === "/api/arbitrage/radar")) {
      const symbolsParam = url.searchParams.get("symbols");
      const symbols = symbolsParam ? symbolsParam.split(",").map(s => s.trim().toUpperCase()) : undefined;
      return respond(response, 200, institutionalArbitrageEngine.scanSpatialArbitrage(symbols));
    }
    if (request.method === "GET" && url.pathname === "/api/arbitrage/opportunities") {
      return respond(response, 200, institutionalArbitrageEngine.scanSpatialArbitrage().opportunities);
    }
    if (request.method === "GET" && url.pathname === "/api/arbitrage/triangular") {
      const venue = url.searchParams.get("venue") || "binance";
      return respond(response, 200, institutionalArbitrageEngine.scanTriangularArbitrage(venue));
    }
    if (request.method === "POST" && url.pathname === "/api/arbitrage/execute") {
      readJsonBody(request, response).then(payload => {
        try {
          const res = institutionalArbitrageEngine.executeSyntheticArbitrage(payload);
          return respond(response, 200, res);
        } catch (err) {
          return respond(response, 400, { error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/arbitrage/history") {
      return respond(response, 200, institutionalArbitrageEngine.getExecutionHistory());
    }

    // Institutional Risk Management, VaR & Macro Stress-Testing Lab
    if (request.method === "GET" && (url.pathname === "/api/risk/analytics" || url.pathname === "/api/risk/metrics")) {
      const eq = url.searchParams.get("equity") ? parseFloat(url.searchParams.get("equity")) : undefined;
      return respond(response, 200, institutionalRiskEngine.getRiskAnalytics(eq));
    }
    if (request.method === "POST" && url.pathname === "/api/risk/stress-test") {
      readJsonBody(request, response).then(payload => {
        try {
          const res = institutionalRiskEngine.runMacroStressTests(payload.portfolioValue);
          return respond(response, 200, res);
        } catch (err) {
          return respond(response, 400, { error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/risk/kelly") {
      readJsonBody(request, response).then(payload => {
        try {
          const res = institutionalRiskEngine.calculateKellyPositionSize(payload);
          return respond(response, 200, res);
        } catch (err) {
          return respond(response, 400, { error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/risk/circuit-breaker/reset") {
      return respond(response, 200, institutionalRiskEngine.resetCircuitBreaker());
    }

    // Algorithmic Execution Slicer (TWAP, VWAP, POV, Iceberg)
    if (request.method === "POST" && url.pathname === "/api/execution/slice") {
      readJsonBody(request, response).then(payload => {
        try {
          const algo = (payload.algorithm || "TWAP").toUpperCase();
          let schedule;
          if (algo === "VWAP") schedule = algorithmicExecutionSlicer.createVwapSchedule(payload);
          else if (algo === "POV") schedule = algorithmicExecutionSlicer.createPovSchedule(payload);
          else if (algo === "ICEBERG") schedule = algorithmicExecutionSlicer.createIcebergOrder(payload);
          else schedule = algorithmicExecutionSlicer.createTwapSchedule(payload);

          return respond(response, 200, schedule);
        } catch (err) {
          return respond(response, 400, { error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/execution/slices") {
      return respond(response, 200, algorithmicExecutionSlicer.getTelemetry());
    }
    if (request.method === "POST" && url.pathname === "/api/execution/slice/fill") {
      readJsonBody(request, response).then(payload => {
        try {
          const res = algorithmicExecutionSlicer.simulateExecuteSlice(
            payload.scheduleId,
            payload.trancheIndex || 1,
            payload.marketPrice,
            { paper, orders }
          );
          return respond(response, 200, res);
        } catch (err) {
          return respond(response, 400, { error: err.message });
        }
      }).catch(() => {});
      return;
    }

    // Factor Decay Monitoring & Dynamic Regime Weights
    if (request.method === "GET" && url.pathname === "/api/quant/decay") {
      const sym = url.searchParams.get("symbol") || "BTC/USDT";
      return respond(response, 200, factorDecaySentry.auditFactorDecayMatrix(sym));
    }
    if (request.method === "GET" && url.pathname === "/api/quant/regime-weights") {
      const regime = url.searchParams.get("regime") || "BULL_TREND_STABLE";
      return respond(response, 200, factorDecaySentry.getRegimeConditionedWeights(regime));
    }
    if (request.method === "POST" && url.pathname === "/api/quant/dsr") {
      readJsonBody(request, response).then(payload => {
        try {
          return respond(response, 200, factorDecaySentry.calculateDeflatedSharpeRatio(payload));
        } catch (err) {
          return respond(response, 400, { error: err.message });
        }
      }).catch(() => {});
      return;
    }

    // Institutional Cross-Asset Portfolio Optimization
    if (request.method === "POST" && url.pathname === "/api/portfolio/optimize-hrp") {
      readJsonBody(request, response).then(payload => {
        try {
          return respond(response, 200, institutionalPortfolioOptimizer.optimizeHierarchicalRiskParity(payload.assets));
        } catch (err) {
          return respond(response, 400, { error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/portfolio/optimize-black-litterman") {
      readJsonBody(request, response).then(payload => {
        try {
          return respond(response, 200, institutionalPortfolioOptimizer.optimizeBlackLitterman(payload));
        } catch (err) {
          return respond(response, 400, { error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/portfolio/drift-check") {
      readJsonBody(request, response).then(payload => {
        try {
          return respond(response, 200, institutionalPortfolioOptimizer.evaluateRebalancingDrift(payload));
        } catch (err) {
          return respond(response, 400, { error: err.message });
        }
      }).catch(() => {});
      return;
    }

    // Event Sourcing Write-Ahead Log (WAL) Journal
    if (request.method === "GET" && url.pathname === "/api/journal/wal/events") {
      const from = parseInt(url.searchParams.get("from") || "0", 10);
      const to = parseInt(url.searchParams.get("to") || String(Date.now()), 10);
      return respond(response, 200, eventSourcingWalJournal.replayEvents({ fromTimestamp: from, toTimestamp: to }));
    }
    if (request.method === "POST" && url.pathname === "/api/journal/wal/replay") {
      readJsonBody(request, response).then(payload => {
        try {
          return respond(response, 200, eventSourcingWalJournal.reconstructStateAt(payload.timestamp, payload.initialCash));
        } catch (err) {
          return respond(response, 400, { error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/journal/wal/telemetry") {
      return respond(response, 200, eventSourcingWalJournal.getTelemetry());
    }

    if (request.method === "GET" && url.pathname === "/api/research") {
      const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase();
      return respond(response, 200, { symbol, status: "RESEARCH_READY", timestamp: new Date().toISOString() });
    }
    // Phase 1: Real Market Data Endpoints
    if (request.method === "GET" && url.pathname === "/api/market/quote") {
      const symbol = url.searchParams.get("symbol") || "BTCUSDT";
      marketCache.getOrFetch(`quote:${symbol}`, () => getUnifiedMarketQuote(symbol), 5000).then(quote => {
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
      marketCache.getOrFetch(`iex_quote:${symbol}`, () => fetchIexQuote(symbol), 5000).then(quote => {
        return respond(response, 200, { success: true, quote });
      }).catch(err => {
        return respond(response, 502, { success: false, error: err.message });
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/market/iex/historical") {
      const symbol = url.searchParams.get("symbol") || "AAPL";
      const range = url.searchParams.get("range") || "5y";
      marketCache.getOrFetch(`iex_hist:${symbol}:${range}`, () => fetchIexHistorical(symbol, range), 60000).then(data => {
        return respond(response, 200, { success: true, data });
      }).catch(err => {
        return respond(response, 502, { success: false, error: err.message });
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/market/polygon/quote") {
      const symbol = url.searchParams.get("symbol") || "AAPL";
      marketCache.getOrFetch(`polygon_quote:${symbol}`, () => fetchPolygonQuote(symbol), 5000).then(quote => {
        return respond(response, 200, { success: true, quote });
      }).catch(err => {
        return respond(response, 502, { success: false, error: err.message });
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/market/polygon/historical") {
      const symbol = url.searchParams.get("symbol") || "AAPL";
      marketCache.getOrFetch(`polygon_hist:${symbol}`, () => fetchPolygonHistorical(symbol), 60000).then(data => {
        return respond(response, 200, { success: true, data });
      }).catch(err => {
        return respond(response, 502, { success: false, error: err.message });
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/market/crypto/binance") {
      const symbol = url.searchParams.get("symbol") || "BTCUSDT";
      marketCache.getOrFetch(`binance_quote:${symbol}`, () => fetchBinanceQuote(symbol), 5000).then(quote => {
        return respond(response, 200, { success: true, quote });
      }).catch(err => {
        return respond(response, 502, { success: false, error: err.message });
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/market/crypto/coingecko") {
      const symbol = url.searchParams.get("symbol") || "bitcoin";
      marketCache.getOrFetch(`coingecko_quote:${symbol}`, () => fetchCoingeckoQuote(symbol), 15000).then(quote => {
        return respond(response, 200, { success: true, quote });
      }).catch(err => {
        return respond(response, 502, { success: false, error: err.message });
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/market/consensus") {
      const symbol = url.searchParams.get("symbol") || "BTCUSDT";
      marketCache.getOrFetch(`consensus:${symbol}`, () => getConsensusReport(symbol), 5000).then(report => {
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
            const sym = String(payload.symbol || "AAPL").trim().toUpperCase();
            dispatchResult = await orderMutex.runExclusive(async () => {
              if (payload.price || !paper.quotes[sym]) {
                setQuote(paper, { symbol: sym, price: Number(payload.price || 150) });
              }
              const fill = placePaperOrder(paper, payload);
              return { success: true, mode: "paper", fill };
            });
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

          const result = await orderMutex.runExclusive(async () => {
            if (payload.mode === "paper" || !payload.mode) {
              // Paper engine
              const sym = String(payload.symbol || "AAPL").trim().toUpperCase();
              const existingQuote = paper.quotes[sym];
              const isStale = !existingQuote || (Date.now() - (existingQuote._cachedTime || Date.parse(existingQuote.updatedAt || 0)) > (paper.risk?.maxQuoteAgeMs || 60000));
              if (payload.price || isStale) {
                setQuote(paper, { symbol: sym, price: Number(payload.price || existingQuote?.price || 150) });
              }
              const fill = placePaperOrder(paper, payload);
              const order = { id: randomUUID(), ...payload, status: "simulated", fill, requestedAt: new Date().toISOString() };
              orders.push(order);
              if (orders.length > MAX_MEMORY_ORDERS) orders.splice(0, orders.length - MAX_MEMORY_ORDERS);
              persist();
              return { status: 200, body: { success: true, order } };
            } else if (payload.mode === "live") {
              // Alpaca live
              const order = await alpacaBroker.placeOrder(payload.symbol, payload.qty || payload.quantity, payload.side);
              const saved = { id: order.id || randomUUID(), ...order, mode: "live" };
              orders.push(saved);
              if (orders.length > MAX_MEMORY_ORDERS) orders.splice(0, orders.length - MAX_MEMORY_ORDERS);
              persist();
              return { status: 200, body: { success: true, order: saved } };
            }
            return { status: 400, body: { error: `Unsupported mode: ${payload.mode}` } };
          });
          return respond(response, result.status, result.body);
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

    // Constitutional Constraints Guard Endpoints
    if (request.method === "GET" && url.pathname === "/api/constitution/status") {
      return respond(response, 200, { success: true, ...constitutionalGuard.getStatus(), timestamp: new Date().toISOString() });
    }
    if (request.method === "POST" && url.pathname === "/api/constitution/validate-order") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = constitutionalGuard.validateOrder(payload);
          return respond(response, result.permitted ? 200 : 403, { success: result.permitted, ...result });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/constitution/sweep-profit") {
      readJsonBody(request, response).then(payload => {
        try {
          const sweep = constitutionalGuard.evaluateProfitSweep(payload.dailyProfit);
          return respond(response, 200, { success: true, ...sweep });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }

    // Phase 9: Order Flow & Whale Tape Endpoints
    if (request.method === "POST" && url.pathname === "/api/orderflow/trade-tick") {
      readJsonBody(request, response).then(payload => {
        try {
          const tick = orderFlowTracker.processTradeTick(payload);
          return respond(response, 200, { success: true, tick });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/orderflow/detect-whales") {
      readJsonBody(request, response).then(payload => {
        try {
          const analysis = orderFlowTracker.detectWhaleWalls(payload.bids || [], payload.asks || []);
          return respond(response, 200, { success: true, ...analysis });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/orderflow/detect-iceberg") {
      readJsonBody(request, response).then(payload => {
        try {
          const iceberg = orderFlowTracker.detectIceberg(payload.priceLevel, payload.visibleSize, payload.executedTrades || []);
          return respond(response, 200, { success: true, ...iceberg });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/orderflow/cvd") {
      const windowSize = Number(url.searchParams.get("window")) || 100;
      const cvd = orderFlowTracker.getCvdAnalytics(windowSize);
      return respond(response, 200, { success: true, ...cvd });
    }
    if (request.method === "GET" && url.pathname === "/api/orderflow/status") {
      return respond(response, 200, { success: true, ...orderFlowTracker.getStatus(), timestamp: new Date().toISOString() });
    }

    // Phase 10: Cross-Exchange Arbitrage Endpoints
    if (request.method === "POST" && url.pathname === "/api/arbitrage/scan-spatial") {
      readJsonBody(request, response).then(payload => {
        try {
          const opportunity = crossExchangeArbitrage.scanSpatialArbitrage(payload.symbol || "BTCUSDT", payload.venues || {});
          return respond(response, 200, { success: true, ...opportunity });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/arbitrage/scan-triangular") {
      readJsonBody(request, response).then(payload => {
        try {
          const loop = crossExchangeArbitrage.scanTriangularArbitrage(payload);
          return respond(response, 200, { success: true, ...loop });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/arbitrage/opportunities") {
      return respond(response, 200, { success: true, ...crossExchangeArbitrage.getOpportunities() });
    }
    if (request.method === "GET" && url.pathname === "/api/arbitrage/status") {
      return respond(response, 200, { success: true, ...crossExchangeArbitrage.getStatus(), timestamp: new Date().toISOString() });
    }

    // QuantConnect / Lean Algorithmic Trading Engine Endpoints
    if (request.method === "GET" && url.pathname === "/api/lean/status") {
      return respond(response, 200, leanEngineAdapter.getStatus());
    }
    if (request.method === "POST" && url.pathname === "/api/lean/generate") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = leanEngineAdapter.generateAlgorithm(payload.strategyType, payload);
          return respond(response, 200, result);
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/lean/backtest") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = leanEngineAdapter.runBacktest(payload);
          return respond(response, 200, result);
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/lean/indicators") {
      return respond(response, 200, { success: true, indicators: leanEngineAdapter.getIndicatorCatalog() });
    }
    if (request.method === "POST" && url.pathname === "/api/lean/export-config") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = leanEngineAdapter.exportLeanConfig(payload);
          return respond(response, 200, result);
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }

    // WorldMonitor Geopolitical Intelligence & Macro Risk Governor Endpoints
    if (request.method === "GET" && url.pathname === "/api/worldmonitor/status") {
      return respond(response, 200, {
        success: true,
        hasSourceRepo: worldmonitorAdapter.hasSourceRepo,
        sourcePath: worldmonitorAdapter.sourcePath,
        status: "APPROVED_ACTIVE",
        snapshot: worldmonitorAdapter.getGeopoliticalSnapshot(),
        timestamp: new Date().toISOString()
      });
    }
    if (request.method === "GET" && url.pathname === "/api/worldmonitor/briefing") {
      return respond(response, 200, { success: true, ...worldmonitorAdapter.getGeopoliticalBriefing() });
    }
    if (request.method === "GET" && url.pathname === "/api/worldmonitor/cii-matrix") {
      return respond(response, 200, { success: true, ...worldmonitorAdapter.getCiiMatrix() });
    }
    if (request.method === "GET" && url.pathname === "/api/worldmonitor/hotspots") {
      return respond(response, 200, {
        success: true,
        hotspots: GEOPOLITICAL_HOTSPOTS,
        strategicChokepoints: STRATEGIC_CHOKEPOINTS,
        timestamp: new Date().toISOString()
      });
    }
    if (request.method === "POST" && url.pathname === "/api/worldmonitor/asset-impact") {
      readJsonBody(request, response).then(payload => {
        try {
          const impact = worldmonitorAdapter.evaluateAssetImpact(payload.symbol || "BTC");
          return respond(response, 200, { success: true, ...impact });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/worldmonitor/risk-governor") {
      return respond(response, 200, { success: true, ...worldmonitorAdapter.calculateDynamicRiskGovernor() });
    }

    // Vibe-Trading: Alpha Zoo, QuantLib & Shadow Account Endpoints
    if (request.method === "GET" && url.pathname === "/api/vibe/status") {
      const snap = vibeTradingAdapter.getVibeTradingSnapshot("BTC/USDT");
      return respond(response, 200, {
        success: true,
        initialized: true,
        hasSourceRepo: vibeTradingAdapter.hasSourceRepo,
        sourcePath: vibeTradingAdapter.sourcePath,
        status: "APPROVED_ACTIVE",
        alphaZooCount: ALPHA_ZOO_REGISTRY.length,
        ...snap,
        snapshot: snap,
        timestamp: new Date().toISOString()
      });
    }
    if (request.method === "GET" && url.pathname === "/api/vibe/alpha-zoo") {
      return respond(response, 200, {
        success: true,
        total: ALPHA_ZOO_REGISTRY.length,
        totalAlphas: ALPHA_ZOO_REGISTRY.length,
        factors: ALPHA_ZOO_REGISTRY,
        catalog: ALPHA_ZOO_REGISTRY,
        timestamp: new Date().toISOString()
      });
    }
    if (request.method === "POST" && url.pathname === "/api/vibe/evaluate-alpha") {
      readJsonBody(request, response).then(payload => {
        try {
          const evalRes = vibeTradingAdapter.evaluateAlphaFactor(payload.alphaId || "Alpha#101", { symbol: payload.symbol || "BTC/USDT" });
          return respond(response, 200, { success: true, alphaId: evalRes.alphaId, evaluation: evalRes, ...evalRes });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/vibe/quantlib/greeks") {
      readJsonBody(request, response).then(payload => {
        try {
          const greeks = vibeTradingAdapter.calculateBlackScholesGreeks(payload);
          return respond(response, 200, { success: true, ...greeks, greeks });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/vibe/quantlib/var") {
      readJsonBody(request, response).then(payload => {
        try {
          const varReport = vibeTradingAdapter.calculateInstitutionalVaR(payload);
          return respond(response, 200, { success: true, ...varReport, varMetrics: varReport });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/vibe/shadow-account") {
      const shadow = vibeTradingAdapter.reconcileShadowAccount();
      return respond(response, 200, { success: true, ...shadow });
    }

    // Autonomous 24/7 Self-Learning & Continuous Improvement Engine Endpoints
    if (request.method === "GET" && url.pathname === "/api/learning/dashboard") {
      return respond(response, 200, autonomousSelfLearningEngine.getDailyLearningReportDashboard());
    }
    if (request.method === "GET" && url.pathname === "/api/learning/modules-status") {
      return respond(response, 200, autonomousSelfLearningEngine.getModulesStatusMatrix());
    }
    if (request.method === "POST" && url.pathname === "/api/learning/run-cycle") {
      readJsonBody(request, response).then(async payload => {
        try {
          const result = await autonomousSelfLearningEngine.runAutonomousLearningCycle(payload.trigger || "MANUAL_UI");
          return respond(response, 200, result);
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/learning/ingest-trade-outcome") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = autonomousSelfLearningEngine.ingestTradeOutcome(payload);
          return respond(response, 200, result);
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }

    // Continuous 24/7 Self-Optimization Daemon & Day-End Report Endpoints
    if (request.method === "GET" && url.pathname === "/api/optimizer/status") {
      return respond(response, 200, continuousSelfOptimizationDaemon.getStatus());
    }
    if (request.method === "POST" && url.pathname === "/api/optimizer/start") {
      continuousSelfOptimizationDaemon.startDaemon();
      return respond(response, 200, { success: true, message: "24/7 Self-Optimization Daemon Started", status: continuousSelfOptimizationDaemon.getStatus() });
    }
    if (request.method === "POST" && url.pathname === "/api/optimizer/stop") {
      continuousSelfOptimizationDaemon.stopDaemon();
      return respond(response, 200, { success: true, message: "24/7 Self-Optimization Daemon Paused", status: continuousSelfOptimizationDaemon.getStatus() });
    }
    if (request.method === "POST" && url.pathname === "/api/optimizer/trigger-now") {
      readJsonBody(request, response).then(async payload => {
        try {
          const result = await continuousSelfOptimizationDaemon.runOptimizationCycle(payload.trigger || "API_TRIGGER");
          return respond(response, 200, result);
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/optimizer/trigger-eod-report") {
      readJsonBody(request, response).then(async payload => {
        try {
          const sendTelegram = payload.sendTelegram !== false;
          const report = await continuousSelfOptimizationDaemon.generateDayEndReport(sendTelegram);
          return respond(response, 200, report);
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/optimizer/daily-reports") {
      return respond(response, 200, { success: true, reports: continuousSelfOptimizationDaemon.getHistoricalReports() });
    }

    // 24/7 Autonomous Auto-Trader v100 Endpoints
    if (request.method === "GET" && url.pathname === "/api/v100/autotrade/status") {
      return respond(response, 200, getAutoTraderStatus());
    }
    if (request.method === "POST" && url.pathname === "/api/v100/autotrade/start") {
      const status = startAutoTrader({ paper, orders, persist });
      return respond(response, 200, status);
    }
    if (request.method === "POST" && url.pathname === "/api/v100/autotrade/stop") {
      const status = stopAutoTrader();
      return respond(response, 200, status);
    }
    if (request.method === "POST" && url.pathname === "/api/v100/autotrade/trigger-now") {
      executeAutonomousTradeCycle({ paper, orders, persist, forceExecute: true }).then(result => {
        return respond(response, 200, result);
      }).catch(err => {
        return respond(response, 500, { success: false, error: err.message });
      });
      return;
    }

    // AI Cognitive Interconnection Neural Bus Endpoints
    if (request.method === "GET" && url.pathname === "/api/ai/interconnection/status") {
      return respond(response, 200, aiInterconnectionBus.getInterconnectionStatus());
    }
    if (request.method === "POST" && url.pathname === "/api/ai/interconnection/synapse") {
      readJsonBody(request, response).then(async payload => {
        try {
          const symbol = payload.symbol || "AAPL";
          const synthesis = await aiInterconnectionBus.synthesizeUnified360Intelligence(symbol);
          return respond(response, 200, { success: true, synthesis });
        } catch (err) {
          return respond(response, 500, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }

    // AI-to-AI Peer Dialogue & Collaborative Reasoning Endpoints
    if (request.method === "GET" && url.pathname === "/api/ai/collaboration/knowledge") {
      return respond(response, 200, getSelfKnowledgeTelemetry());
    }
    if (request.method === "POST" && url.pathname === "/api/ai/collaboration/dialogue") {
      readJsonBody(request, response).then(async payload => {
        try {
          const symbol = payload.symbol || "NVDA";
          const currentPrice = Number(payload.currentPrice || (paper.quotes?.[symbol]?.price || 150.0));
          const proposedAction = payload.action || payload.proposedAction || "BUY";
          const dialogue = await conductAiPeerDialogue({ 
            symbol, 
            currentPrice, 
            proposedAction, 
            marketContext: payload.marketContext || {} 
          });
          return respond(response, 200, { success: true, dialogue });
        } catch (err) {
          return respond(response, 500, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/ai/collaboration/apply") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = applySelfKnowledgeToDecision(payload);
          return respond(response, 200, { success: true, result });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }

    // 24/7 Autonomous Continuous Learning Endpoints
    if (request.method === "GET" && url.pathname === "/api/ai/continuous-learning/status") {
      return respond(response, 200, autonomousSelfLearningEngine.getContinuousLearningStatus());
    }
    if (request.method === "POST" && url.pathname === "/api/ai/continuous-learning/start") {
      readJsonBody(request, response).then(payload => {
        const interval = Number(payload.intervalMs || 60000);
        const status = autonomousSelfLearningEngine.startContinuousLearning(interval);
        return respond(response, 200, { success: true, status });
      }).catch(() => {
        const status = autonomousSelfLearningEngine.startContinuousLearning(60000);
        return respond(response, 200, { success: true, status });
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/ai/continuous-learning/stop") {
      const status = autonomousSelfLearningEngine.stopContinuousLearning();
      return respond(response, 200, { success: true, status });
    }
    if (request.method === "POST" && url.pathname === "/api/ai/continuous-learning/cycle-now") {
      autonomousSelfLearningEngine.runContinuousLearningCycle("MANUAL_REST_TRIGGER").then(result => {
        return respond(response, 200, { success: true, result });
      }).catch(err => {
        return respond(response, 500, { success: false, error: err.message });
      });
      return;
    }

    // Semantic Vector RAG & Fast Setup Retrieval Endpoints
    if (request.method === "GET" && url.pathname === "/api/ai/vector-rag/status") {
      return respond(response, 200, semanticVectorRagEngine.getVaultTelemetry());
    }
    if (request.method === "POST" && url.pathname === "/api/ai/vector-rag/query") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = semanticVectorRagEngine.querySimilarSetups(payload);
          return respond(response, 200, { success: true, result });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/ai/vector-rag/store") {
      readJsonBody(request, response).then(payload => {
        try {
          const entry = semanticVectorRagEngine.storeSetupVector(payload);
          return respond(response, 200, { success: true, entry });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }

    // 5-Stage 24/7 AI Trading Machine Endpoints
    if (request.method === "GET" && url.pathname === "/api/pipeline/status") {
      return respond(response, 200, get5StagePipelineStatus());
    }
    if (request.method === "POST" && url.pathname === "/api/pipeline/scan") {
      runStage1ScannerWithRealData().then(result => {
        return respond(response, 200, { success: true, result });
      }).catch(err => {
        return respond(response, 500, { success: false, error: err.message });
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/pipeline/cycle") {
      readJsonBody(request, response).then(payload => {
        const equity = Number(payload.accountEquity || 100000);
        return runFull5StagePipelineCycle({ accountEquity: equity });
      }).then(result => {
        return respond(response, 200, { success: true, result });
      }).catch(err => {
        return respond(response, 500, { success: false, error: err.message });
      });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/pipeline/decision") {
      readJsonBody(request, response).then(payload => {
        const { decisionId, action, notes } = payload;
        const result = executeHumanDecision(decisionId, action, notes);
        return respond(response, 200, result);
      }).catch(err => {
        return respond(response, 400, { success: false, error: err.message });
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/pipeline/performance") {
      return respond(response, 200, getPerformanceReport());
    }
    if (request.method === "POST" && url.pathname === "/api/pipeline/backtest") {
      readJsonBody(request, response).then(payload => {
        const symbols = payload.symbols || ["BTCUSDT", "ETHUSDT"];
        const interval = payload.interval || "1h";
        return runPipelineBacktest(symbols, interval);
      }).then(result => {
        return respond(response, 200, { success: true, result });
      }).catch(err => {
        return respond(response, 500, { success: false, error: err.message });
      });
      return;
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

    // Next-Gen Institutional Microstructure, Feature Store & Stress-Testing Routes
    if (request.method === "POST" && url.pathname === "/api/lob/simulate") {
      readJsonBody(request, response).then(payload => {
        try {
          const side = payload.side || "BUY";
          const qty = Number(payload.requestedQuantity || 100);
          const result = serverLob.executeMarketOrder(side, qty);
          return respond(response, 200, { success: true, ...result });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/lob/almgren-chriss") {
      readJsonBody(request, response).then(payload => {
        try {
          const trajectory = computeAlmgrenChrissTrajectory(payload || {});
          return respond(response, 200, { success: true, ...trajectory });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/features/store") {
      const symbol = url.searchParams.get("symbol") || "AAPL";
      // Ensure baseline seed if unpopulated
      for (let i = 0; i < 10; i++) {
        realtimeFeatureStore.ingestTick(symbol, { price: 150 + i * 0.2, volume: 500, ofi: 0.1, vpin: 0.12 });
      }
      const features = realtimeFeatureStore.computeFeatureVector(symbol);
      return respond(response, 200, { success: true, features });
    }

    if (request.method === "GET" && url.pathname === "/api/features/psi") {
      const featureKey = url.searchParams.get("feature") || "zScoreMomentum";
      realtimeFeatureStore.setBaselineDistribution(featureKey, [-1.2, -0.8, -0.3, 0.1, 0.4, 0.7, 1.1, 1.4, 1.8, 2.1]);
      const liveSamples = [-0.9, -0.5, 0.0, 0.2, 0.5, 0.8, 1.2, 1.5, 1.9, 2.2];
      const psiResult = realtimeFeatureStore.calculatePopulationStabilityIndex(featureKey, liveSamples);
      return respond(response, 200, { success: true, ...psiResult });
    }

    if (request.method === "POST" && url.pathname === "/api/bandit/allocate") {
      readJsonBody(request, response).then(payload => {
        try {
          const method = (payload.method || "THOMPSON").toUpperCase();
          const cap = Number(payload.totalCapital || 100000);
          const result = method === "UCB1" 
            ? multiArmedBanditAllocator.allocateUCB1(cap)
            : multiArmedBanditAllocator.allocateThompsonSampling(cap);
          return respond(response, 200, { success: true, ...result });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/risk/stress-test") {
      readJsonBody(request, response).then(payload => {
        try {
          const result = runMacroStressTestingMatrix(payload || {});
          return respond(response, 200, { success: true, ...result });
        } catch (err) {
          return respond(response, 400, { success: false, error: err.message });
        }
      }).catch(() => {});
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/risk/evt-tail") {
      const result = computeExtremeValueTheoryTailRisk({});
      return respond(response, 200, { success: true, ...result });
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
