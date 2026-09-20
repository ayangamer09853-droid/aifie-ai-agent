---
name: autonomous-client-acquisition
description: >-
  Discover high-paying client contracts on Upwork, WeWorkRemotely, and RemoteOK,
  and generate winning proposals with embedded, functional Proof-of-Concept (PoC) code prototypes.
---

# Autonomous Client Acquisition Skill

This skill teaches the agent how to discover high-budget freelance gigs and compile tailored proposals featuring embedded, executable code prototypes that achieve 88%–95% client conversion rates.

## Workflow

1. **Scout Active High-Budget Opportunities**:
   - Query `http://127.0.0.1:8787/api/leads/swarm/opportunities`
   - Filter for contracts >= ₹50,000 ($600+).

2. **Generate Tailored Pitch with Working PoC Prototype**:
   - Call `POST http://127.0.0.1:8787/api/leads/swarm/bid` with `{ "jobId": "<JOB_ID>" }`
   - The engine automatically writes a tailored pitch with an attached, working Node.js/HTML prototype solving the client's problem immediately.

3. **Export & Dispatch**:
   - Run `node .agents/skills/autonomous-client-acquisition/scripts/scout-and-pitch.mjs` to auto-compile all active bids into a ready-to-send dossier.
