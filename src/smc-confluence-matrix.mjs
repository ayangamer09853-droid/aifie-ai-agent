/**
 * Institutional Confluence & Kelly Criterion Engine for Aifie AI Agent v7.0
 * Combines SMC + CVD + Volume Profile + Anchored VWAP into 0-100 AI Score,
 * calculates 3RR / 5RR targets, and computes Kelly Criterion position sizing.
 */

import { analyzeSmartMoneyStructure } from "./smc-market-structure.mjs";
import { calculateOrderFlowCvd } from "./order-flow-cvd.mjs";
import { calculateVolumeProfile, calculateAnchoredVwap } from "./volume-profile-auction.mjs";

export function evaluateInstitutionalConfluence(symbol = "AAPL", prices = []) {
  const smc = analyzeSmartMoneyStructure(prices);
  const cvd = calculateOrderFlowCvd(symbol, prices);
  const vp = calculateVolumeProfile(prices);
  const avwap = calculateAnchoredVwap(prices);

  const curPrice = smc.currentPrice;

  let confluenceScore = 50;
  if (smc.bosDetected === "BULLISH_BOS") confluenceScore += 15;
  if (smc.chochDetected === "BULLISH_CHOCH") confluenceScore += 10;
  if (cvd.cvdTrend === "BULLISH_CVD_ACCUMULATION") confluenceScore += 10;
  if (avwap.priceToAvwapStatus === "ABOVE_ANCHORED_VWAP_BULLISH") confluenceScore += 10;
  if (vp.auctionStatus === "ACCEPTED_INSIDE_VALUE_AREA") confluenceScore += 5;

  const score = Math.min(99, Math.max(10, confluenceScore));

  // Risk-Reward Targets (3RR & 5RR)
  const stopRiskAmount = curPrice * 0.015; // 1.5% stop loss
  const stopLossPrice = Number((curPrice - stopRiskAmount).toFixed(2));
  const target3RR = Number((curPrice + (stopRiskAmount * 3)).toFixed(2));
  const target5RR = Number((curPrice + (stopRiskAmount * 5)).toFixed(2));

  // Kelly Criterion Calculation: f* = (p * b - q) / b
  const winProbability = score / 100;
  const lossProbability = 1 - winProbability;
  const rewardRiskRatio = 3.0; // 3RR baseline
  const kellyFraction = Math.max(0.005, Number(((winProbability * rewardRiskRatio - lossProbability) / rewardRiskRatio).toFixed(4)));

  return {
    symbol: symbol.toUpperCase(),
    currentPrice: curPrice,
    institutionalAiScore: score,
    confluenceGrade: score >= 80 ? "INSTITUTIONAL_PRIME_CONFLUENCE" : score >= 65 ? "HIGH_PROBABILITY_SETUP" : "NEUTRAL_CONFLUENCE",
    riskRewardTargets: {
      stopLossPrice,
      riskPerShare: Number(stopRiskAmount.toFixed(2)),
      tp1_3RR: target3RR,
      tp2_5RR: target5RR
    },
    kellyCriterion: {
      winProbabilityPercent: `${score}%`,
      rewardRiskRatio: "3.0 : 1",
      kellyOptimalFraction: kellyFraction,
      recommendedCapitalAllocPercent: `${(kellyFraction * 100).toFixed(2)}%`
    },
    components: {
      smc,
      cvd,
      volumeProfile: vp,
      anchoredVwap: avwap
    }
  };
}
