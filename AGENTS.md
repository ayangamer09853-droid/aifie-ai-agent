# Aifie AI Agent - Agent Guide

## Start Here

Before changing code, read `.ai/MEMORY.md`, `.ai/SESSION.md`, `.ai/PROGRESS.md`, and `.ai/TASKS.md`. Then inspect the working tree and verify that this documentation still matches the code. Actual code and verified runtime behavior outrank all memory files.

## Purpose

Aifie is a local financial-research agent foundation. Its current product boundary is research and simulated paper orders only. It must never send orders to a live broker unless the user explicitly authorizes a separately designed, reviewed, and tested live-execution feature.

## Current Stack And Layout

- Node.js ESM service: `server.mjs` is the runnable API and dashboard.
- Node built-ins only: no dependencies or package installation are required for the current app.
- Python reference model: `aifie/` mirrors the domain design but is not the default runtime.
- Node tests: `test/server.test.mjs`.
- ALFIE manager control plane: `src/alfie-control-plane.mjs` and `test/control-plane.test.mjs`.
- Paper engine: `src/paper-engine.mjs`; local atomic state: `src/state-store.mjs`.
- Upstream source checkouts: `sources/` contains 16 shallow clones for research only; do not import, run, or modify them without a dependency, license, and interface review.
- Persistent project memory: `.ai/`.

## Commands

```powershell
npm start
npm test
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8787/api/status
```

The app binds to `127.0.0.1:8787`; set `PORT` to use another port.

## Current API

- `GET /` - local dashboard.
- `GET /api/status` - service state and simulated orders.
- `GET /api/sources` - supplied-repository capability catalog.
- `GET /api/research?symbol=AAPL` - deterministic research placeholder.
- `POST /api/orders` - simulated order only; requires `{ "mode": "paper" }`.
- `POST /api/quotes` - add a validated local paper quote before paper execution.
- `GET /api/integrations` - all supplied repositories and their isolated review state.
- `GET /api/agents` and `GET /api/control-plane` - agent registry and orchestration state.
- `POST /api/heartbeat`, `/api/tasks`, `/api/replicas`, `/api/kill-switch` - manager-only control-plane routes.

## Rules

- Preserve user files and source checkouts. Do not reset, clean, force-push, or overwrite work without explicit approval.
- Search and inspect existing code before introducing a parallel implementation.
- Keep the live-execution guard in place. Test all security-boundary changes.
- Do not turn control-plane registration into actual agent execution without approved, tested specialist adapters.
- Do not use manually supplied paper quotes as evidence for production trading. Real feeds must include provider, timestamp, freshness checks, and failure handling.
- Never claim completion without recorded verification. Mark unavailable checks as `UNVERIFIED`.
- Update `.ai/MEMORY.md`, `.ai/PROGRESS.md`, `.ai/TASKS.md`, `.ai/CHANGELOG.md`, and `.ai/SESSION.md` after meaningful work.
- Record material failures and their prevention in `.ai/ERRORS.md`.
- Strict Environment Flag Comparisons: Always check `process.env.FLAG === "true"` for boolean feature flags and safety guards. Never use truthy checks like `!process.env.FLAG` or `Boolean(process.env.FLAG)` which treat the string `"false"` as enabled.
- Lifecycle & Safety State Invariant: Order execution must fail-closed if `globalLifecycle.isExecutionAllowed()` is false or if the system is `PAUSED` or `EMERGENCY_HALTED`. Server bootstrap must advance lifecycle state to `ONLINE`, and shutdown hooks (`SIGINT`/`SIGTERM`) must transition to `DRAINING` -> `STOPPED`.
- Universal Event Bus Telemetry: Any module creating, filling, or rejecting orders must publish standardized events (`ORDER_SUBMITTED`, `ORDER_FILLED`, `ORDER_REJECTED`, `RISK_BREACH`) to `globalEventBus`.
- Deterministic Autonomous Learning: Always prioritize real contextual trade outcomes and dynamic market indicators over static defaults or stochastic random numbers in closed-loop learning cycles.

