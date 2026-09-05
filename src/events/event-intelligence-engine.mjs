// src/events/event-intelligence-engine.mjs
// Event Intelligence & Catalyst Scoring Engine.
// Evaluates news, corporate filings, macro announcements, and executive disclosures.
// Links events directly to historical reaction models, producing quantitative impact scores.

export class EventIntelligenceEngine {
  constructor() {
    this.categoryImpactWeights = {
      EARNINGS: 0.35,
      SEC_FILINGS: 0.25,
      CEO_STATEMENTS: 0.15,
      ANALYST_CHANGES: 0.10,
      MACRO_RELEASES: 0.25,
      GOVERNMENT_POLICY: 0.20,
      SUPPLY_CHAIN: 0.15,
      SOCIAL_SENTIMENT: 0.10
    };
  }

  /**
   * Score an asset event stream and derive quantitative catalyst impact.
   * @param {string} symbol - Asset ticker (e.g. TSLA, AAPL)
   * @param {Array<Object>} events - Stream of parsed raw events
   * @returns {Object} Quantitative Event Impact Score
   */
  evaluateEventImpact(symbol, events = []) {
    let positiveScoreSum = 0;
    let negativeScoreSum = 0;
    let confidenceSum = 0;
    let weightSum = 0;

    const analyzedEvents = [];

    for (const evt of events) {
      const category = (evt.category || "GENERAL").toUpperCase();
      const weight = this.categoryImpactWeights[category] || 0.10;
      const rawSentiment = evt.sentimentScore ?? 0.0; // -1 to +1
      const confidence = evt.confidence ?? 0.75;

      const impact = rawSentiment * weight;
      if (impact > 0) {
        positiveScoreSum += impact;
      } else {
        negativeScoreSum += Math.abs(impact);
      }

      confidenceSum += confidence * weight;
      weightSum += weight;

      analyzedEvents.push({
        headline: evt.headline || "Corporate/Market Event",
        category,
        sentiment: rawSentiment,
        calculatedImpact: Number(impact.toFixed(3)),
        source: evt.source || "Feed"
      });
    }

    const normPositive = weightSum > 0 ? (positiveScoreSum / weightSum) : 0.0;
    const normNegative = weightSum > 0 ? (negativeScoreSum / weightSum) : 0.0;
    const avgConfidence = weightSum > 0 ? (confidenceSum / weightSum) : 0.70;

    const netImpact = normPositive - normNegative;
    const expectedHorizon = Math.abs(netImpact) > 0.4 ? "3-5 Days" : "1-2 Days";

    return {
      symbol: symbol.toUpperCase(),
      eventCount: events.length,
      impactScore: {
        positive: Number(normPositive.toFixed(2)),
        negative: Number((-normNegative).toFixed(2)),
        netImpact: Number(netImpact.toFixed(2)),
        confidence: Number(avgConfidence.toFixed(2)),
        expectedHorizon
      },
      events: analyzedEvents,
      timestamp: Date.now()
    };
  }
}

export const eventIntelligenceEngine = new EventIntelligenceEngine();
