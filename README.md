# Aifie AI Agent

Aifie is a paper-trading research agent assembled around the capabilities represented by the repositories in `sources/`. It keeps research, signal formation, risk approval, and simulated execution separate so live broker connectivity can be added deliberately later.

## Run

```powershell
npm start
```

Open `http://127.0.0.1:8787` for the dashboard, or call `http://127.0.0.1:8787/api/status`.

The application uses only Node.js built-ins for its first local run. A Python reference implementation lives in `aifie/`; the Node service is the default entrypoint. All order routes are paper-only and are rejected unless `mode` is `paper`.

## Paper Trading

Set a fresh quote before placing a paper order. The local engine applies configured adverse slippage and commission, tracks cash, positions, equity, drawdown, and an order audit record. It rejects missing quotes, insufficient cash, oversize positions, and drawdown-limit breaches.

```powershell
Invoke-WebRequest -UseBasicParsing -Method Post -ContentType 'application/json' -Body '{"symbol":"AAPL","price":100,"source":"manual"}' http://127.0.0.1:8787/api/quotes
Invoke-WebRequest -UseBasicParsing -Method Post -ContentType 'application/json' -Body '{"symbol":"AAPL","side":"buy","quantity":2,"mode":"paper"}' http://127.0.0.1:8787/api/orders
```

`GET /api/integrations` reports the role and approval state of every supplied repository. They remain isolated until their licenses, dependencies, interfaces, and failure behavior have been reviewed.

`GET /api/source-audit` inspects all local source checkouts for documentation, license presence, runtime manifests, and recommended adapter order. It is metadata-only and never executes third-party code.

## Source Map

The local `sources/` directory contains shallow clones of the supplied repositories. Their intended Aifie roles are recorded in `aifie/source_catalog.py`:

- Market data and research: OpenBB, worldmonitor, public-apis, Kronos, MiroFish.
- Analyst orchestration and signals: TradingAgents, Vibe-Trading, AI-Trader, OpenAlice, QuantDinger.
- Execution, portfolio, and operations: nautilus_trader, paperclip, openclaw.
- Learning and developer workflow: ml-intern, reverse-skill, munder-difflin.

These remain isolated source checkouts. Aifie does not import or execute upstream code until its licenses, dependencies, and interfaces are reviewed.

## ALFIE Control Plane

The local control plane implements a manager-only multi-agent registry. It delegates scoped tasks, runs observable heartbeat cycles, accepts bounded replica requests, and has an independent kill switch. It is a local orchestration model, not a live trading system.

- `GET /api/agents` - registered manager and specialist lanes.
- `GET /api/control-plane` - tasks, replica events, safety state, and latest heartbeat.
- `POST /api/heartbeat` - run an observe-to-assess coordination cycle.
- `POST /api/tasks` - delegate a scoped task to a matching specialist lane.
- `POST /api/replicas` - request a bounded, validating replica from an approved template.
- `POST /api/kill-switch` - activate or clear the safety pause.

## Cloud Virtual Computer, Browser & Terminal

Deploy your own 24/7 cloud workstation on Oracle Cloud Always Free Tier (4 ARM OCPUs, 24 GB RAM, 200 GB SSD) or any standard Linux VPS:

- **Full Ubuntu Desktop**: 4K XFCE GUI streaming over WebSockets (noVNC / KasmVNC) on port `3000/3001`.
- **Persistent Cloud Browser**: Pre-installed Chromium browser that runs 24/7 downloads, background tasks, and scrapers even after closing your smartphone browser.
- **High-Speed Web Terminal**: Instant `ttyd` web shell on port `7681` with root privileges and tmux.
- **Dashboard Workspace**: Access the `💻 CLOUD PC` tab inside the Aifie web dashboard on port `8787`.

To deploy on your cloud VPS:
```bash
sudo ./deploy-cloud-vcomputer.sh
```
See [`CLOUD_VIRTUAL_COMPUTER_GUIDE.md`](CLOUD_VIRTUAL_COMPUTER_GUIDE.md) for full instructions.
