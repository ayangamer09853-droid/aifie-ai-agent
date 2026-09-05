import { randomUUID } from "node:crypto";

const MAX_REPLICAS_PER_TEMPLATE = 3;
const MAX_TOTAL_AGENTS = 32;
const templates = [
  ["manager", "ALFIE Manager", "orchestration", ["route_tasks", "assess_results"], false],
  ["market-data", "Market Data", "market_data", ["read_market_data", "validate_freshness"], true],
  ["regime", "Regime", "market_regime", ["classify_regime"], true],
  ["strategy-research", "Strategy Research", "strategy_research", ["research_strategies"], true],
  ["signal", "Signal", "signal_analysis", ["rank_opportunities"], true],
  ["risk", "Risk", "risk_control", ["evaluate_risk", "block_action"], true],
  ["position-sizing", "Position Sizing", "position_sizing", ["calculate_paper_size"], true],
  ["execution", "Paper Execution", "paper_execution", ["simulate_order", "reconcile_paper_order"], true],
  ["trade-journal", "Trade Journal", "audit", ["record_decision"], true],
  ["performance", "Performance Auditor", "performance_audit", ["audit_performance"], true],
  ["learning", "Learning", "learning", ["propose_experiment"], true],
  ["verification", "Quality Control", "verification", ["verify_output"], true],
  ["registry", "Agent Registry", "registry", ["register_agent", "map_dependencies"], true],
  ["factory", "Agent Factory", "agent_factory", ["propose_template"], true],
  ["replication", "Replication Manager", "replication", ["request_replica"], true],
  ["kill-switch", "Safety Kill Switch", "safety", ["block_risky_action"], true]
].map(([templateId, name, lane, capabilities, replicable]) => ({ templateId, name, lane, capabilities, replicable, version: "1.0.0", status: "validated" }));

const agents = templates.map(template => ({
  id: `${template.templateId}-v1-001`, templateId: template.templateId, name: template.name, lane: template.lane,
  health: "healthy", role: template.templateId === "manager" ? "manager" : "specialist",
  permissions: template.templateId === "execution" ? ["paper_execution"] : ["local_read"], createdAt: new Date().toISOString(), lineage: null
}));
const tasks = [];
const replicationEvents = [];
const heartbeatEvents = [];
const MAX_STORED_TASKS = 1000;
const MAX_STORED_EVENTS = 1000;
const safety = { killSwitchActive: false, reason: null, updatedAt: new Date().toISOString() };

function findHealthyAgent(lane) { return agents.find(agent => agent.lane === lane && agent.health === "healthy"); }
function findTemplate(templateId) { return templates.find(template => template.templateId === templateId); }

export function agentRegistry() { return { agents, templates, safety, maxReplicasPerTemplate: MAX_REPLICAS_PER_TEMPLATE, maxTotalAgents: MAX_TOTAL_AGENTS }; }

export function delegateTask({ lane, objective, priority = "normal", evidenceRequired = true, riskLevel = "low" }) {
  if (!lane || !objective) throw new Error("lane and objective are required");
  const agent = findHealthyAgent(lane);
  const task = { id: `task-${randomUUID()}`, lane, objective: String(objective).trim(), priority, evidenceRequired: Boolean(evidenceRequired), riskLevel, status: agent ? "assigned" : "needs_specialist", assignedAgentId: agent?.id ?? null, createdAt: new Date().toISOString(), result: null };
  tasks.push(task);
  if (tasks.length > MAX_STORED_TASKS) tasks.splice(0, tasks.length - MAX_STORED_TASKS);
  return task;
}

export function runHeartbeat() {
  const unhealthy = agents.filter(agent => agent.health !== "healthy").map(agent => agent.id);
  const unassigned = tasks.filter(task => task.status === "needs_specialist").map(task => task.id);
  const actions = [];
  if (safety.killSwitchActive) actions.push({ type: "pause_risky_actions", reason: safety.reason });
  if (unassigned.length) actions.push({ type: "delegate_factory_review", taskIds: unassigned });
  if (unhealthy.length) actions.push({ type: "delegate_health_review", agentIds: unhealthy });
  if (!actions.length) actions.push({ type: "wait", reason: "No unsafe or unassigned work requires manager action." });
  const heartbeat = { id: `heartbeat-${randomUUID()}`, cycle: ["observe", "diagnose", "delegate", "collect", "assess", "learn", "improve"], safety: { ...safety }, agentCount: agents.length, pendingTaskCount: tasks.filter(task => task.status !== "completed").length, actions, createdAt: new Date().toISOString() };
  heartbeatEvents.push(heartbeat);
  if (heartbeatEvents.length > MAX_STORED_EVENTS) heartbeatEvents.splice(0, heartbeatEvents.length - MAX_STORED_EVENTS);
  return heartbeat;
}

export function requestReplica({ templateId, reason, requestedBy = "manager" }) {
  const template = findTemplate(templateId);
  if (!template) throw new Error("unknown agent template");
  if (!template.replicable || template.templateId === "manager" || template.templateId === "kill-switch") throw new Error("this template cannot be replicated");
  if (!reason || !String(reason).trim()) throw new Error("a replication reason is required");
  if (safety.killSwitchActive) throw new Error("replication is paused while the safety kill switch is active");
  if (agents.length >= MAX_TOTAL_AGENTS) throw new Error("maximum total agent count reached");
  const existing = agents.filter(agent => agent.templateId === templateId);
  if (existing.length - 1 >= MAX_REPLICAS_PER_TEMPLATE) throw new Error("maximum replicas for this template reached");
  const instance = String(existing.length + 1).padStart(3, "0");
  const parent = existing[0];
  const replica = { id: `${template.templateId}-v1-${instance}`, templateId: template.templateId, name: `${template.name} v1 ${instance}`, lane: template.lane, health: "validating", role: "specialist", permissions: ["local_read"], createdAt: new Date().toISOString(), lineage: { parentId: parent?.id ?? null, templateVersion: template.version } };
  agents.push(replica);
  const event = { id: `replication-${randomUUID()}`, requestedBy, reason: String(reason).trim(), replicaId: replica.id, templateId, status: "validating", createdAt: new Date().toISOString() };
  replicationEvents.push(event);
  if (replicationEvents.length > MAX_STORED_EVENTS) replicationEvents.splice(0, replicationEvents.length - MAX_STORED_EVENTS);
  return { event, replica, requiredValidation: ["health_check", "capability_test", "registry_review"] };
}

export function setKillSwitch({ active, reason }) {
  if (typeof active !== "boolean") throw new Error("active must be a boolean");
  if (active && !String(reason ?? "").trim()) throw new Error("a safety reason is required to activate the kill switch");
  safety.killSwitchActive = active;
  safety.reason = active ? String(reason).trim() : null;
  safety.updatedAt = new Date().toISOString();
  return { ...safety };
}

export function controlPlaneStatus() { return { safety, tasks, replicationEvents, lastHeartbeat: heartbeatEvents.at(-1) ?? null }; }
