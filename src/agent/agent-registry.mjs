// @ts-check
import { AifieAgent } from "./agent-runtime.mjs";

/**
 * Standard Agent Registry for Aifie
 * Centralized governance of specialist agents.
 */
export class AifieAgentRegistry {
  constructor() {
    /** @type {Map<string, AifieAgent>} */
    this.agents = new Map();
    this._initializeDefaultEnsemble();
  }

  _initializeDefaultEnsemble() {
    const defaultRoles = [
      { id: "alfie-governor", role: "GOVERNOR" },
      { id: "research-agent-01", role: "RESEARCH" },
      { id: "market-agent-01", role: "MARKET_DATA" },
      { id: "strategy-agent-01", role: "STRATEGY" },
      { id: "critic-agent-01", role: "CRITIC" },
      { id: "risk-agent-01", role: "RISK_ENGINE" },
      { id: "execution-agent-01", role: "EXECUTION_GATE" }
    ];

    for (const def of defaultRoles) {
      this.register(new AifieAgent(def));
    }
  }

  /**
   * Register an agent instance
   * @param {AifieAgent} agent
   */
  register(agent) {
    if (!agent || !agent.id) {
      throw new Error("Invalid agent instance: must have valid id");
    }
    this.agents.set(agent.id, agent);
    return agent;
  }

  /**
   * Retrieve agent by id
   * @param {string} id
   */
  get(id) {
    return this.agents.get(id) || null;
  }

  /**
   * Find agents by role
   * @param {string} role
   */
  getByRole(role) {
    const target = String(role).toUpperCase();
    return Array.from(this.agents.values()).filter(a => a.role === target);
  }

  /**
   * Get all registered agents
   */
  getAll() {
    return Array.from(this.agents.values());
  }

  /**
   * Get telemetry summary across all registered specialists
   */
  getStatus() {
    return {
      service: "AifieAgentRegistry",
      totalAgents: this.agents.size,
      agents: Array.from(this.agents.values()).map(a => a.getStatus())
    };
  }
}

export const globalAgentRegistry = new AifieAgentRegistry();
