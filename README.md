# Aifie AI Agent

[![Aifie 24/7 Cloud Daemon](https://github.com/ayangamer09853-droid/aifie-ai-agent/actions/workflows/aifie-247-cloud-daemon.yml/badge.svg)](https://github.com/ayangamer09853-droid/aifie-ai-agent/actions/workflows/aifie-247-cloud-daemon.yml)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ayangamer09853-droid/aifie-ai-agent)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/deploy?template=https://github.com/ayangamer09853-droid/aifie-ai-agent)
[![Test Suites](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen)](file:///f:/ayan%20foider/projacts/aifie%20ai%20agent/test)
[![Architecture](https://img.shields.io/badge/Architecture-NextGen%20Institutional%20Framework-blueviolet)](file:///f:/ayan%20foider/projacts/aifie%20ai%20agent/AIFIE_MASTER_SYSTEM_ARCHITECTURE.md)
[![Telegram Bot](https://img.shields.io/badge/Telegram%20Bot-28%20Commands%20%2B%20NLP%20%2B%20TMA-0088cc)](file:///f:/ayan%20foider/projacts/aifie%20ai%20agent/src/telegram-trading-suite.mjs)
[![MCP Suite](https://img.shields.io/badge/MCP%20Tools-24%20Tools-orange)](file:///f:/ayan%20foider/projacts/aifie%20ai%20agent/src/mcp/servers/quant-research-mcp.mjs)

**Aifie AI Agent** is an institutional-grade, autonomous quantitative trading system, research platform, and Telegram trading suite. Built purely on native Node.js ESM (zero external dependencies), Aifie integrates real-time market data ingestion, quantitative backtesting with statistical falsification, algorithmic execution slicing (TWAP, VWAP, POV, Iceberg), Level-3 Limit Order Book (LOB) queue dynamics, Almgren-Chriss optimal execution trajectories, a zero-latency in-memory Feature Store with Population Stability Index (PSI) drift sentry, Contextual Multi-Armed Bandit strategy allocation, historical macro crisis stress-testing, Extreme Value Theory (EVT) tail risk modeling, Model Context Protocol (MCP) servers, and a 28-command conversational Telegram trading suite with Telegram Mini-App (TMA) WebApp integration.

---

## 🚀 Quick Start

### 1. Launch Server
```powershell
npm start
```
- Open `http://127.0.0.1:8787` for the Institutional Web Dashboard & Trading Terminal.
- API Health Status: `http://127.0.0.1:8787/api/status`
- Performance Telemetry: `http://127.0.0.1:8787/api/performance/telemetry`

### 2. Run Comprehensive Test Suite
```powershell
npm test
```
All test suites pass with a **100% pass rate**.

---

## ⚡ Next-Generation Institutional Framework

### 1. Microstructure L3 Limit Order Book & Almgren-Chriss Engine
- **Module**: [`src/microstructure/limit-order-book-simulator.mjs`](file:///f:/ayan%20foider/projacts/aifie%20ai%20agent/src/microstructure/limit-order-book-simulator.mjs)
- **Synthetic L3 LOB**: Maintains sorted bid/ask price ladders with FIFO queue priority, partial fills, dynamic spread widening, and order book imbalance tracking.
- **Kyle's Lambda Estimation**: Automatically measures empirical price impact per executed dollar ($\Delta P = \lambda \cdot Q$).
- **Almgren-Chriss (2000) Trajectory Calculus**: Dynamically calculates discrete optimal trading schedules $(n_1, \dots, n_N)$ balancing temporary market impact ($\eta$), permanent market impact ($\gamma$), and portfolio holding risk ($\lambda \sigma^2$).

### 2. Real-Time In-Memory Feature Store & PSI Drift Sentry
- **Module**: [`src/quant/realtime-feature-store.mjs`](file:///f:/ayan%20foider/projacts/aifie%20ai%20agent/src/quant/realtime-feature-store.mjs)
- **Zero-Latency Feature Cache**: Serves vector snapshots with sub-millisecond lookup (Z-score momentum, Parkinson/Garman-Klass extreme-value volatility, Order Flow Imbalance, VPIN, rolling Kalman beta, sentiment).
- **Population Stability Index (PSI) Sentry**: Compares live empirical distributions against baseline reference distributions, applying automated alpha dampeners for drifting features ($PSI \ge 0.25$).

### 3. Contextual Multi-Armed Bandit Strategy Allocator
- **Module**: [`src/portfolio/multi-armed-bandit-allocator.mjs`](file:///f:/ayan%20foider/projacts/aifie%20ai%20agent/src/portfolio/multi-armed-bandit-allocator.mjs)
- **Thompson Sampling & UCB1**: Samples from Beta posterior distributions $\text{Beta}(\alpha_i, \beta_i)$ to route capital to currently winning strategies while maintaining exploratory allocations.
- **Automated Drawdown Pruning**: Reduces capital by 50% if rolling drawdown exceeds 3%, and completely prunes allocation to 0% if drawdown breaches 5%.

### 4. Macro Crisis Stress-Testing Matrix & EVT Tail Risk
- **Module**: [`src/risk/macro-stress-testing-matrix.mjs`](file:///f:/ayan%20foider/projacts/aifie%20ai%20agent/src/risk/macro-stress-testing-matrix.mjs)
- **Historical Crisis Scenarios**: Evaluates portfolio behavior under the 2008 Lehman GFC ($-8.5\%$, 4x spreads), 2020 COVID Crash ($-12\%$, $VIX > 80$), 2021 Crypto Deleveraging ($-35\%$), and 2022 Fed Rate Hikes (+150bps).
- **Extreme Value Theory (EVT)**: Peaks-Over-Threshold (POT) Generalized Pareto Distribution (GPD) modeling fat-tail risk ($VaR_{99.9\%}$ and Expected Shortfall $CVaR_{99.9\%}$).

### 5. Algorithmic Execution Slicing & Factor Decay
- **Algorithmic Slicers** (`src/execution/algorithmic-execution-slicer.mjs`): TWAP with randomized stealth jitter ($\pm 15\%$), VWAP with intraday U-curve, POV participation caps ($\le 10\%$), and Iceberg depth refreshing.
- **Factor Decay Sentry** (`src/quant/factor-decay-sentry.mjs`): Rolling 30-day IC/IR tracking, dynamic regime-conditioned weights, and Bailey & Lopez de Prado Deflated Sharpe Ratio (DSR).
- **Portfolio Optimizer** (`src/portfolio/institutional-portfolio-optimizer.mjs`): Hierarchical Risk Parity (HRP) clustering, Black-Litterman Bayesian allocation, and drift rebalancing.
- **Event-Sourcing WAL** (`src/storage/event-sourcing-wal.mjs`): High-throughput append-only Write-Ahead Log with deterministic historical state replay.

---

## 📱 Telegram Trading Suite (28 Commands + NLP + TMA WebApp)

- **Mobile Terminal Commands**:
  - `/start` — Welcome dashboard, account balances, quick-action keyboard
  - `/positions` — Open positions with live P&L and 1-tap close
  - `/deposit` — Multi-chain token & memecoin deposits (Solana + EVM)
  - `/bridge` — Cross-chain bridge router with gas estimation
  - `/withdraw` — USDC withdrawal processor with network selector
  - `/transfer` — Instant zero-fee P2P USDC transfers
  - `/wallets` — Multi-chain wallet manager (Solana + EVM)
  - `/profiles` — Risk profile switcher (Scalp, Swing, Yield, Swarm)
  - `/orders` — Resting limit orders and execution status
  - `/dca` — Dollar-cost averaging ladder builder
  - `/alerts` — Real-time price target alerts
  - `/export` — RFC-4180 compliant CSV trade journal export
  - `/settings` & `/slippage` — Trading preferences and slippage bounds (0.5%–5%)
  - `/trade_panel_settings` — Customize Telegram button layouts
  - `/autobuy` — Auto-buy on contract address paste with safety filters
  - `/language` — Multilingual support (English, 中文, Español, हिन्दी)
  - `/sources` & `/scan` — 60-source institutional alpha matrix and scanner
  - `/arbitrage` & `/risk` — Cross-exchange spatial spreads and VaR fortress
  - `/app` & `/terminal` — Launch Telegram Mini-App (TMA) WebApp
  - `/nlp [prompt]` — Conversational natural language trading (e.g., `"buy 25 AAPL using twap over 45 minutes"`, `"run stress test 2020 covid"`)
  - `/bots`, `/docs`, `/support`, `/help` — Community, referral program, docs, and directory
- **Headless SVG Vector Charts**: Generates dark-theme SVG price charts delivered directly into Telegram chats.

---

## 🌐 Institutional Web Dashboard & Terminal

- **Live Level-2 Order Book Depth Ladder**: Visual depth curves, best bid/ask, spread indicator, and order imbalance meter.
- **Real-Time Web Audio API Synthesizer**: Acoustic micro-tones for order placement (D5 $\to$ A5), fills (E5 $\to$ C6), and risk warnings (220Hz saw).
- **Server-Sent Events (SSE) Stream**: Zero-latency live updates across 60 sources, arbitrage radar, and portfolio telemetry.
- **60 FPS HTML5 Canvas Candlestick Chart**: Interactive zoom/pan, EMA 20/50 overlays, and Smart Money Concepts (SMC Fair Value Gaps and Order Blocks).

---

## 🔌 Model Context Protocol (MCP) Server Suite (24 Tools)

Aifie provides an extensible JSON-RPC 2.0 MCP Hub exposing 24 tools across 6 specialized servers:
- **`market-data-mcp`**: Real-time quotes, tick feeds, orderbook snapshots
- **`execution-broker-mcp`**: Paper balances, positions, orders, circuit breaker reset
- **`risk-sentinel-mcp`**: VaR audits, Kelly position sizing, drawdown checks
- **`quant-research-mcp`**: Monte Carlo ruin simulations, TCA decomposition, 60-source alpha matrix, TWAP/VWAP execution slicing, factor decay audits, HRP optimization, Black-Litterman allocation, WAL replay, L3 LOB matching, Almgren-Chriss trajectories, Feature Store PSI drift, Thompson Sampling bandit allocation, and macro crisis stress testing
- **`system-diagnostics-mcp`**: 8-plane diagnostics, event journal replay
- **`external-bridge-mcp`**: CoinGecko, Polygon, macro news feeds

---

## 🛡️ Constitutional Invariants (8 Hard Rules)

1. **Daily Loss Ceiling**: Trading halts if net daily loss reaches `$1,000`.
2. **Peak-to-Trough Drawdown Brake**: $>20\%$ drawdown triggers mandatory 50% deleveraging.
3. **Gross Portfolio Leverage Cap**: Bounded to $\le 2.0\times$ equity.
4. **Single-Asset Concentration Cap**: No single symbol may exceed $25\%$ of portfolio.
5. **24-Hour Rolling Order Throttle**: Maximum of $1,000$ trades per rolling 24-hour cycle.
6. **Options Delta Boundary**: Net options delta bounded to $\le 50\%$ notional equity.
7. **Sovereign Profit Reserve Sweep**: Automatically sweeps $20\%$ of profits above `$10,000` to cold reserve.
8. **Byzantine Fault Tolerant Quorum**: Requires $\ge 3$-of-$5$ agent consensus before order routing.

---

## 🔑 Configured & Verified Live Providers

- **Alpaca Broker (Paper Trading)**:
  - Account Status: `ACTIVE`
  - Cash Balance: `$100,000.00`
  - Buying Power: `$398,367.11`
  - Endpoints: `https://paper-api.alpaca.markets/v2`
- **CoinGecko Demo API**:
  - Live Bitcoin quote authenticated via `x-cg-demo-api-key` header & query param (`$81,147`).
- **Polygon.io API**:
  - Real-time stock quote and previous-day aggregate fallback (`AAPL` at `$328.21`).
- **Live Trading Mode**:
  - Unlocked via `ENABLE_LIVE_TRADING=true` and `LIVE_TRADING_ENABLED=true` in `.env`.

