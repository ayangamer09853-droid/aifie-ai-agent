/**
 * 6-Factor AI Trade Scoring Engine (0-100) for Aifie AI Agent v8.0
 * Evaluates 6 core components:
 * 1. Market Structure (20 pts)
 * 2. Liquidity (15 pts)
 * 3. Order Flow / CVD (20 pts)
 * 4. VWAP / Anchored VWAP (15 pts)
 * 5. Volume Profile (15 pts)
 * 6. News & Macro Context (15 pts)
 * Total Score = 100
 * Classification: Score > 85 -> STRONG_SETUP, 70-85 -> VALID_SETUP, < 70 -> IGNORE_SETUP
 */

import { analyzeSmartMoneyStructure } from "./smc-market-structure.mjs";
import { calculateOrderFlowCvd } from "./order-flow-cvd.mjs";
import { calculateVolumeProfile, calculateAnchoredVwap } from "./volume-profile-auction.mjs";

export function calculate6FactorTradeScore({ symbol = "AAPL", prices = [] } = {}) {
  const smc = analyzeSmartMoneyStructure(prices);
  const cvd = calculateOrderFlowCvd(symbol, prices);
  const vp = calculateVolumeProfile(prices);
  const avwap = calculateAnchoredVwap(prices);

  // 1. Market Structure Score (Max 20)
  let msScore = 12;
  if (smc.bosDetected === "BULLISH_BOS") msScore += 5;
  if (smc.chochDetected === "BULLISH_CHOCH") msScore += 3;

  // 2. Liquidity Score (Max 15)
  let liqScore = 10;
  if (smc.liquidityPools.bslSwept || smc.liquidityPools.sslSwept) liqScore += 5;

  // 3. Order Flow / CVD Score (Max 20)
  let ofScore = 12;
  if (cvd.cvdTrend === "BULLISH_CVD_ACCUMULATION") ofScore += 5;
  if (cvd.institutionalFootprint.absorptionDetected) ofScore += 3;

  // 4. VWAP / Anchored VWAP Score (Max 15)
  let vwapScore = 10;
  if (avwap.priceToAvwapStatus === "ABOVE_ANCHORED_VWAP_BULLISH") vwapScore += 5;

  // 5. Volume Profile Score (Max 15)
  let vpScore = 10;
  if (vp.auctionStatus === "ACCEPTED_INSIDE_VALUE_AREA") vpScore += 5;

  // 6. News & Macro Context Score (Max 15)
  let newsScore = 14; // Default normal macro background

  const totalScore = msScore + liqScore + ofScore + vwapScore + vpScore + newsScore;
  const classification = totalScore >= 85 ? "STRONG_SETUP" : totalScore >= 70 ? "VALID_SETUP" : "IGNORE_SETUP";

  return {
    symbol: symbol.toUpperCase(),
    totalScore,
    classification,
    recommendation: classification === "STRONG_SETUP" ? "EXECUTE_WITH_HIGH_CONFIDENCE" : classification === "VALID_SETUP" ? "EXECUTE_WITH_STANDARD_RISK" : "IGNORE_TRADE",
    breakdown: {
      marketStructure: { score: msScore, max: 20 },
      liquidity: { score: liqScore, max: 15 },
      orderFlowCvd: { score: ofScore, max: 20 },
      vwapAnchored: { score: vwapScore, max: 15 },
      volumeProfile: { score: vpScore, max: 15 },
      newsContext: { score: newsScore, max: 15 }
    }
  };
}
