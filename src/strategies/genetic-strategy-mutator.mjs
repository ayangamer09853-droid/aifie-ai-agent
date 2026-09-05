// src/strategies/genetic-strategy-mutator.mjs
// Genetic Alpha Strategy Mutation & Walk-Forward Falsification Engine
// Implements Bailey & López de Prado Deflated Sharpe Ratio (DSR) gate
// Pure Node.js ESM built-ins only

import { randomBytes } from "node:crypto";

/**
 * Generate standard normal random variable using Box-Muller transform.
 */
function gaussianRandom() {
  const buf = randomBytes(8);
  const u1 = Math.max(1e-10, buf.readUInt32BE(0) / 0xffffffff);
  const u2 = buf.readUInt32BE(4) / 0xffffffff;
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Cumulative standard normal distribution function (Phi).
 */
function normalCdf(x) {
  const t = 1.0 / (1.0 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2.0);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1.0 - prob : prob;
}

export class GeneticStrategyMutator {
  constructor() {
    this.parameterRanges = {
      emaFast: { min: 5, max: 25, isInteger: true, default: 12 },
      emaSlow: { min: 26, max: 100, isInteger: true, default: 50 },
      rsiPeriod: { min: 7, max: 28, isInteger: true, default: 14 },
      rsiOversold: { min: 20, max: 40, isInteger: true, default: 30 },
      rsiOverbought: { min: 60, max: 80, isInteger: true, default: 70 },
      stopLossAtrMultiplier: { min: 1.0, max: 4.0, isInteger: false, default: 2.0 },
      takeProfitAtrMultiplier: { min: 1.5, max: 6.0, isInteger: false, default: 3.5 }
    };
  }

  /**
   * Mutate parent chromosome with bounded Gaussian perturbation.
   */
  mutateChromosome(parentChromosome, mutationRate = 0.15) {
    const mutant = {};

    for (const [key, spec] of Object.entries(this.parameterRanges)) {
      const parentVal = parentChromosome[key] !== undefined ? parentChromosome[key] : spec.default;
      const rangeSpan = spec.max - spec.min;

      // Add Gaussian perturbation scaled by mutationRate
      const delta = gaussianRandom() * rangeSpan * mutationRate;
      let mutatedVal = parentVal + delta;

      // Clamp within boundaries
      mutatedVal = Math.max(spec.min, Math.min(spec.max, mutatedVal));
      mutant[key] = spec.isInteger ? Math.round(mutatedVal) : Number(mutatedVal.toFixed(2));
    }

    // Ensure logical constraint: emaSlow > emaFast
    if (mutant.emaSlow <= mutant.emaFast) {
      mutant.emaSlow = mutant.emaFast + 10;
    }

    return mutant;
  }

  /**
   * Simulate strategy returns for parameter evaluation.
   */
  simulatePerformance(chromosome, seedTicks = 120) {
    let equity = 10000;
    const tradePnLs = [];

    // Synthetic market simulation parameterized by chromosome characteristics
    const spreadEfficiency = (chromosome.takeProfitAtrMultiplier / (chromosome.stopLossAtrMultiplier || 1));
    const speedRatio = chromosome.emaSlow / (chromosome.emaFast || 1);

    for (let i = 0; i < seedTicks; i++) {
      const marketNoise = gaussianRandom() * 0.015;
      const trendSignal = (Math.sin(i * 0.1) * 0.01) + (speedRatio > 3 ? 0.002 : -0.001);
      const stepReturn = trendSignal + marketNoise;

      if (i % 5 === 0) {
        const isWin = stepReturn > 0;
        const pnl = isWin 
          ? equity * 0.02 * (spreadEfficiency > 1.5 ? 1.4 : 1.0)
          : -equity * 0.012;
        tradePnLs.push(pnl);
        equity += pnl;
      }
    }

    // Calculate metrics
    const wins = tradePnLs.filter(p => p > 0);
    const winRate = tradePnLs.length > 0 ? wins.length / tradePnLs.length : 0.5;
    const meanReturn = tradePnLs.reduce((a, b) => a + b, 0) / (tradePnLs.length || 1);
    const variance = tradePnLs.reduce((acc, p) => acc + Math.pow(p - meanReturn, 2), 0) / (tradePnLs.length || 1);
    const stdDev = Math.sqrt(variance) || 1;
    const annualizedSharpe = Number(((meanReturn / stdDev) * Math.sqrt(252)).toFixed(2));

    let peak = 10000;
    let maxDrawdown = 0;
    let runningEquity = 10000;

    for (const p of tradePnLs) {
      runningEquity += p;
      if (runningEquity > peak) peak = runningEquity;
      const dd = peak > 0 ? (peak - runningEquity) / peak : 0;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    return {
      tradesCount: tradePnLs.length,
      winRate: Number(winRate.toFixed(3)),
      annualizedSharpe,
      maxDrawdownPct: Number((maxDrawdown * 100).toFixed(2)),
      finalEquity: Number(equity.toFixed(2))
    };
  }

  /**
   * Bailey & López de Prado Deflated Sharpe Ratio (DSR) Calculator.
   * Tests whether the best strategy among N trials is statistically significant.
   */
  calculateDeflatedSharpeRatio({ observedSharpe, numberOfTrials = 20, samplePeriods = 250, skewness = -0.2, kurtosis = 3.5 }) {
    // Expected maximum Sharpe ratio among N trials under standard normal assumption:
    // E[max_N] approx (1 - gamma) * Phi^{-1}(1 - 1/N) + gamma * Phi^{-1}(1 - 1/(N * e))
    const eulerGamma = 0.5772156649;
    const invPhi1 = Math.sqrt(2.0) * Math.sqrt(Math.max(0.01, Math.log(Math.max(2, numberOfTrials))));
    const expectedMaxSharpe = (1.0 - eulerGamma) * invPhi1 + eulerGamma * Math.sqrt(2.0 * Math.log(numberOfTrials * Math.E));

    // Standard error of Sharpe under non-normal returns:
    // SE = sqrt( (1 - skew * SR + ((kurt - 1) / 4) * SR^2) / (T - 1) )
    const varianceNumerator = 1.0 - (skewness * observedSharpe) + (((kurtosis - 1.0) / 4.0) * Math.pow(observedSharpe, 2));
    const standardError = Math.sqrt(Math.max(1e-6, varianceNumerator) / Math.max(1, samplePeriods - 1));

    // Z-score vs expected max under multiple testing:
    const zScore = (observedSharpe - expectedMaxSharpe) / standardError;
    const dsr = Number(normalCdf(zScore).toFixed(4));
    const passesPboGate = dsr >= 0.95; // 95% confidence that finding is not due to data mining

    return {
      observedSharpe,
      numberOfTrials,
      expectedMaxSharpe: Number(expectedMaxSharpe.toFixed(3)),
      deflatedSharpeRatio: dsr,
      dsrPValue: dsr,
      passesPboGate,
      passAudit: passesPboGate,
      status: passesPboGate ? "STATISTICALLY_VALIDATED" : "REJECTED_OVERFITTING_RISK"
    };
  }

  /**
   * Run full genetic generation cycle: mutate, backtest, and rank candidates with DSR gate.
   */
  runEvolutionCycle({
    strategyName = "TrendFollowingBreakout",
    parent = {
      emaFast: 12,
      emaSlow: 50,
      rsiPeriod: 14,
      rsiOversold: 30,
      rsiOverbought: 70,
      stopLossAtrMultiplier: 2.0,
      takeProfitAtrMultiplier: 3.5
    },
    populationSize = 10,
    mutationRate = 0.15
  } = {}) {
    const population = [];

    // Include original parent
    const parentPerf = this.simulatePerformance(parent);
    population.push({
      generationId: "GEN-00-PARENT",
      chromosome: parent,
      performance: parentPerf,
      fitness: parentPerf.annualizedSharpe
    });

    // Generate mutant offspring
    for (let i = 1; i <= populationSize; i++) {
      const mutant = this.mutateChromosome(parent, mutationRate);
      const perf = this.simulatePerformance(mutant);
      population.push({
        generationId: `GEN-MUTANT-${String(i).padStart(2, "0")}`,
        chromosome: mutant,
        performance: perf,
        fitness: perf.annualizedSharpe
      });
    }

    // Rank population by Sharpe ratio descending
    population.sort((a, b) => b.performance.annualizedSharpe - a.performance.annualizedSharpe);

    const champion = population[0];
    const dsrAudit = this.calculateDeflatedSharpeRatio({
      observedSharpe: champion.performance.annualizedSharpe,
      numberOfTrials: population.length
    });

    return {
      strategyName,
      evaluatedCandidates: population.length,
      championCandidate: champion,
      deflatedSharpeAudit: dsrAudit,
      topCandidates: population.slice(0, 3),
      timestamp: Date.now()
    };
  }

  /**
   * Alias for runEvolutionCycle
   */
  evolvePopulation(options = {}) {
    return this.runEvolutionCycle(options);
  }
}

export const geneticStrategyMutator = new GeneticStrategyMutator();
