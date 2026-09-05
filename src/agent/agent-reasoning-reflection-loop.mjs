// src/agent/agent-reasoning-reflection-loop.mjs
// Institutional Agent Intelligence: Reasoning, Planning, Reflection & Self-Correction Loop
// Pure Native Node.js ESM built-ins only

export class AgentReasoningReflectionLoop {
  constructor() {
    this.workingMemory = new Map(); // key -> { value, confidence, timestamp, provenance }
    this.reflectionLog = [];
    this.epistemicCertainty = 0.85; // Prior certainty
  }

  /**
   * Pre-Flight Tool Sanity Gate: Inspects tool arguments and schema constraints before dispatch.
   */
  validateToolPreFlight(toolName, args = {}, toolSchema = null) {
    if (!toolName || typeof toolName !== "string") {
      return { approved: false, reason: "INVALID_TOOL_NAME" };
    }

    // Check required properties if schema provided
    if (toolSchema && Array.isArray(toolSchema.required)) {
      for (const req of toolSchema.required) {
        if (args[req] === undefined || args[req] === null || args[req] === "") {
          return {
            approved: false,
            reason: `MISSING_REQUIRED_ARGUMENT: ${req}`,
            toolName,
            missingField: req
          };
        }
      }
    }

    // Check type constraints if provided
    if (toolSchema && toolSchema.properties) {
      for (const [key, prop] of Object.entries(toolSchema.properties)) {
        if (args[key] !== undefined) {
          if (prop.type === "number" && !Number.isFinite(Number(args[key]))) {
            return { approved: false, reason: `INVALID_NUMERIC_FIELD: ${key}`, key };
          }
          if (prop.type === "string" && typeof args[key] !== "string") {
            return { approved: false, reason: `INVALID_STRING_FIELD: ${key}`, key };
          }
        }
      }
    }

    return { approved: true, toolName, sanitizedArgs: { ...args } };
  }

  /**
   * Outcome Verification & Self-Correction Reflection Loop
   * Evaluates tool output against expected criteria. If defective, produces self-correction plan.
   */
  evaluateToolOutcome(toolName, output, expectedCriteria = {}) {
    const isError = !output || output.error || output.success === false;
    const timestamp = Date.now();

    if (isError) {
      this.epistemicCertainty = Math.max(0.2, this.epistemicCertainty - 0.15);
      const failureReason = output?.error || output?.reason || "UNEXPECTED_NIL_OR_FAIL_RESULT";

      // Formulate self-correction action
      const correctionPlan = this._formulateSelfCorrection(toolName, failureReason, expectedCriteria);

      const reflection = {
        toolName,
        status: "FAIL_TRIGGERED_CORRECTION",
        failureReason,
        epistemicCertainty: this.epistemicCertainty,
        correctionPlan,
        timestamp
      };
      this.reflectionLog.unshift(reflection);

      return {
        verified: false,
        requiresCorrection: true,
        reflection
      };
    }

    // Success outcome verification
    this.epistemicCertainty = Math.min(0.99, this.epistemicCertainty + 0.05);
    const reflection = {
      toolName,
      status: "VERIFIED_SUCCESS",
      epistemicCertainty: this.epistemicCertainty,
      timestamp
    };
    this.reflectionLog.unshift(reflection);

    return {
      verified: true,
      requiresCorrection: false,
      epistemicCertainty: this.epistemicCertainty,
      output
    };
  }

  /**
   * Generate tactical alternative tool or argument perturbation plan upon failure.
   */
  _formulateSelfCorrection(toolName, reason, expectedCriteria) {
    // Dynamic Fallback Matrix
    const fallbackMap = {
      run_monte_carlo_sim: "execute_macro_scenario_stress_test",
      fetch_market_quote: "get_cached_market_quote",
      run_genetic_strategy_mutation: "query_orthogonal_strategy_megafactory",
      place_paper_order: "abort_order_to_safe_cash"
    };

    const fallbackTool = fallbackMap[toolName] || "request_human_operator_review";

    return {
      originalTool: toolName,
      diagnosis: `Failed with '${reason}'`,
      recommendedAction: "RE_ROUTE_TO_FALLBACK",
      fallbackTool,
      suggestedModifications: {
        timeoutMs: 8000,
        enableSoftFailover: true,
        retryCount: 1
      }
    };
  }

  /**
   * Update working memory context with confidence decay
   */
  setWorkingMemory(key, value, { confidence = 0.9, provenance = "system" } = {}) {
    this.workingMemory.set(key, {
      value,
      confidence: Number(confidence.toFixed(3)),
      timestamp: Date.now(),
      provenance
    });
  }

  getWorkingMemory(key) {
    return this.workingMemory.get(key) || null;
  }

  getTelemetry() {
    return {
      epistemicCertainty: Number(this.epistemicCertainty.toFixed(3)),
      workingMemoryKeys: Array.from(this.workingMemory.keys()),
      totalReflections: this.reflectionLog.length,
      recentReflections: this.reflectionLog.slice(0, 5)
    };
  }
}

export const agentReasoningLoop = new AgentReasoningReflectionLoop();
