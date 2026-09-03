import test from "node:test";
import assert from "node:assert/strict";
import { getOmniCloudStatus, getFailoverChain, runHealthCheckAllPlatforms } from "../src/omni-cloud-platform-orchestrator.mjs";

test("Omni-Cloud Orchestrator registers all 20 free cloud platforms", () => {
  const status = getOmniCloudStatus();
  assert.equal(status.status, "OMNI_CLOUD_ORCHESTRATOR_ONLINE");
  assert.equal(status.protocolVersion, "OMNI_V91_SOVEREIGN");
  assert.equal(status.totalPlatforms, 20);
  assert.equal(status.freeForeverCount >= 18, true, "At least 18 of 20 platforms should be free forever");
  assert.ok(Array.isArray(status.platforms));
  assert.ok(Array.isArray(status.failoverPriority));
});

test("Omni-Cloud platform registry contains all 20 required platforms", () => {
  const status = getOmniCloudStatus();
  const ids = status.platforms.map(p => p.id);

  const required = [
    "oracle_cloud", "cloudflare_workers", "fly_io", "koyeb", "railway",
    "render", "vercel", "netlify", "deno_deploy", "github_actions",
    "hugging_face", "google_cloud", "aws_free", "azure_free",
    "replit", "glitch", "supabase", "firebase", "pythonanywhere", "infinityfree"
  ];

  for (const req of required) {
    assert.ok(ids.includes(req), `Platform "${req}" must be registered`);
  }
});

test("Omni-Cloud platforms have correct types and roles", () => {
  const status = getOmniCloudStatus();
  const byId = Object.fromEntries(status.platforms.map(p => [p.id, p]));

  assert.equal(byId.oracle_cloud.type, "VPS");
  assert.equal(byId.oracle_cloud.tier, 1);
  assert.equal(byId.cloudflare_workers.type, "EDGE_CDN");
  assert.equal(byId.supabase.type, "DATABASE");
  assert.equal(byId.firebase.type, "DATABASE");
  assert.equal(byId.github_actions.type, "CRON_AUTOMATION");
  assert.equal(byId.hugging_face.type, "AI_COMPUTE");
  assert.equal(byId.vercel.type, "SERVERLESS");
  assert.equal(byId.fly_io.type, "CONTAINER");
  assert.equal(byId.infinityfree.type, "PHP_HOST");
});

test("Failover chain returns servers in correct priority order", () => {
  const chain = getFailoverChain();
  assert.ok(Array.isArray(chain));
  assert.ok(chain.length >= 5);
  assert.equal(chain[0].platformId, "oracle_cloud");
  assert.equal(chain[0].priority, 1);
  assert.equal(chain[1].platformId, "fly_io");
  assert.equal(chain[2].platformId, "koyeb");

  // Priorities must be sequential
  chain.forEach((c, i) => {
    assert.equal(c.priority, i + 1);
  });
});

test("Omni-Cloud platform distribution across tiers is correct", () => {
  const status = getOmniCloudStatus();
  assert.ok(status.serverPlatforms >= 4, "At least 4 server-tier platforms (Oracle, Fly, Koyeb, Render, Railway, Replit)");
  assert.ok(status.serverlessPlatforms >= 4, "At least 4 serverless platforms (Vercel, Netlify, Deno, AWS, Azure, GCP)");
  assert.ok(status.databasePlatforms >= 2, "At least 2 database platforms (Supabase, Firebase)");
});

test("runHealthCheckAllPlatforms handles unconfigured platforms gracefully", async () => {
  // Without any env URLs set, all platforms should report NOT_CONFIGURED or OFFLINE gracefully
  const result = await runHealthCheckAllPlatforms();
  assert.equal(result.checkCompleted, true);
  assert.equal(result.totalChecked, 20);
  assert.ok(typeof result.uptimeRatio === "number");
  assert.ok(result.uptimeRatio >= 0 && result.uptimeRatio <= 1);
  assert.ok(Array.isArray(result.platforms));

  for (const p of result.platforms) {
    assert.ok(
      ["ONLINE", "OFFLINE_OR_NOT_DEPLOYED", "NOT_CONFIGURED", "DEGRADED"].includes(p.status),
      `Platform ${p.platformId} must have a valid status, got: ${p.status}`
    );
  }
});
