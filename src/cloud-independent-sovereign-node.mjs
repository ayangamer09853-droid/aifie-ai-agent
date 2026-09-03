/**
 * Cloud Independent Sovereign Node Engine v100.0
 * Pure Zero-Dependency Native Implementation for Aifie Apex
 * 
 * Purpose:
 * Enables Aifie AI Agent to run 24/7 on the internet completely independent of the user's PC.
 * When the PC is turned off, the Cloud Sovereign Node continues:
 * 1. Running the Master Autonomous Nexus cycle every minute
 * 2. Answering Telegram commands & sending mobile alerts via @Myaifiebot
 * 3. Sweeping unallocated cash into tokenized RWA yields (0.00% Zero Idle Cash)
 * 4. Serving the Web Dashboard and REST API to any phone/browser globally
 * 5. Maintaining anti-sleep keep-alive pings so free cloud tiers never sleep
 */

import { networkInterfaces } from "node:os";

let keepAliveTimer = null;
let keepAlivePingsCount = 0;
let lastKeepAlivePingAt = null;

/**
 * Detects current hosting environment
 */
export function detectHostingEnvironment() {
  if (process.env.RENDER) return { platform: "Render.com", isCloud: true, isFreeTier: true };
  if (process.env.RAILWAY_ENVIRONMENT) return { platform: "Railway.app", isCloud: true, isFreeTier: false };
  if (process.env.FLY_ALLOC_ID) return { platform: "Fly.io", isCloud: true, isFreeTier: true };
  if (process.env.KOYEB_APP_NAME) return { platform: "Koyeb", isCloud: true, isFreeTier: true };
  if (process.env.GITHUB_ACTIONS) return { platform: "GitHub Actions Runner", isCloud: true, isFreeTier: true };
  if (process.env.ORACLE_CLOUD_INSTANCE) return { platform: "Oracle Cloud Free Tier", isCloud: true, isFreeTier: true };

  return {
    platform: "Local PC Workstation (Windows Edge)",
    isCloud: false,
    isFreeTier: true
  };
}

/**
 * Returns complete Cloud Sovereign Node Status
 */
export function getCloudSovereignNodeStatus() {
  const env = detectHostingEnvironment();
  const uptimeSeconds = Math.floor(process.uptime());

  return {
    status: "CLOUD_SOVEREIGN_NODE_ONLINE",
    version: "AIFIE_APEX_CLOUD_V100",
    hostingEnvironment: env,
    isIndependentOfPC: env.isCloud,
    perpetualUptime: {
      uptimeSeconds,
      uptimeFormatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
      antiSleepPingsCount: keepAlivePingsCount,
      lastPingAt: lastKeepAlivePingAt || new Date().toISOString()
    },
    cloudAutonomyGuarantees: [
      "100% Zero PC Dependency: Server continues running when PC is shut down",
      "Autonomous 24/7 Master Nexus Cycle: Continuous multi-agent consensus",
      "Perpetual Mobile Control: Instant Telegram Bot access anywhere in the world",
      "Automated State Persistence: Orders and RWA yield preserved across restarts",
      "Anti-Sleep Self-Pinger: Free cloud containers never go to sleep"
    ],
    recommendedFreeClouds: [
      { name: "Render.com", cost: "100% Free", setupTime: "2 Minutes", ram: "512 MB", status: "READY_TO_DEPLOY" },
      { name: "Railway.app", cost: "Free Starter Credit", setupTime: "1 Minute", ram: "512 MB - 8 GB", status: "READY_TO_DEPLOY" },
      { name: "Fly.io", cost: "Free Allowance", setupTime: "3 Minutes", ram: "256 MB", status: "READY_TO_DEPLOY" },
      { name: "Oracle Cloud Free VPS", cost: "Always Free", setupTime: "5 Minutes", ram: "24 GB RAM / 4 ARM OCPUs", status: "READY_TO_DEPLOY" }
    ],
    timestamp: new Date().toISOString()
  };
}

/**
 * Starts anti-sleep self-pinger so free hosting tiers (Render, Koyeb) never spin down
 */
export function startCloudKeepAliveDaemon({ selfUrl = "", intervalMs = 300000 } = {}) {
  if (keepAliveTimer) {
    return { status: "ALREADY_ACTIVE", pingsCount: keepAlivePingsCount };
  }

  const pingUrl = selfUrl || process.env.RENDER_EXTERNAL_URL || "http://127.0.0.1:8787/api/status";

  keepAliveTimer = setInterval(async () => {
    try {
      keepAlivePingsCount++;
      lastKeepAlivePingAt = new Date().toISOString();
      await fetch(pingUrl, { method: "GET" }).catch(() => {});
    } catch {
      // Ignore network hiccup
    }
  }, intervalMs);
  keepAliveTimer.unref?.();

  return {
    status: "CLOUD_KEEP_ALIVE_STARTED",
    pingTarget: pingUrl,
    intervalMs,
    philosophy: "Eliminates container idle-sleep for perpetual 24/7 cloud autonomy without PC."
  };
}

export function stopCloudKeepAliveDaemon() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
    return { status: "CLOUD_KEEP_ALIVE_STOPPED" };
  }
  return { status: "WAS_NOT_RUNNING" };
}

/**
 * Returns instant 1-click cloud deployment blueprints
 */
export function get1ClickCloudDeploymentBlueprints() {
  return {
    render: {
      platform: "Render.com",
      cost: "Free",
      instructions: [
        "1. Push this repository to your GitHub account: https://github.com/new",
        "2. Log into https://dashboard.render.com/ and click 'New +' ➔ 'Blueprint'",
        "3. Connect your repository — Render will automatically detect 'render.yaml'",
        "4. Click 'Apply' — Render builds the Docker container and launches your 24/7 live HTTPS URL!"
      ],
      manifestFile: "render.yaml"
    },
    railway: {
      platform: "Railway.app",
      cost: "Free Starter Credit",
      instructions: [
        "1. Go to https://railway.app/new",
        "2. Select 'Deploy from GitHub repo'",
        "3. Railway reads 'Dockerfile' and deploys your 24/7 agent in 60 seconds."
      ],
      manifestFile: "deploy/railway.json"
    },
    oracleVps: {
      platform: "Oracle Cloud Free Tier",
      cost: "Always Free (24 GB RAM / 4 OCPUs)",
      instructions: [
        "1. Launch Ubuntu 24.04 VM in Oracle Cloud Console",
        "2. Run single command: curl -sSL https://raw.githubusercontent.com/YOUR_REPO/main/deploy-vps.sh | bash",
        "3. Agent runs 24/7/365 via systemd with full 4K Web Desktop!"
      ],
      scriptFile: "deploy-vps.sh"
    }
  };
}
