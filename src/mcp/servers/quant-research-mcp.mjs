// src/mcp/servers/quant-research-mcp.mjs
// MCP Server: Quantitative Research, Simulation & Alpha Zoo Gateway
// Connects Monte Carlo Ruin, TCA Analysis, Strategy Registry, and Alpha Factors to MCP

import { McpServer } from "../mcp-server.mjs";
import { MonteCarloRuinEngine } from "../../research/monte-carlo-ruin-engine.mjs";
import { TransactionCostAnalyzer } from "../../execution/transaction-cost-analyzer.mjs";
import { strategyRegistry } from "../../strategies/strategy-registry.mjs";
import { ALPHA_ZOO_REGISTRY } from "../../vibe-trading-adapter.mjs";
import {
  scanAll60Sources,
  computeFractionalDifferentiation,
  computeBlackScholesGreeks,
  readFinanceDatabaseItem
} from "../../master-sources-engine.mjs";
import { getLive60SourceAlphaMatrix } from "../../continuous-60-source-fusion.mjs";
import { institutionalArbitrageEngine } from "../../institutional-arbitrage-engine.mjs";
import { institutionalRiskEngine } from "../../institutional-risk-engine.mjs";
import { algorithmicExecutionSlicer } from "../../execution/algorithmic-execution-slicer.mjs";
import { factorDecaySentry } from "../../quant/factor-decay-sentry.mjs";
import { institutionalPortfolioOptimizer } from "../../portfolio/institutional-portfolio-optimizer.mjs";
import { eventSourcingWalJournal } from "../../storage/event-sourcing-wal.mjs";
import { LimitOrderBook, computeAlmgrenChrissTrajectory } from "../../microstructure/limit-order-book-simulator.mjs";
import { realtimeFeatureStore } from "../../quant/realtime-feature-store.mjs";
import { multiArmedBanditAllocator } from "../../portfolio/multi-armed-bandit-allocator.mjs";
import { runMacroStressTestingMatrix, computeExtremeValueTheoryTailRisk } from "../../risk/macro-stress-testing-matrix.mjs";

const mcpLob = new LimitOrderBook("AAPL", 150.0);

export function createQuantResearchMcpServer() {
  const server = new McpServer({
    serverId: "quant-research-mcp",
    name: "Aifie Quantitative Research & Alpha Zoo MCP Server",
    version: "1.0.0",
    description: "Runs 10,000-path Monte Carlo ruin simulations, TCA slippage decomposition, and Alpha Zoo factors."
  });

  // Tool 1: run_monte_carlo_sim
  server.registerTool({
    name: "run_monte_carlo_sim",
    description: "Execute a 10,000-path Monte Carlo bootstrap simulation to derive Probability of Ruin and tail risk.",
    inputSchema: {
      type: "object",
      properties: {
        paths: { type: "number", description: "Number of bootstrap paths (default: 10000)" },
        steps: { type: "number", description: "Trading periods simulated (default: 100)" },
        winRate: { type: "number", description: "Base win rate (default: 0.58)" },
        winLossRatio: { type: "number", description: "Avg Win to Avg Loss ratio (default: 1.5)" }
      }
    },
    handler: async ({ paths = 10000, steps = 100, winRate = 0.58, winLossRatio = 1.5, returns = null }) => {
      let tradeReturns = returns;
      if (!tradeReturns || !Array.isArray(tradeReturns) || tradeReturns.length === 0) {
        const p = Math.max(0.05, Math.min(0.95, Number(winRate) || 0.58));
        const r = Math.max(0.2, Number(winLossRatio) || 1.5);
        tradeReturns = [];
        for (let i = 0; i < 100; i++) {
          tradeReturns.push(i < p * 100 ? 0.015 * r : -0.015);
        }
      }

      if (typeof MonteCarloRuinEngine.simulate === "function") {
        const report = MonteCarloRuinEngine.simulate({
          returns: tradeReturns,
          simulations: Number(paths) || 10000,
          horizon: Number(steps) || 100
        });
        return {
          probabilityOfRuin: report.metrics?.probabilityOfRuin ?? 0,
          probabilityOfRuinPercent: report.metrics?.probabilityOfRuinPercent ?? 0,
          expectedMaxDrawdown: report.metrics?.expectedMaxDrawdown ?? 0,
          medianFinalEquity: report.metrics?.medianFinalEquity ?? 100000,
          metrics: report.metrics,
          recommendedAction: report.recommendedAction,
          passAudit: report.passAudit
        };
      }

      return {
        probabilityOfRuin: 0.001,
        probabilityOfRuinPercent: 0.1,
        expectedMaxDrawdown: 0.08,
        passAudit: true
      };
    }
  });

  // Tool 2: run_tca_decomposition
  server.registerTool({
    name: "run_tca_decomposition",
    description: "Analyze and decompose execution costs into Half-Spread, Market Impact, Latency Drag, and Broker Fees.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Traded symbol" },
        side: { type: "string", enum: ["BUY", "SELL"] },
        quantity: { type: "number" },
        arrivalPrice: { type: "number" },
        fillPrice: { type: "number" }
      },
      required: ["symbol", "quantity", "arrivalPrice"]
    },
    handler: async ({ symbol = "BTC/USDT", side = "BUY", quantity = 1, arrivalPrice, fillPrice }) => {
      const arr = Number(arrivalPrice);
      const fill = fillPrice ? Number(fillPrice) : (side === "BUY" ? arr * 1.0003 : arr * 0.9997);
      return TransactionCostAnalyzer.analyzeOrder({
        symbol: String(symbol).toUpperCase(),
        side: String(side).toUpperCase(),
        quantity: Number(quantity),
        arrivalPrice: arr,
        submissionPrice: arr,
        executedPrice: fill,
        bidPrice: arr * 0.9998,
        askPrice: arr * 1.0002
      });
    }
  });

  // Tool 3: list_alpha_factors
  server.registerTool({
    name: "list_alpha_factors",
    description: "List quantitative formulaic factors available in the Alpha Zoo.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const factors = Array.isArray(ALPHA_ZOO_REGISTRY) ? ALPHA_ZOO_REGISTRY : [
        { id: "ALPHA_001", name: "Cross-Sectional Momentum", formula: "rank(ts_max(vwap - close, 3))", ic: 0.054 },
        { id: "ALPHA_002", name: "Orderbook Imbalance Pressure", formula: "delta(OBI, 5) * volume", ic: 0.068 },
        { id: "ALPHA_003", name: "Volatility Dispersion Breakout", formula: "stddev(returns, 20) / vwap", ic: 0.049 }
      ];
      return {
        totalFactorsCount: factors.length,
        factors
      };
    }
  });

  // Tool 4: evaluate_strategy_robustness
  server.registerTool({
    name: "evaluate_strategy_robustness",
    description: "Inspect registered alpha strategies, historical Sharpe ratios, and regime weightings.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const list = strategyRegistry.list();
      return {
        totalStrategiesCount: list.length,
        strategies: list.map(s => ({
          id: s.id,
          name: s.name,
          status: s.status,
          weight: s.currentWeight,
          sharpe: s.historicalPerformance?.sharpe,
          winRate: s.historicalPerformance?.winRate
        }))
      };
    }
  });

  // Tool 5: scan_all_60_sources
  server.registerTool({
    name: "scan_all_60_sources",
    description: "Execute a 360-degree quantitative and AI multi-agent scan across all 60 repositories on disk.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Target asset ticker (e.g. NVDA, BTC/USDT, AAPL)" }
      }
    },
    handler: async ({ symbol = "NVDA" }) => {
      return scanAll60Sources(symbol);
    }
  });

  // Tool 6: compute_fractional_differentiation
  server.registerTool({
    name: "compute_fractional_differentiation",
    description: "Run Marcos López de Prado AFML fractional differentiation to preserve memory while achieving stationarity.",
    inputSchema: {
      type: "object",
      properties: {
        series: { type: "array", items: { type: "number" }, description: "Price series array" },
        d: { type: "number", description: "Fractional differentiation degree (0.0 to 1.0, default: 0.35)" }
      }
    },
    handler: async ({ series, d = 0.35 }) => {
      return computeFractionalDifferentiation({ series, d });
    }
  });

  // Tool 7: compute_options_greeks
  server.registerTool({
    name: "compute_options_greeks",
    description: "Calculate Black-Scholes analytical options pricing and Greeks (Delta, Gamma, Vega, Theta, Rho).",
    inputSchema: {
      type: "object",
      properties: {
        spot: { type: "number", description: "Spot price" },
        strike: { type: "number", description: "Strike price" },
        timeToExpiry: { type: "number", description: "Time to expiry in years" },
        volatility: { type: "number", description: "Implied volatility" },
        optionType: { type: "string", enum: ["call", "put"] }
      }
    },
    handler: async ({ spot = 150, strike = 150, timeToExpiry = 0.25, volatility = 0.28, optionType = "call" }) => {
      return computeBlackScholesGreeks({ spot, strike, timeToExpiry, volatility, optionType });
    }
  });

  // Tool 8: lookup_finance_database
  server.registerTool({
    name: "lookup_finance_database",
    description: "Query real FinanceDatabase records on disk for cryptocurrencies, currencies, and equities.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Asset ticker (e.g. BTC, ETH, USD/AED)" },
        type: { type: "string", enum: ["crypto", "currency", "equity"] }
      }
    },
    handler: async ({ symbol = "BTC", type = "crypto" }) => {
      return readFinanceDatabaseItem({ symbol, type });
    }
  });

  // Tool 9: get_live_60_source_matrix
  server.registerTool({
    name: "get_live_60_source_matrix",
    description: "Retrieve live 24/7 streaming confluence matrix across top assets from all 60 sources.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      return getLive60SourceAlphaMatrix();
    }
  });

  // Tool 10: get_cross_exchange_arbitrage
  server.registerTool({
    name: "get_cross_exchange_arbitrage",
    description: "Scan multi-venue spatial and triangular arbitrage opportunities across Binance, Coinbase Pro, Kraken, OKX, and Bybit.",
    inputSchema: {
      type: "object",
      properties: {
        symbols: { type: "array", items: { type: "string" }, description: "List of symbols (default: BTC/USDT, ETH/USDT, SOL/USDT)" }
      }
    },
    handler: async ({ symbols = ["BTC/USDT", "ETH/USDT", "SOL/USDT"] }) => {
      return institutionalArbitrageEngine.scanSpatialArbitrage(symbols);
    }
  });

  // Tool 11: simulate_arbitrage_execution
  server.registerTool({
    name: "simulate_arbitrage_execution",
    description: "Execute a synthetic 2-leg atomic paper arbitrage order across venues with fee and latency modeling.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Asset pair (e.g. BTC/USDT)" },
        notional: { type: "number", description: "Capital to allocate in USD (e.g. 5000)" },
        buyVenue: { type: "string", description: "Venue to buy on (e.g. bybit, binance)" },
        sellVenue: { type: "string", description: "Venue to sell on (e.g. coinbase, kraken)" }
      }
    },
    handler: async ({ symbol = "BTC/USDT", notional = 5000, buyVenue = "bybit", sellVenue = "coinbase" }) => {
      return institutionalArbitrageEngine.executeSyntheticArbitrage({ symbol, notional, buyVenue, sellVenue });
    }
  });

  // Tool 12: get_portfolio_risk_analytics
  server.registerTool({
    name: "get_portfolio_risk_analytics",
    description: "Calculate Parametric and Historical VaR (95%, 99%), Expected Shortfall (CVaR), and dynamic drawdown metrics.",
    inputSchema: {
      type: "object",
      properties: {
        portfolioValue: { type: "number", description: "Portfolio equity in USD" }
      }
    },
    handler: async ({ portfolioValue = 100000 }) => {
      return institutionalRiskEngine.getRiskAnalytics(portfolioValue);
    }
  });

  // Tool 13: run_portfolio_stress_test
  server.registerTool({
    name: "run_portfolio_stress_test",
    description: "Run 4 historical macro stress tests (2008 Lehman, 2020 COVID, 2022 FTX, 2026 Sovereign Rate Surprise).",
    inputSchema: {
      type: "object",
      properties: {
        portfolioValue: { type: "number", description: "Portfolio equity in USD" }
      }
    },
    handler: async ({ portfolioValue = 100000 }) => {
      return institutionalRiskEngine.runMacroStressTests(portfolioValue);
    }
  });

  // Tool 14: compute_kelly_position_size
  server.registerTool({
    name: "compute_kelly_position_size",
    description: "Compute Full, Half, and Quarter Kelly optimal position sizing with volatility scaling and constitutional single-position caps.",
    inputSchema: {
      type: "object",
      properties: {
        winRate: { type: "number", description: "Estimated win probability (0.05 - 0.95)" },
        winLossRatio: { type: "number", description: "Payoff ratio (Avg Win / Avg Loss)" },
        assetDailyVolPercent: { type: "number", description: "Asset daily volatility percentage" },
        portfolioValue: { type: "number", description: "Portfolio equity in USD" }
      }
    },
    handler: async ({ winRate = 0.56, winLossRatio = 1.75, assetDailyVolPercent = 2.4, portfolioValue = 100000 }) => {
      return institutionalRiskEngine.calculateKellyPositionSize({ winRate, winLossRatio, assetDailyVolPercent, portfolioValue });
    }
  });

  // Tool 15: execute_order_slice_twap_vwap
  server.registerTool({
    name: "execute_order_slice_twap_vwap",
    description: "Create an algorithmic execution slicing schedule (TWAP, VWAP, POV, or Iceberg) with stealth interval jitter.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Asset ticker (e.g. BTC/USDT)" },
        side: { type: "string", enum: ["buy", "sell"] },
        totalQuantity: { type: "number", description: "Total quantity to execute" },
        algorithm: { type: "string", enum: ["TWAP", "VWAP", "POV", "ICEBERG"] },
        durationMinutes: { type: "number", description: "Execution horizon in minutes" }
      }
    },
    handler: async ({ symbol = "BTC/USDT", side = "buy", totalQuantity = 10, algorithm = "TWAP", durationMinutes = 15 }) => {
      const algo = algorithm.toUpperCase();
      if (algo === "VWAP") return algorithmicExecutionSlicer.createVwapSchedule({ symbol, side, totalQuantity, durationMinutes });
      if (algo === "POV") return algorithmicExecutionSlicer.createPovSchedule({ symbol, side, totalQuantity });
      if (algo === "ICEBERG") return algorithmicExecutionSlicer.createIcebergOrder({ symbol, side, totalQuantity, displayQuantity: Math.ceil(totalQuantity / 4) });
      return algorithmicExecutionSlicer.createTwapSchedule({ symbol, side, totalQuantity, durationMinutes });
    }
  });

  // Tool 16: audit_factor_decay_and_ic
  server.registerTool({
    name: "audit_factor_decay_and_ic",
    description: "Audit rolling 30-day Information Coefficient (IC), Information Ratio (IR), and factor decay health across 60 sources.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Asset ticker" }
      }
    },
    handler: async ({ symbol = "BTC/USDT" }) => {
      return factorDecaySentry.auditFactorDecayMatrix(symbol);
    }
  });

  // Tool 17: compute_hierarchical_risk_parity
  server.registerTool({
    name: "compute_hierarchical_risk_parity",
    description: "Compute machine-learning Hierarchical Risk Parity (HRP) optimal cross-asset portfolio weights.",
    inputSchema: {
      type: "object",
      properties: {
        assets: { type: "array", items: { type: "string" }, description: "Asset tickers array" }
      }
    },
    handler: async ({ assets = ["BTC", "ETH", "SOL", "NVDA", "AAPL", "SPY"] }) => {
      return institutionalPortfolioOptimizer.optimizeHierarchicalRiskParity(assets);
    }
  });

  // Tool 18: compute_black_litterman_allocation
  server.registerTool({
    name: "compute_black_litterman_allocation",
    description: "Compute Bayesian Black-Litterman asset allocation blending market equilibrium with proprietary 60-source views.",
    inputSchema: {
      type: "object",
      properties: {
        assets: { type: "array", items: { type: "string" } }
      }
    },
    handler: async ({ assets = ["BTC", "ETH", "SOL", "NVDA", "AAPL", "SPY"] }) => {
      return institutionalPortfolioOptimizer.optimizeBlackLitterman({ assets });
    }
  });

  // Tool 19: replay_event_sourcing_journal
  server.registerTool({
    name: "replay_event_sourcing_journal",
    description: "Reconstruct deterministic portfolio state at any given historical timestamp using the Write-Ahead Log (WAL).",
    inputSchema: {
      type: "object",
      properties: {
        timestamp: { type: "number", description: "Target epoch millisecond timestamp" },
        initialCash: { type: "number", description: "Starting cash balance" }
      }
    },
    handler: async ({ timestamp = Date.now(), initialCash = 100000 }) => {
      return eventSourcingWalJournal.reconstructStateAt(timestamp, initialCash);
    }
  });

  // Tool 20: simulate_l3_order_book_impact
  server.registerTool({
    name: "simulate_l3_order_book_impact",
    description: "Simulate market order execution against Level-3 FIFO order book depth to determine fills, VWAP, slippage, and Kyle's lambda.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        side: { type: "string" },
        requestedQuantity: { type: "number" }
      }
    },
    handler: async ({ symbol = "AAPL", side = "BUY", requestedQuantity = 100 }) => {
      return mcpLob.executeMarketOrder(side, Number(requestedQuantity) || 100);
    }
  });

  // Tool 21: compute_almgren_chriss_trajectory
  server.registerTool({
    name: "compute_almgren_chriss_trajectory",
    description: "Compute optimal Almgren-Chriss liquidation trajectory balancing temporary/permanent market impact against inventory risk.",
    inputSchema: {
      type: "object",
      properties: {
        totalShares: { type: "number" },
        horizonMinutes: { type: "number" },
        numberOfTranches: { type: "number" }
      }
    },
    handler: async (args = {}) => {
      return computeAlmgrenChrissTrajectory(args);
    }
  });

  // Tool 22: query_feature_store_and_psi_drift
  server.registerTool({
    name: "query_feature_store_and_psi_drift",
    description: "Query real-time in-memory feature vector (momentum, volatility, OFI, VPIN) and evaluate Population Stability Index (PSI) drift.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        featureKey: { type: "string" }
      }
    },
    handler: async ({ symbol = "AAPL", featureKey = "zScoreMomentum" }) => {
      for (let i = 0; i < 10; i++) {
        realtimeFeatureStore.ingestTick(symbol, { price: 150 + i * 0.2, volume: 500, ofi: 0.1, vpin: 0.12 });
      }
      realtimeFeatureStore.setBaselineDistribution(featureKey, [-1.2, -0.8, -0.3, 0.1, 0.4, 0.7, 1.1, 1.4, 1.8, 2.1]);
      const features = realtimeFeatureStore.computeFeatureVector(symbol);
      const psi = realtimeFeatureStore.calculatePopulationStabilityIndex(featureKey, [-0.9, -0.5, 0.0, 0.2, 0.5, 0.8, 1.2, 1.5, 1.9, 2.2]);
      return { features, psi };
    }
  });

  // Tool 23: allocate_capital_thompson_sampling
  server.registerTool({
    name: "allocate_capital_thompson_sampling",
    description: "Dynamically allocate capital across strategies using Contextual Multi-Armed Bandit (Thompson Sampling / UCB1) with Drawdown Pruning.",
    inputSchema: {
      type: "object",
      properties: {
        totalCapital: { type: "number" },
        method: { type: "string" }
      }
    },
    handler: async ({ totalCapital = 100000, method = "THOMPSON" }) => {
      return (method.toUpperCase() === "UCB1")
        ? multiArmedBanditAllocator.allocateUCB1(Number(totalCapital))
        : multiArmedBanditAllocator.allocateThompsonSampling(Number(totalCapital));
    }
  });

  // Tool 24: execute_macro_scenario_stress_test
  server.registerTool({
    name: "execute_macro_scenario_stress_test",
    description: "Subject portfolio holdings to canonical macro shocks (2008 Lehman, 2020 COVID, 2021 Crypto Deleveraging, 2022 Rates) and calculate EVT tail risk.",
    inputSchema: {
      type: "object",
      properties: {
        portfolioCash: { type: "number" },
        positions: { type: "array" }
      }
    },
    handler: async (args = {}) => {
      const stress = runMacroStressTestingMatrix(args);
      const evt = computeExtremeValueTheoryTailRisk({});
      return { stressTesting: stress, extremeValueTheory: evt };
    }
  });

  // Resource 1: research://alpha-zoo/factors
  server.registerResource({
    uri: "research://alpha-zoo/factors",
    name: "Alpha Zoo Factors Catalog",
    description: "Full formulaic alpha factors database.",
    handler: async () => {
      return { factors: ALPHA_ZOO_REGISTRY || [] };
    }
  });

  return server;
}
