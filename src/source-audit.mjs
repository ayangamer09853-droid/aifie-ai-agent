import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function findFile(directory, prefix) {
  return readdirSync(directory, { withFileTypes: true })
    .find(entry => entry.isFile() && entry.name.toLowerCase().startsWith(prefix.toLowerCase()))?.name ?? null;
}

export function auditSources(sourcesDirectory, integrations) {
  return integrations.map(integration => {
    const directory = join(sourcesDirectory, integration.repository);
    const present = existsSync(directory);
    const readme = present ? findFile(directory, "readme") : null;
    const license = present ? findFile(directory, "license") : null;
    const nodeManifest = present && existsSync(join(directory, "package.json"));
    const pythonManifest = present && existsSync(join(directory, "pyproject.toml"));
    const readiness = !present ? "missing" : !license ? "license_review_required" : !readme ? "documentation_review_required" : "adapter_discovery_ready";
    return { ...integration, present, readme, license, runtimes: { node: nodeManifest, python: pythonManifest }, readiness };
  });
}

export function recommendIntegrationOrder(audit) {
  const priority = {
    market_data: 1,
    time_series_db: 2,
    fundamental_analytics: 3,
    backtesting_execution: 4,
    crypto_execution: 5,
    algo_trading_hub: 6,
    charting_signals: 7,
    forecasting: 8,
    quant_research: 9,
    research_orchestration: 10,
    autonomous_reasoning: 11,
    market_intelligence: 12,
    semantic_reasoning: 13,
    agent_operations: 14,
    agent_skills: 15,
    provider_discovery: 16,
    learning_resources: 17,
    capability_design: 18,
    developer_workflow: 19
  };
  return audit
    .filter(source => source.present)
    .sort((left, right) => (priority[left.role] ?? 99) - (priority[right.role] ?? 99))
    .map((source, index) => ({
      rank: index + 1,
      repository: source.repository,
      role: source.role,
      readiness: source.readiness,
      nextStep: source.readiness === "adapter_discovery_ready"
        ? "Review interface and license before a sandboxed adapter spike."
        : "Resolve documentation/license review before adapter work."
    }));
}
