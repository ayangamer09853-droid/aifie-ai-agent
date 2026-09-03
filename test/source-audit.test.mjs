import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { auditSources, recommendIntegrationOrder } from "../src/source-audit.mjs";

test("source audit reports runtime and license readiness", () => {
  const root = mkdtempSync(join(tmpdir(), "aifie-source-"));
  const repo = join(root, "SourceA");
  mkdirSync(repo);
  writeFileSync(join(repo, "README.md"), "readme");
  writeFileSync(join(repo, "LICENSE"), "license");
  writeFileSync(join(repo, "package.json"), "{}");
  const audit = auditSources(root, [{ repository: "SourceA", role: "market_data" }]);
  assert.equal(audit[0].readiness, "adapter_discovery_ready");
  assert.equal(audit[0].runtimes.node, true);
});

test("source audit makes market data first in adapter recommendations", () => {
  const plan = recommendIntegrationOrder([{ repository: "Research", role: "research_orchestration", present: true, readiness: "adapter_discovery_ready" }, { repository: "Data", role: "market_data", present: true, readiness: "adapter_discovery_ready" }]);
  assert.equal(plan[0].repository, "Data");
});
