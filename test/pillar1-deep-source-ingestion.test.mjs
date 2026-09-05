import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateFractionalDifferentiation,
  evaluateTripleBarrierLabeling
} from "../src/technical-indicators.mjs";

import {
  evaluateTradeMasterRlPolicy,
  evaluatePpoPolicy
} from "../src/rl-adaptive-policy.mjs";

import {
  evaluateBerkshireMoat,
  calculateGrahamDcfMarginOfSafety,
  getOpportunityRankings
} from "../src/opportunity-ranker.mjs";

import {
  calculateHummingbotMarketMakingSpread,
  simulateExchangeCoreMatchingImpact,
  updateOrderBookL2,
  clearOrderBook
} from "../src/order-book-depth.mjs";

import {
  analyzeStocksightSocialSentiment,
  evaluateTradingViewIndicatorConfluence
} from "../src/sentiment-vision-news.mjs";

test("Pillar 1: AFML Fractional Differentiation & Triple-Barrier Labeling", () => {
  const prices = [100, 102, 101, 104, 107, 106, 109, 112, 115, 114, 118];
  const fd = calculateFractionalDifferentiation(prices, 0.4);
  assert.equal(fd.length, prices.length);
  assert.ok(typeof fd[fd.length - 1] === "number");

  const pt = evaluateTripleBarrierLabeling([100, 102, 105], { volatility: 0.02 });
  assert.equal(pt.outcome, "PROFIT_TAKE");
  assert.equal(pt.barrierHit, "UPPER_HORIZONTAL");

  const sl = evaluateTripleBarrierLabeling([100, 98, 95], { volatility: 0.02 });
  assert.equal(sl.outcome, "STOP_LOSS");
  assert.equal(sl.barrierHit, "LOWER_HORIZONTAL");
});

test("Pillar 1: NTU TradeMaster Actor-Critic RL Policy Evaluation", () => {
  const rl = evaluateTradeMasterRlPolicy({
    symbol: "BTCUSDT",
    orderBookImbalance: 0.35,
    adxTrendStrength: 35.0,
    historicalSharpe: 2.2,
    recentReward: 2.0
  });

  assert.equal(rl.engine, "TRADEMASTER_NTU_PPO_POLICY_v100");
  assert.equal(rl.action, "ACCUMULATE");
  assert.ok(rl.policyConfidence > 0.4);
  assert.ok(rl.actionProbabilities.ACCUMULATE > rl.actionProbabilities.TRIM);
});

test("Pillar 1: AI Berkshire Moat & ValueCell Graham DCF Margin of Safety", () => {
  const moat = evaluateBerkshireMoat("AAPL");
  assert.equal(moat.moatRating, "WIDE_MOAT");
  assert.equal(moat.pricingPower, "HIGH");

  const dcf = calculateGrahamDcfMarginOfSafety("AAPL", 150);
  assert.ok(dcf.estimatedFairValue > 150);
  assert.ok(dcf.marginOfSafetyPct > 15);
  assert.equal(dcf.verdict, "STRONG_VALUE_DISCOUNT");

  const opps = getOpportunityRankings(["AAPL", "TSLA", "BTC"]);
  assert.ok(opps.rankings.length >= 3);
  assert.ok(opps.topOpportunity.opportunityScore >= 75);
  assert.ok(opps.rankings.some(r => r.moatRating === "WIDE_MOAT"));
});

test("Pillar 1: Hummingbot PMM Spread & Exchange-Core Matching Impact", () => {
  clearOrderBook("SOLUSDT");
  updateOrderBookL2("SOLUSDT", {
    bids: [[150, 50], [149, 100]],
    asks: [[151, 40], [152, 80]]
  });

  const pmm = calculateHummingbotMarketMakingSpread("SOLUSDT", { targetVolatility: 0.025 });
  assert.equal(pmm.engine, "HUMMINGBOT_AVELLANEDA_STOIKOV_PMM");
  assert.ok(pmm.optimalBid < pmm.midPrice);
  assert.ok(pmm.optimalAsk > pmm.midPrice);
  assert.ok(pmm.spreadBps > 0);

  const match = simulateExchangeCoreMatchingImpact("SOLUSDT", { side: "buy", quantity: 30 });
  assert.equal(match.engine, "EXCHANGE_CORE_LMAX_MATCHER");
  assert.equal(match.executedQuantity, 30);
  assert.equal(match.averageFillPrice, 151);
  assert.equal(match.slippageBps, 0);
  assert.equal(match.liquidityRating, "PRIME_A_PLUS");
});

test("Pillar 1: Stocksight NLP Sentiment & TradingView Indicator Confluence", () => {
  const social = analyzeStocksightSocialSentiment("NVDA", [
    "Massive institutional accumulation on NVDA ahead of earnings!",
    "Bullish breakout with record volume confirmed."
  ]);
  assert.equal(social.engine, "STOCKSIGHT_SOCIAL_NLP_v100");
  assert.equal(social.socialSentiment, "VERY_BULLISH");
  assert.ok(social.sentimentScore > 0);

  const tv = evaluateTradingViewIndicatorConfluence("NVDA", {
    rsi: 58,
    macdHistogram: 2.1,
    supertrend: "BULLISH",
    emaFastAboveSlow: true
  });
  assert.equal(tv.engine, "TRADINGVIEW_MCP_CONFLUENCE_v100");
  assert.equal(tv.isConfluent, true);
  assert.equal(tv.confluencePercent, 100);
  assert.equal(tv.signalVerdict, "PRIME_CONFLUENCE_BUY");
});
