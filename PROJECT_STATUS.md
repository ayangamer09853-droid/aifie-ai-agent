# Project Status: Aifie AI Agent Foundation

## Authoritative System State

```yaml
version: 1.3.1
architecture: Graph-Engineered Cognitive Financial Architecture & 24/7 Mining Swarm
runtime:
  engine: Node.js (ESM Native)
  status: OPERATIONAL
  port: 8787
  cloud_port: 10000
  zero_external_dependencies: true

mining_247:
  status: OPERATIONAL_247
  engine: Native OS Worker Threads (node:worker_threads)
  stratum_v1_proxy: ACTIVE (port 3333, external ASIC multiplexer)
  active_pool: sha256.poolbinance.com:443
  failover_pools: btc.poolbinance.com:1800, bs.poolbinance.com:3333
  worker_account: aifieming001.001
  watchdog: ACTIVE (15s heartbeats, auto-recovery, dynamic failover)
  supervisor: ACTIVE (run-247-mining-supervisor.ps1, START_247_MINER.bat)
  state_persistence: data/mining-cluster-state.json

trading:
  mode: paper
  live_execution_unlocked: false
  safety_boundary: SIMULATED_ONLY
  shadow_mode: ACTIVE
  max_live_order_notional: 50000
  max_daily_loss_percent: 3.5

research_checkouts:
  count: 16
  directory: sources/
  status: ISOLATED_RESEARCH_ONLY
  auto_import_allowed: false

agent_runtime:
  pattern: AifieAgent (Propose Only)
  governor: ALFIE Meta Governor
  risk_enforcement: DETERMINISTIC_PURE_CODE
  critic_agent: ACTIVE (Adversarial Falsification)
  total_specialists: 7

core_nervous_system:
  lifecycle_state_machine: ACTIVE (ONLINE, PAUSED, EMERGENCY_HALTED, DRAINING, STOPPED)
  central_event_bus: ACTIVE (Ring Buffer, Monotonic Sequences, Replay Engine)
  error_classification_shield: ACTIVE (Retryable, DataUnsafe, RiskBreach, Fatal)

graph_engineering:
  task_graph: ACTIVE
  knowledge_graph: ACTIVE
  learning_graph: ACTIVE
  execution_graph: ACTIVE
  edges: DETERMINISTIC_RULES

data_engine:
  data_quality_gate: ACTIVE
  staleness_check: ACTIVE
  sequence_gap_detection: ACTIVE
  price_sanity_filter: ACTIVE
  zero_key_fallback: ACTIVE (Binance Public, CoinGecko, Yahoo Finance, Frankfurter ECB, Stooq)

verification:
  test_suites: 22
  total_tests: 1113
  passing_rate: 100%
  critical_security_findings: 0
```

---

## Boundaries & Guarantees

1. **Constitutional Safety Gate**:
   - `LIVE_TRADING_ENABLED=false` by default.
   - Orders are routed exclusively to the internal paper matching engine or shadow tracker.
   - Live broker routes are permanently disabled unless explicit two-factor authentication and pre-flight validation gates are unlocked.

2. **Propose vs. Enforce Separation**:
   - AI agents (Research, Strategy, News, Sentiment) may reason and propose trade signals.
   - AI agents are prohibited from determining position size or executing trades directly.
   - Deterministic risk engines (VaR, Drawdown, Exposure, Leverage, VPIN) enforce sizing and reject proposals exceeding risk thresholds.

3. **Critic Agent Falsification**:
   - Every trade proposal is submitted to the **Critic Agent** before risk review.
   - The Critic actively looks for look-ahead bias, regime mismatch, liquidity depletion, and spread widening.

4. **Self-Improvement Sandbox**:
   - AI hypothesis and strategy generation operates in an isolated candidate registry.
   - Under no circumstances does an AI model or agent rewrite or overwrite production application code directly.
   - Candidate strategies require multi-stage walk-forward and out-of-sample validation before paper promotion.
