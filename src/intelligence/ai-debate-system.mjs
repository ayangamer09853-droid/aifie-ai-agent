// src/intelligence/ai-debate-system.mjs
// Multi-Agent Specialist Debate & Evidence Fusion System.
// Coordinates 6 specialist agents: Technical, Fundamental, Macro, Sentiment, Microstructure, Risk Officer.
// Generates Bull/Bear synthesis, and invokes the Judge Agent using the quantitative formula:
// final_score = signal_strength * source_reliability * regime_compatibility * historical_edge * confidence.

import { aiRiskOfficer } from "./ai-risk-officer.mjs";

export class AIDebateSystem {
  constructor(config = {}) {
    this.sourceReliabilityWeights = {
      TECHNICAL: 0.85,
      FUNDAMENTAL: 0.80,
      MACRO: 0.75,
      SENTIMENT: 0.70,
      MICROSTRUCTURE: 0.90,
      RISK_OFFICER: 0.95
    };

    this.historicalEdgeFactor = config.historicalEdgeFactor || 0.88;
  }

  /**
   * Run the full multi-agent debate and evidence fusion pipeline.
   * @param {Object} market - Market snapshot and features
   * @param {Object} [regime] - Current market regime descriptor
   * @param {Object} [assetProfile] - Asset metadata & historical stats
   * @returns {Promise<Object>} Synthesis and final Judge decision
   */
  async conductDebate(market, regime = {}, assetProfile = {}) {
    const symbol = (market && market.symbol) || "ASSET";
    const currentRegime = regime.name || "BULL_LOW_VOL";

    // 1. Gather specialist agent perspectives
    const technical = this._analyzeTechnical(market);
    const fundamental = this._analyzeFundamental(market, assetProfile);
    const macro = this._analyzeMacro(market, regime);
    const sentiment = this._analyzeSentiment(market);
    const microstructure = this._analyzeMicrostructure(market);

    const specialistViews = [technical, fundamental, macro, sentiment, microstructure];

    // 2. Synthesize Bull and Bear Debaters
    const bullEvidences = [];
    const bearEvidences = [];
    let bullWeightedReturn = 0;
    let bearWeightedReturn = 0;
    let bullWeightSum = 0;
    let bearWeightSum = 0;

    for (const view of specialistViews) {
      const reliability = this.sourceReliabilityWeights[view.agent] || 0.75;
      if (view.stance === "BULL") {
        bullEvidences.push(...view.evidence);
        bullWeightedReturn += view.expectedReturn * view.confidence * reliability;
        bullWeightSum += view.confidence * reliability;
      } else if (view.stance === "BEAR") {
        bearEvidences.push(...view.evidence);
        bearWeightedReturn += Math.abs(view.expectedReturn) * view.confidence * reliability;
        bearWeightSum += view.confidence * reliability;
      }
    }

    const bullExpectedReturn = bullWeightSum > 0 ? (bullWeightedReturn / bullWeightSum) : 0.02;
    const bullConfidence = bullWeightSum > 0 ? Math.min(0.92, (bullWeightSum / 3.0)) : 0.40;

    const bearExpectedReturn = bearWeightSum > 0 ? (bearWeightedReturn / bearWeightSum) : -0.02;
    const bearConfidence = bearWeightSum > 0 ? Math.min(0.92, (bearWeightSum / 3.0)) : 0.40;

    const bullAgent = {
      stance: "BULL",
      expectedReturn: Number(bullExpectedReturn.toFixed(4)),
      confidence: Number(bullConfidence.toFixed(2)),
      evidence: Array.from(new Set(bullEvidences))
    };

    const bearAgent = {
      stance: "BEAR",
      expectedReturn: Number((-Math.abs(bearExpectedReturn)).toFixed(4)),
      confidence: Number(bearConfidence.toFixed(2)),
      evidence: Array.from(new Set(bearEvidences))
    };

    // 3. Preliminary Debate Synthesis
    const preliminaryAction = bullConfidence > bearConfidence ? "BUY" : (bearConfidence > bullConfidence ? "SELL" : "HOLD");
    const preliminaryConfidence = Math.max(bullConfidence, bearConfidence);
    const preliminaryReturn = preliminaryAction === "BUY" ? bullExpectedReturn : -bearExpectedReturn;

    // 4. AI Risk Officer Review
    const riskOfficerReview = aiRiskOfficer.evaluateProposal({
      symbol,
      action: preliminaryAction,
      confidence: preliminaryConfidence,
      expectedReturn: preliminaryReturn,
      agentViews: specialistViews
    }, {
      regime: currentRegime,
      volatilityZScore: market.volatilityZScore || 0,
      dataQualityScore: market.dataQualityScore || 95
    });

    // 5. Judge Agent Decision Calculation
    // Formula: signal_strength * source_reliability * regime_compatibility * historical_edge * confidence
    const signalStrength = Math.abs(preliminaryReturn) * 10; // Normalized signal strength
    const averageSourceReliability = 0.84;
    const regimeCompatibility = this._calculateRegimeCompatibility(preliminaryAction, currentRegime);
    const historicalEdge = this.historicalEdgeFactor;
    const effectiveConfidence = preliminaryConfidence * riskOfficerReview.downscaleFactor;

    const judgeCompositeScore = signalStrength * averageSourceReliability * regimeCompatibility * historicalEdge * effectiveConfidence;

    let finalAction = preliminaryAction;
    if (riskOfficerReview.veto || judgeCompositeScore < 0.15) {
      finalAction = "HOLD";
    }

    return {
      symbol,
      regime: currentRegime,
      specialists: specialistViews,
      debate: {
        bullAgent,
        bearAgent
      },
      riskOfficer: riskOfficerReview,
      judge: {
        finalAction,
        compositeScore: Number(judgeCompositeScore.toFixed(4)),
        formulaBreakdown: {
          signalStrength: Number(signalStrength.toFixed(3)),
          sourceReliability: averageSourceReliability,
          regimeCompatibility: Number(regimeCompatibility.toFixed(2)),
          historicalEdge: historicalEdge,
          effectiveConfidence: Number(effectiveConfidence.toFixed(2))
        },
        vetoed: riskOfficerReview.veto,
        decisionTimestamp: Date.now()
      }
    };
  }

  _calculateRegimeCompatibility(action, regimeName) {
    const reg = (regimeName || "").toUpperCase();
    if (action === "BUY") {
      if (reg.includes("BULL") || reg.includes("RISK_ON")) return 1.0;
      if (reg.includes("SIDEWAYS") || reg.includes("LOW_VOL")) return 0.8;
      if (reg.includes("BEAR") || reg.includes("HIGH_VOL")) return 0.4;
    } else if (action === "SELL") {
      if (reg.includes("BEAR") || reg.includes("RISK_OFF")) return 1.0;
      if (reg.includes("HIGH_VOL")) return 0.85;
      if (reg.includes("BULL")) return 0.35;
    }
    return 0.6;
  }

  _analyzeTechnical(market) {
    const rsi = market.rsi ?? 52;
    const maFast = market.sma20 ?? 100;
    const maSlow = market.sma50 ?? 98;
    const stance = maFast > maSlow && rsi < 70 ? "BULL" : (rsi > 75 || maFast < maSlow ? "BEAR" : "NEUTRAL");

    return {
      agent: "TECHNICAL",
      stance,
      confidence: 0.76,
      expectedReturn: stance === "BULL" ? 0.045 : -0.035,
      evidence: stance === "BULL" ? ["Moving average golden cross", "RSI expanding in bullish regime"] : ["Overbought RSI", "Moving average compression"]
    };
  }

  _analyzeFundamental(market, assetProfile) {
    const pe = assetProfile.peRatio || 24;
    const growth = assetProfile.earningsGrowth || 0.15;
    const stance = growth > 0.12 && pe < 35 ? "BULL" : "BEAR";

    return {
      agent: "FUNDAMENTAL",
      stance,
      confidence: 0.72,
      expectedReturn: stance === "BULL" ? 0.055 : -0.02,
      evidence: stance === "BULL" ? ["Robust quarterly earnings growth", "Reasonable valuation PEG < 1.8"] : ["Elevated valuation multiple", "Decelerating earnings"]
    };
  }

  _analyzeMacro(market, regime) {
    const yieldCurve = regime.yieldCurveSpread ?? 0.25;
    const vix = market.vix ?? 18;
    const stance = vix < 22 && yieldCurve >= 0 ? "BULL" : "BEAR";

    return {
      agent: "MACRO",
      stance,
      confidence: 0.70,
      expectedReturn: stance === "BULL" ? 0.03 : -0.04,
      evidence: stance === "BULL" ? ["Stable VIX environment", "Normalized yield curve spread"] : ["Inverted yield curve", "Elevated volatility regime"]
    };
  }

  _analyzeSentiment(market) {
    const sentimentScore = market.sentimentScore ?? 0.65; // 0 to 1
    const stance = sentimentScore > 0.55 ? "BULL" : (sentimentScore < 0.45 ? "BEAR" : "NEUTRAL");

    return {
      agent: "SENTIMENT",
      stance,
      confidence: 0.68,
      expectedReturn: stance === "BULL" ? 0.025 : -0.025,
      evidence: stance === "BULL" ? ["Positive social momentum", "Favorable news flow"] : ["Bearish retail chatter", "Negative news narrative"]
    };
  }

  _analyzeMicrostructure(market) {
    const spreadBps = market.spreadBps ?? 4.2;
    const orderBookImbalance = market.orderBookImbalance ?? 0.25; // >0 means bid-heavy
    const stance = orderBookImbalance > 0.1 && spreadBps < 10 ? "BULL" : (orderBookImbalance < -0.1 ? "BEAR" : "NEUTRAL");

    return {
      agent: "MICROSTRUCTURE",
      stance,
      confidence: 0.82,
      expectedReturn: stance === "BULL" ? 0.02 : -0.02,
      evidence: stance === "BULL" ? ["Tight bid-ask spread", "Bid-side order book depth absorption"] : ["Thin bid depth", "Aggressive offer pressure"]
    };
  }
}

export const aiDebateSystem = new AIDebateSystem();
