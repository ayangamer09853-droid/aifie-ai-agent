# Aifie AI Agent

[![Aifie 24/7 Cloud Daemon](https://github.com/ayangamer09853-droid/aifie-ai-agent/actions/workflows/aifie-247-cloud-daemon.yml/badge.svg)](https://github.com/ayangamer09853-droid/aifie-ai-agent/actions/workflows/aifie-247-cloud-daemon.yml)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ayangamer09853-droid/aifie-ai-agent)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/deploy?template=https://github.com/ayangamer09853-droid/aifie-ai-agent)
[![Test Suites](https://img.shields.io/badge/Tests-86%2F86%20Passing-brightgreen)](file:///f:/ayan%20foider/projacts/aifie%20ai%20agent/test)
[![Architecture](https://img.shields.io/badge/Architecture-Phase%200--20%20Apex-blueviolet)](file:///f:/ayan%20foider/projacts/aifie%20ai%20agent/AIFIE_MASTER_SYSTEM_ARCHITECTURE.md)

**Aifie AI Agent** is an institutional-grade, zero-human autonomous algorithmic trading system and research platform. Built on native Node.js ESM, Aifie integrates real-time market data ingestion, quantitative backtesting with statistical falsification, algorithmic execution with smart order routing (SOR), quantum-resistant security, and constitutional capital constraints.

---

## 🚀 Quick Start

### 1. Launch Server
```powershell
npm start
```
- Open `http://127.0.0.1:8787` for the Institutional Web Dashboard.
- API Health Status: `http://127.0.0.1:8787/api/status`

### 2. Run Comprehensive Test Suite
```powershell
npm test
```
All 12 core test suites pass with a **100% pass rate (86/86 passing tests)**.

---

## 🏛️ Comprehensive Architecture (Phases 0–20)

| Phase | Subsystem | Key Modules | Verified Status |
|---|---|---|---|
| **Phase 0** | **Core Foundation & Safeguards** | Minimal `server.mjs`, fail-closed order gate, `.ai/` tracking | ✅ Verified |
| **Phase 1 & W2** | **Market Data & Consensus** | IEX Cloud, Polygon.io, Binance, CoinGecko, Ring-Buffer Timeseries | ✅ Verified |
| **Phase 2 & W3** | **Institutional Execution** | Alpaca Broker, Smart Order Router (SOR), TWAP/VWAP/Iceberg, Double-Entry Ledger | ✅ Verified |
| **Phase 3 & W4** | **Discrete Backtest & Falsification** | Discrete candle simulation, CPCV (16 splits), Hansen SPA, Deflated Sharpe, Monte Carlo | ✅ Verified |
| **Phase 4 & W5** | **Portfolio Risk Fortress** | Parametric/Historical VaR, CVaR, Euler Risk Budgeting, Black-Scholes Put Hedging | ✅ Verified |
| **Phase 5 & W7** | **Alpha Lab & Strategy Megafactory** | 1,000+ catalog strategies, Cointegration (ADF/Kalman), VPIN Toxicity, SMC Patterns | ✅ Verified |
| **Phase 6 & W9** | **Swarm & Master Nexus Loop** | 10 Specialized Lanes, 3-of-5 BFT Quorum, HMAC Mobile Push Approval, Keepalive | ✅ Verified |
| **Phase 7** | **Multimodal Vision & Voice** | Chart Vision, Headless Canvas Capture, Speech-to-Text, SAPI Audio Feedback | ✅ Verified |
| **Phase 8** | **Quantum-Resistant Security Vault** | AES-256-GCM, ML-KEM-768 Lattice, ML-DSA-65 Signatures, Shamir 3-of-5 Secret Sharing | ✅ Verified |
| **Phases 9–10** | **Order Flow & Cross-Exchange Arb** | Cumulative Volume Delta (CVD), Whale Walls >$500k, Spatial & Triangular Arbitrage | ✅ Verified |
| **Constitution** | **Capital Constraints Governor** | 8 Hard Rules ($1k loss ceiling, 20% DD brake, 2x leverage cap, 20% profit sweep) | ✅ Verified |
| **Live Creds** | **Active Paper Account & Live Feeds** | Alpaca ($100k cash, $398k buying power), CoinGecko (Demo), Polygon.io (Active) | ✅ Active |

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

## 💻 Cloud Virtual Computer & Multi-Cloud Deployment

Deploy your 24/7 sovereign cloud node on Oracle Always Free Tier or standard Linux VPS:
```bash
sudo ./deploy-cloud-vcomputer.sh
```
- **Ubuntu Desktop**: 4K XFCE GUI streaming over WebSockets on port `3000/3001`.
- **Persistent Cloud Browser**: 24/7 background tasks and scrapers in Chromium.
- **Web Terminal**: Instant `ttyd` web shell on port `7681`.
- **Render.com / Railway**: Auto-deployable zero-downtime microservice.
