---
name: developer-api-monetization
description: >-
  Provision developer API keys, configure recurring subscription tiers (Starter, Pro, Enterprise),
  and manage metered micro-services for B2B developer monetization.
---

# Developer API Monetization Skill

This skill teaches the agent how to sell, provision, and track metered developer micro-APIs.

## Key Procedures

1. **Review Plans**:
   - `GET http://127.0.0.1:8787/api/marketplace/plans`

2. **Subscribe New Developer**:
   - Send `POST http://127.0.0.1:8787/api/marketplace/subscribe` with:
     ```json
     {
       "developerEmail": "dev@company.com",
       "tier": "pro"
     }
     ```
   - Returns a provisioned API key (`aifie_mkt_...`) and initial call quota.

3. **Call Monetized Services**:
   - `POST http://127.0.0.1:8787/api/marketplace/service/crypto-arbitrage`
   - `POST http://127.0.0.1:8787/api/marketplace/service/lead-enrichment`
   - `POST http://127.0.0.1:8787/api/marketplace/service/competitor-backlinks`
   - `POST http://127.0.0.1:8787/api/marketplace/service/climate-risk`
   - `POST http://127.0.0.1:8787/api/marketplace/service/invoice-ocr`
   - Header: `x-api-key: aifie_mkt_...`
