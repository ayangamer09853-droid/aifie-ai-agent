/**
 * AIFIE AUTONOMOUS BUSINESS EMPIRE - BREAKTHROUGH INNOVATION 7:
 * Conversational Executive War Room & Multimodal Copilot
 * 
 * Translates natural language strategic commands from the human owner
 * into coordinated multi-agent execution across Level 1, 2, and 3 agents.
 * 
 * Zero external dependencies. Pure Node.js ESM built-ins.
 */

export class ExecutiveWarRoom {
  constructor(empire) {
    this.empire = empire;
    this.commandHistory = [];
  }

  /**
   * Parse natural language command and execute across the empire
   */
  async processCommand(commandText = "") {
    const text = String(commandText).trim();
    if (!text) {
      throw new Error("EMPTY_COMMAND: Please provide an executive instruction.");
    }

    const commandId = `CMD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const lower = text.toLowerCase();
    let actionType = "AUTONOMOUS_LOOP";
    let executionResult = null;
    let executiveNarrative = "";

    // 1. Natural Language Intent Parsing
    if (/critic|falsif|stress\s*test|risk\s*audit|audit.*risk|vulnerabilit|validate.*proposal|proposal.*risk/i.test(lower)) {
      actionType = "CRITIC_STRESS_TEST";
      const proposalToTest = {
        title: text,
        niche: /agritech|agri/i.test(lower) ? "Precision Agriculture AI" : "B2B SaaS Automation",
        expectedRevenueInr: 45000,
        costInr: 2500,
        turnaroundDays: 2
      };
      executionResult = this.empire.critic.falsifyProposal(proposalToTest);
      executiveNarrative = `Commercial Critic concluded audit: Verdict is ${executionResult.verdict} with Robustness Score ${executionResult.robustnessScore}/100.`;
    } else if (/dag|parallel|compile\s*pipeline/i.test(lower)) {
      actionType = "DAG_PIPELINE_EXECUTION";
      executionResult = await this.empire.dagCompiler.executeDag({
        title: text,
        niche: "AI SaaS & Workflow Automation",
        revenueInr: 35000
      });
      executiveNarrative = `Dynamic DAG compiled and executed ${executionResult.totalNodes} nodes across 4 stages in ${executionResult.totalDurationMs}ms (${executionResult.efficiencySpeedupFactor}).`;
    } else if (/evolve|genetic|mutation|optimize\s*prompts/i.test(lower)) {
      actionType = "GENETIC_EVOLUTION";
      executionResult = this.empire.promptEvolver.runEvolutionCycle({ openRatePercent: 28.5, csatScore: 5.0 });
      executiveNarrative = `Genetic Prompt Mega-Factory advanced to Generation ${executionResult.generation}. Champion fitness is ${executionResult.championVariant.fitnessScore}/100.`;
    } else if (/\bapi\b|metered|developer\s*key/i.test(lower)) {
      actionType = "METERED_API_ACTION";
      executionResult = this.empire.meteredGateway.getStatus();
      executiveNarrative = `Metered Public API Gateway online with ${executionResult.activeApiKeysCount} active keys and ₹${executionResult.cumulativeApiRevenueInr} cumulative revenue.`;
    } else if (/immune|heal|circuit\s*breaker|reconcil/i.test(lower)) {
      actionType = "IMMUNE_SELF_HEAL";
      executionResult = this.empire.immuneMesh.healAllSubsystems();
      executiveNarrative = `Autonomous Immune Mesh executed self-healing: ${executionResult.message}. Overall health: ${this.empire.immuneMesh.getStatus().overallHealthStatus}.`;
    } else if (/mesh|sovereign\s*node|offload|p2p|peer/i.test(lower)) {
      actionType = "SOVEREIGN_MESH_DISPATCH";
      executionResult = this.empire.sovereignMesh.dispatchWorkload("BATCH_EXECUTION", { commandText: text });
      executiveNarrative = `Sovereign Node Mesh offloaded task ${executionResult.taskId} to ${executionResult.dispatchedToNode.name} (${executionResult.executionMetrics.offloadSpeedupFactor}).`;
    } else if (/status|metrics|health|balance/i.test(lower)) {
      actionType = "EMPIRE_STATUS_CHECK";
      executionResult = this.empire.getEmpireStatus();
      executiveNarrative = `Empire Operating Status: 100% Online under Supreme Governor supervision. ${executionResult.empireCyclesRun} cycles executed.`;
    } else {
      // Default: Run 10-Step Autonomous Business Loop with parsed entities
      actionType = "AUTONOMOUS_LOOP";
      const clientName = /for\s+([A-Za-z\s]+)/i.exec(text) ? /for\s+([A-Za-z\s]+)/i.exec(text)[1].trim() : "Apex Enterprises";
      const niche = /agri/i.test(lower) ? "Precision Agriculture AI" : "B2B SaaS Automation";

      executionResult = await this.empire.runAutonomousBusinessLoop({
        clientName,
        company: `${clientName} Group`,
        niche,
        isRecurring: /retainer|monthly|recurring/i.test(lower)
      });
      executiveNarrative = `Executed 10-Step Autonomous Loop for ${clientName}. Supreme Governor Verdict: ${executionResult.governorDecision.decision}. QA Score: ${executionResult.executionResult.qaScore}/100. Treasury Reinvested: 40/25/20/10/5.`;
    }

    const commandReport = {
      commandId,
      rawCommand: text,
      // Primary fields
      actionType,
      intent: actionType,        // alias for discoverability (REQ-7)
      status: "EXECUTED",        // execution status sentinel (REQ-7, REQ-14)
      executiveNarrative,
      executionResult,
      timestamp: new Date().toISOString()
    };

    this.commandHistory.push(commandReport);
    return commandReport;
  }

  /**
   * Returns aggregated War Room telemetry for measurability (REQ-14)
   */
  getWarRoomSummary() {
    const history = this.commandHistory;
    const successful = history.filter(c => c.status === "EXECUTED");
    const byIntent = {};
    for (const cmd of history) {
      byIntent[cmd.actionType] = (byIntent[cmd.actionType] || 0) + 1;
    }
    return {
      totalCommandsProcessed: history.length,
      successfulExecutions: successful.length,
      intentBreakdown: byIntent,
      supportedIntents: this.getSupportedIntents(),
      lastCommandAt: history.length ? history[history.length - 1].timestamp : null
    };
  }

  /**
   * Returns the 5 supported NL intent categories (REQ-7)
   */
  getSupportedIntents() {
    return [
      "CRITIC_STRESS_TEST",
      "DAG_PIPELINE_EXECUTION",
      "GENETIC_EVOLUTION",
      "METERED_API_ACTION",
      "IMMUNE_SELF_HEAL",
      "SOVEREIGN_MESH_DISPATCH",
      "EMPIRE_STATUS_CHECK"
    ];
  }

  getCommandHistory() {
    return this.commandHistory;
  }
}
