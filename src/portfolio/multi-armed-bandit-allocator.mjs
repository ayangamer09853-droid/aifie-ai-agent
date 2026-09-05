// src/portfolio/multi-armed-bandit-allocator.mjs
// Contextual Multi-Armed Bandit Strategy Allocator (Thompson Sampling & UCB1)
// Pure Node.js ESM built-ins only

import { randomBytes } from "crypto";

/**
 * Generate standard uniform pseudo-random number in [0, 1) using crypto.
 */
function secureRandom() {
  const buf = randomBytes(4);
  return buf.readUInt32BE(0) / 0xffffffff;
}

/**
 * Sample from Beta(alpha, beta) distribution via Johnk's generator or Normal approximation.
 */
function sampleBeta(alpha, beta) {
  // Use sum of uniforms / Box-Muller approximation for integer/real alpha, beta
  // Gamma(a, 1) / (Gamma(a, 1) + Gamma(b, 1))
  const sampleGamma = (shape) => {
    if (shape < 1) {
      return sampleGamma(shape + 1) * Math.pow(Math.max(1e-6, secureRandom()), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let u1 = secureRandom();
      let u2 = secureRandom();
      let z = Math.sqrt(-2.0 * Math.log(Math.max(1e-10, u1))) * Math.cos(2.0 * Math.PI * u2);
      let v = 1.0 + c * z;
      if (v <= 0) continue;
      v = v * v * v;
      let u = secureRandom();
      if (u < 1.0 - 0.0331 * z * z * z * z) return d * v;
      if (Math.log(u) < 0.5 * z * z + d * (1.0 - v + Math.log(v))) return d * v;
    }
  };

  const gAlpha = sampleGamma(Math.max(0.1, alpha));
  const gBeta = sampleGamma(Math.max(0.1, beta));
  return gAlpha / (gAlpha + gBeta || 1);
}

/**
 * Strategy Arm state tracked by the Bandit Allocator.
 */
export class StrategyArm {
  constructor(name, initialAlpha = 2, initialBeta = 2) {
    this.name = name;
    this.alpha = initialAlpha; // Prior wins / successes
    this.beta = initialBeta;   // Prior losses / failures
    this.pullCount = 0;
    this.totalReward = 0;
    this.peakEquity = 10000;
    this.currentEquity = 10000;
    this.drawdownPct = 0;
  }

  recordOutcome(pnlDollars, win = null) {
    this.pullCount++;
    this.totalReward += pnlDollars;
    this.currentEquity += pnlDollars;

    if (this.currentEquity > this.peakEquity) {
      this.peakEquity = this.currentEquity;
    }

    this.drawdownPct = this.peakEquity > 0 
      ? Math.max(0, ((this.peakEquity - this.currentEquity) / this.peakEquity) * 100) 
      : 0;

    const isWin = win !== null ? win : pnlDollars > 0;
    if (isWin) {
      this.alpha += 1;
    } else {
      this.beta += 1;
    }
  }

  getMeanReward() {
    return this.pullCount > 0 ? this.totalReward / this.pullCount : 0;
  }

  getWinRate() {
    return (this.alpha) / (this.alpha + this.beta);
  }
}

/**
 * Multi-Armed Bandit Strategy Allocator.
 */
export class MultiArmedBanditAllocator {
  constructor(strategyNames = [
    "stat_arb_cointegration",
    "trend_momentum",
    "pmm_liquidity_provisioning",
    "smc_orderblock_fvg",
    "cross_exchange_spatial_arb"
  ]) {
    this.strategies = new Map();
    for (const name of strategyNames) {
      this.strategies.set(name, new StrategyArm(name));
    }
  }

  recordStrategyPerformance(strategyName, pnlDollars, isWin = null) {
    if (!this.strategies.has(strategyName)) {
      this.strategies.set(strategyName, new StrategyArm(strategyName));
    }
    this.strategies.get(strategyName).recordOutcome(pnlDollars, isWin);
  }

  /**
   * Allocate capital using Thompson Sampling with Drawdown Pruning.
   */
  allocateThompsonSampling(totalCapital = 100000, explorationSamples = 5) {
    const rawScores = [];
    let totalScore = 0;

    for (const [name, arm] of this.strategies.entries()) {
      // 1. Draw average sample from Beta posterior over multiple iterations for stability
      let sampledValSum = 0;
      for (let s = 0; s < explorationSamples; s++) {
        sampledValSum += sampleBeta(arm.alpha, arm.beta);
      }
      const posteriorSample = sampledValSum / explorationSamples;

      // 2. Automated Drawdown Pruning
      // If Drawdown > 5% -> 0% allocation
      // If Drawdown > 3% -> 50% haircut
      let drawdownDampener = 1.0;
      let status = "ACTIVE";

      if (arm.drawdownPct >= 5.0) {
        drawdownDampener = 0.0;
        status = "PRUNED_MAX_DRAWDOWN";
      } else if (arm.drawdownPct >= 3.0) {
        drawdownDampener = 0.5;
        status = "THROTTLED_DRAWDOWN_WARNING";
      }

      const effectiveScore = posteriorSample * drawdownDampener;
      rawScores.push({
        strategy: name,
        arm,
        posteriorSample: Number(posteriorSample.toFixed(4)),
        drawdownPct: Number(arm.drawdownPct.toFixed(2)),
        drawdownDampener,
        effectiveScore,
        status
      });

      totalScore += effectiveScore;
    }

    // Normalize weights to sum exactly to 1.0 (or cash if all pruned)
    const allocations = [];
    for (const entry of rawScores) {
      const normalizedWeight = totalScore > 0 ? entry.effectiveScore / totalScore : (1 / this.strategies.size);
      const allocatedCapital = Math.round(normalizedWeight * totalCapital);

      allocations.push({
        strategy: entry.strategy,
        weight: Number(normalizedWeight.toFixed(4)),
        allocatedCapital,
        posteriorWinProb: entry.posteriorSample,
        drawdownPct: entry.drawdownPct,
        status: entry.status,
        winCount: entry.arm.alpha - 2,
        lossCount: entry.arm.beta - 2
      });
    }

    // Ensure sum of capital exactly matches totalCapital
    const sumCap = allocations.reduce((acc, a) => acc + a.allocatedCapital, 0);
    if (sumCap !== totalCapital && allocations.length > 0) {
      allocations[0].allocatedCapital += (totalCapital - sumCap);
    }

    return {
      method: "THOMPSON_SAMPLING_BETA",
      totalCapital,
      allocations,
      timestamp: Date.now()
    };
  }

  /**
   * Allocate capital using Upper Confidence Bound (UCB1) algorithm.
   */
  allocateUCB1(totalCapital = 100000, explorationConstantC = 1.414) {
    const totalPulls = Array.from(this.strategies.values()).reduce((acc, a) => acc + a.pullCount, 0) || 1;
    const ucbScores = [];
    let totalScore = 0;

    for (const [name, arm] of this.strategies.entries()) {
      const n_i = Math.max(1, arm.pullCount);
      const meanReward = Math.max(0, arm.getWinRate());
      const explorationBonus = explorationConstantC * Math.sqrt((2 * Math.log(totalPulls)) / n_i);
      const ucbScore = meanReward + explorationBonus;

      let dampener = arm.drawdownPct >= 5.0 ? 0.0 : (arm.drawdownPct >= 3.0 ? 0.5 : 1.0);
      const effectiveScore = ucbScore * dampener;

      ucbScores.push({
        strategy: name,
        meanReward: Number(meanReward.toFixed(4)),
        explorationBonus: Number(explorationBonus.toFixed(4)),
        ucbScore: Number(ucbScore.toFixed(4)),
        drawdownPct: Number(arm.drawdownPct.toFixed(2)),
        effectiveScore
      });

      totalScore += effectiveScore;
    }

    const allocations = ucbScores.map(entry => {
      const weight = totalScore > 0 ? entry.effectiveScore / totalScore : (1 / this.strategies.size);
      return {
        strategy: entry.strategy,
        weight: Number(weight.toFixed(4)),
        allocatedCapital: Math.round(weight * totalCapital),
        ucbScore: entry.ucbScore,
        drawdownPct: entry.drawdownPct
      };
    });

    return {
      method: "UCB1_ALGORITHM",
      totalCapital,
      allocations,
      timestamp: Date.now()
    };
  }
}

export const multiArmedBanditAllocator = new MultiArmedBanditAllocator();
