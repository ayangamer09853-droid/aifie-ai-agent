/**
 * Auditable AI Weighted Evidence Engine v100.0
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Mandated by Ayan Solanki:
 * "Make it a weighted evidence system instead of simply counting agent opinions.
 * Each agent should provide: signal, confidence, expected_return, expected_loss, time_horizon, evidence, invalidators."
 * 
 * Capabilities:
 * 1. Standardized auditable agent proposal contract
 * 2. Dynamic Bayesian evidence synthesis weighted by market regime
 * 3. Red-Team invalidator checker: disqualifies thesis if invalidation criteria are met
 * 4. Net Expected Return, Downside Loss, and Risk/Reward calculation
 */

export const AGENT_ROLES = {
  TECHNICAL_ML: "Technical & Statistical ML Ensemble",
  RL_POLICY: "TradeMaster Actor-Critic RL Policy",
  FUNDAMENTAL_MOAT: "Berkshire Moat & Graham DCF Engine",
  MICROSTRUCTURE: "Hummingbot PMM & L2 Order Book Depth",
  SENTIMENT_NLP: "Stocksight Social Sentiment & Velocity",
  RED_TEAM: "Adversarial Red-Team Challenger"
};

/**
 * Validates and normalizes an agent trade proposal
 */
export function createAgentProposal({
  symbol = "BTCUSDT",
  agent = "Technical_ML",
  signal = "BUY",
  confidence = 0.80,
  expected_return = 0.025,
  expected_loss = 0.010,
  time_horizon = "4h",
  evidence = [],
  invalidators = []
} = {}) {
  const s = String(symbol || "").trim().toUpperCase();
  const sig = ["BUY", "SELL", "HOLD"].includes(String(signal).toUpperCase())
    ? String(signal).toUpperCase()
    : "HOLD";

  const conf = Math.max(0, Math.min(1, Number(confidence) || 0.5));
  const expRet = Math.max(0, Number(expected_return) || 0.01);
  const expLoss = Math.max(0.001, Number(expected_loss) || 0.01);

  return {
    symbol: s,
    agent: String(agent),
    signal: sig,
    confidence: conf,
    expected_return: expRet,
    expected_loss: expLoss,
    riskRewardRatio: Number((expRet / expLoss).toFixed(2)),
    time_horizon: String(time_horizon),
    evidence: Array.isArray(evidence) ? evidence : [String(evidence)],
    invalidators: Array.isArray(invalidators) ? invalidators : [String(invalidators)],
    timestamp: new Date().toISOString()
  };
}

/**
 * Synthesizes multi-agent proposals into an auditable institutional decision
 */
export function synthesizeEvidence({
  symbol = "BTCUSDT",
  proposals = [],
  regime = "TRENDING",
  regimeWeights = null,
  currentPrice = 100,
  invalidatorContext = {}
} = {}) {
  const cleanSymbol = String(symbol).trim().toUpperCase();
  const validProposals = Array.isArray(proposals) ? proposals.filter(p => p && p.signal) : [];

  if (validProposals.length === 0) {
    return {
      symbol: cleanSymbol,
      consensusSignal: "HOLD",
      consensusConfidence: 0,
      expected_return: 0,
      expected_loss: 0,
      riskRewardRatio: 0,
      regime,
      verdict: "NO_PROPOSALS_AVAILABLE",
      evaluatedProposalsCount: 0,
      disqualifiedProposals: [],
      auditTrail: []
    };
  }

  // Default regime weights if not provided
  const weights = regimeWeights || {
    Technical_ML: 0.30,
    TradeMaster_RL: 0.25,
    Fundamental_Moat: 0.20,
    Microstructure: 0.15,
    Sentiment_NLP: 0.10
  };

  const disqualifiedProposals = [];
  const activeProposals = [];
  const auditTrail = [];

  // Step 1: Evaluate Invalidator Criteria
  for (const prop of validProposals) {
    let isDisqualified = false;
    let triggeredInvalidator = null;

    // Check invalidators against context
    if (Array.isArray(prop.invalidators)) {
      for (const inv of prop.invalidators) {
        const invStr = String(inv).toLowerCase();

        // Invalidation condition: price breach
        if (invStr.includes("breaks below") || invStr.includes("stop loss")) {
          const match = invStr.match(/(\d+(\.\d+)?)/);
          if (match && currentPrice > 0 && prop.signal === "BUY") {
            const invalidationPrice = parseFloat(match[1]);
            if (currentPrice < invalidationPrice) {
              isDisqualified = true;
              triggeredInvalidator = `Price $${currentPrice} breached invalidation level $${invalidationPrice}`;
              break;
            }
          }
        }

        // Invalidation condition: toxicity spike
        if (invStr.includes("vpin") && invalidatorContext.vpin !== undefined) {
          if (invalidatorContext.vpin >= 0.65) {
            isDisqualified = true;
            triggeredInvalidator = `VPIN ${invalidatorContext.vpin} exceeded 0.65 toxicity threshold`;
            break;
          }
        }

        // Invalidation condition: spread widening
        if (invStr.includes("spread") && invalidatorContext.spreadBps !== undefined) {
          if (invalidatorContext.spreadBps > 50) {
            isDisqualified = true;
            triggeredInvalidator = `Spread ${invalidatorContext.spreadBps} bps breached 50 bps limit`;
            break;
          }
        }
      }
    }

    if (isDisqualified) {
      disqualifiedProposals.push({
        agent: prop.agent,
        signal: prop.signal,
        reason: triggeredInvalidator
      });
      auditTrail.push(`[DISQUALIFIED] ${prop.agent}: ${triggeredInvalidator}`);
    } else {
      activeProposals.push(prop);
      auditTrail.push(`[VALIDATED] ${prop.agent} votes ${prop.signal} (Conf: ${(prop.confidence * 100).toFixed(1)}%)`);
    }
  }

  if (activeProposals.length === 0) {
    return {
      symbol: cleanSymbol,
      consensusSignal: "HOLD",
      consensusConfidence: 0.50,
      expected_return: 0,
      expected_loss: 0,
      riskRewardRatio: 0,
      regime,
      verdict: "ALL_PROPOSALS_DISQUALIFIED_BY_INVALIDATORS",
      evaluatedProposalsCount: validProposals.length,
      disqualifiedProposals,
      auditTrail
    };
  }

  // Step 2: Calculate Weighted Bayesian Evidence
  let totalWeight = 0;
  let buyWeight = 0;
  let sellWeight = 0;
  let holdWeight = 0;

  let weightedReturnSum = 0;
  let weightedLossSum = 0;
  let weightedConfidenceSum = 0;

  for (const prop of activeProposals) {
    // Find matching weight or fallback to equal weight
    const agentKey = Object.keys(weights).find(k => prop.agent.toLowerCase().includes(k.toLowerCase())) || "default";
    const weight = weights[agentKey] || (1 / activeProposals.length);

    totalWeight += weight;
    const voteWeight = weight * prop.confidence;

    if (prop.signal === "BUY") buyWeight += voteWeight;
    else if (prop.signal === "SELL") sellWeight += voteWeight;
    else holdWeight += voteWeight;

    weightedReturnSum += weight * prop.expected_return;
    weightedLossSum += weight * prop.expected_loss;
    weightedConfidenceSum += weight * prop.confidence;
  }

  const normalizedConfidence = totalWeight > 0 ? Number((weightedConfidenceSum / totalWeight).toFixed(4)) : 0.5;
  const netExpectedReturn = totalWeight > 0 ? Number((weightedReturnSum / totalWeight).toFixed(4)) : 0.01;
  const netExpectedLoss = totalWeight > 0 ? Number((weightedLossSum / totalWeight).toFixed(4)) : 0.01;
  const netRiskReward = Number((netExpectedReturn / Math.max(0.001, netExpectedLoss)).toFixed(2));

  let consensusSignal = "HOLD";
  if (buyWeight > sellWeight && buyWeight > holdWeight && buyWeight / totalWeight >= 0.35) {
    consensusSignal = "BUY";
  } else if (sellWeight > buyWeight && sellWeight > holdWeight && sellWeight / totalWeight >= 0.35) {
    consensusSignal = "SELL";
  }

  return {
    symbol: cleanSymbol,
    consensusSignal,
    consensusConfidence: normalizedConfidence,
    expected_return: netExpectedReturn,
    expected_loss: netExpectedLoss,
    riskRewardRatio: netRiskReward,
    regime,
    buyWeightRatio: Number((buyWeight / totalWeight).toFixed(2)),
    sellWeightRatio: Number((sellWeight / totalWeight).toFixed(2)),
    activeProposalsCount: activeProposals.length,
    disqualifiedProposalsCount: disqualifiedProposals.length,
    disqualifiedProposals,
    auditTrail,
    verdict: netRiskReward >= 1.5 && normalizedConfidence >= 0.70
      ? "HIGH_CONVICTION_SETUP"
      : netRiskReward >= 1.2
        ? "MODERATE_SETUP"
        : "LOW_CONVICTION_STANDBY"
  };
}
