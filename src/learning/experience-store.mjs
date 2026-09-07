// @ts-check
import { randomUUID } from "node:crypto";

/**
 * 4-Tier Structured Experience & Memory Store
 * Replaces unstructured flat JSON files with compartmentalized memory tiers.
 */
export class ExperienceStore {
  constructor() {
    // L1: Working Memory (active task/context)
    this.l1Working = new Map();
    // L2: Episodic Memory (past trades & executions)
    this.l2Episodic = [];
    // L3: Semantic Memory (learned patterns & market regimes)
    this.l3Semantic = new Map();
    // L4: Institutional Memory (proven quantitative rules & risk bounds)
    this.l4Institutional = new Map();

    this._bootstrapInstitutionalMemory();
  }

  _bootstrapInstitutionalMemory() {
    this.storeInstitutional("MAX_RISK_PER_TRADE", { limitPercent: 1.0, enforced: true, rationale: "Preserve capital against tail risk" });
    this.storeInstitutional("MAX_DAILY_LOSS", { limitPercent: 3.5, enforced: true, rationale: "Circuit breaker hard halt" });
    this.storeInstitutional("MIN_RRR_RATIO", { minimum: 1.5, enforced: true, rationale: "Positive mathematical expectation" });
  }

  // --- L1 Working Memory ---
  setWorking(key, val) {
    this.l1Working.set(key, { value: val, updatedAt: Date.now() });
  }

  getWorking(key) {
    const item = this.l1Working.get(key);
    return item ? item.value : null;
  }

  clearWorking() {
    this.l1Working.clear();
  }

  // --- L2 Episodic Memory ---
  recordEpisode(episode = {}) {
    const record = {
      id: `ep-${randomUUID().slice(0, 8)}`,
      timestamp: Date.now(),
      isoTimestamp: new Date().toISOString(),
      confidence: episode.confidence || 0.8,
      evidence: episode.evidence || [],
      validated: Boolean(episode.validated),
      ...episode
    };
    this.l2Episodic.push(record);
    if (this.l2Episodic.length > 500) this.l2Episodic.shift();
    return record;
  }

  queryEpisodes({ symbol, strategy, limit = 50 } = {}) {
    let list = this.l2Episodic;
    if (symbol) list = list.filter(e => e.symbol === symbol.toUpperCase());
    if (strategy) list = list.filter(e => e.strategy === strategy);
    return list.slice(-limit);
  }

  // --- L3 Semantic Memory ---
  storeSemantic(patternKey, patternData) {
    this.l3Semantic.set(patternKey, {
      ...patternData,
      source: "SelfImprovementEngine",
      timestamp: Date.now(),
      confidence: patternData.confidence || 0.85,
      evidence: patternData.evidence || []
    });
  }

  getSemantic(patternKey) {
    return this.l3Semantic.get(patternKey) || null;
  }

  // --- L4 Institutional Memory ---
  storeInstitutional(ruleKey, ruleData) {
    this.l4Institutional.set(ruleKey, {
      ...ruleData,
      immutable: true,
      updatedAt: new Date().toISOString()
    });
  }

  getInstitutional(ruleKey) {
    return this.l4Institutional.get(ruleKey) || null;
  }

  getStatus() {
    return {
      service: "ExperienceStore",
      l1WorkingKeysCount: this.l1Working.size,
      l2EpisodicCount: this.l2Episodic.length,
      l3SemanticCount: this.l3Semantic.size,
      l4InstitutionalRulesCount: this.l4Institutional.size
    };
  }
}

export const globalExperienceStore = new ExperienceStore();
