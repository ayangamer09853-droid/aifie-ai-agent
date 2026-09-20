# Autonomous Revenue & Commercial Invariants

## Core Guidelines

1. **Zero Fake Balances**: Never record simulated numbers or test transactions into `data/production-revenue-ledger.json`. All balance increases must be backed by authenticated payment gateway webhooks or verified bank UTRs.
2. **Value-First Client Outreach**: Every client bid produced by the agent must attach a real, executable Proof-of-Concept (PoC) prototype solving the client's stated problem in code.
3. **Instant Delivery Guarantee**: All digital storefront products must deliver full working files and documentation upon payment confirmation.
4. **Live Trading Guard Invariant**: `process.env.ENABLE_LIVE_TRADING !== "true"` remains strictly locked. Revenue is generated purely through verified software sales, consulting, data services, and SaaS subscriptions.
