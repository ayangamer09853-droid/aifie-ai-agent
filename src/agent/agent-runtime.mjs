// @ts-check
import { randomUUID } from "node:crypto";
import { globalEventBus } from "../core/event-bus.mjs";

/**
 * Standardized Aifie Agent Interface & Runtime
 * All specialist agents adhere to this contract.
 */
export class AifieAgent {
  /**
   * @param {Object} options
   * @param {string} options.id - Unique agent identifier
   * @param {string} options.role - e.g. "RESEARCH", "STRATEGY", "CRITIC", "RISK"
   * @param {Array<any>} [options.tools=[]] - Tool registry instances
   * @param {Object} [options.memory] - Memory store interface
   * @param {Object} [options.policy] - Planning & decision policy
   * @param {Object} [options.evaluator] - Outcome evaluator
   */
  constructor({
    id,
    role,
    tools = [],
    memory = null,
    policy = null,
    evaluator = null
  }) {
    this.id = id || `agent-${randomUUID().slice(0, 8)}`;
    this.role = String(role || "SPECIALIST").toUpperCase();
    this.tools = tools;
    this.memory = memory || {
      store: async () => {},
      query: async () => []
    };
    this.policy = policy || {
      plan: async (task, ctx) => ({ action: "DEFAULT_STEP", target: task?.target || null, parameters: ctx || {} })
    };
    this.evaluator = evaluator || {
      evaluate: async (res) => ({ score: 1.0, passed: true, feedback: "Execution nominal" })
    };

    this.state = "IDLE";
    this.totalRuns = 0;
    this.lastRunAt = null;
  }

  /**
   * Execute standard cognitive loop: Plan -> Execute -> Evaluate -> Store Memory
   * @param {Object} task
   * @param {Object} [context={}]
   * @returns {Promise<{ plan: Object, result: Object, evaluation: Object }>}
   */
  async run(task, context = {}) {
    this.state = "RUNNING";
    this.totalRuns++;
    this.lastRunAt = new Date().toISOString();
    const correlationId = context?.correlationId || `corr-${randomUUID().slice(0, 8)}`;

    globalEventBus.publish("AGENT_RUN_STARTED", {
      agentId: this.id,
      role: this.role,
      task
    }, { source: this.id, correlationId });

    try {
      // 1. Plan
      const plan = await this.policy.plan(task, context);

      // 2. Execute
      const result = await this.execute(plan, context);

      // 3. Evaluate
      const evaluation = await this.evaluator.evaluate(result, context);

      // 4. Memory Store
      await this.memory.store({
        agentId: this.id,
        role: this.role,
        task,
        plan,
        result,
        evaluation,
        timestamp: Date.now()
      });

      this.state = "IDLE";

      globalEventBus.publish("AGENT_RUN_COMPLETED", {
        agentId: this.id,
        role: this.role,
        evaluation
      }, { source: this.id, correlationId });

      return {
        agentId: this.id,
        role: this.role,
        plan,
        result,
        evaluation
      };
    } catch (err) {
      this.state = "ERROR";
      globalEventBus.publish("AGENT_RUN_FAILED", {
        agentId: this.id,
        role: this.role,
        error: err.message
      }, { source: this.id, correlationId });
      throw err;
    }
  }

  /**
   * Internal execution hook
   * @param {Object} plan
   * @param {Object} context
   */
  async execute(plan, context) {
    if (typeof plan.execute === "function") {
      return await plan.execute(context);
    }
    return {
      status: "COMPLETED",
      output: plan,
      executedAt: new Date().toISOString()
    };
  }

  /**
   * Get agent operational telemetry
   */
  getStatus() {
    return {
      id: this.id,
      role: this.role,
      state: this.state,
      totalRuns: this.totalRuns,
      lastRunAt: this.lastRunAt,
      toolsCount: this.tools.length
    };
  }
}
