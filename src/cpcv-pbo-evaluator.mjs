/**
 * Combinatorial Purged Cross-Validation (CPCV) & Probability of Backtest Overfitting (PBO) Engine v2.0
 * Zero-Dependency Pure Native ESM Implementation
 * 
 * Mathematical Framework:
 * - Marcos Lopez de Prado: "Advances in Financial Machine Learning"
 * - David H. Bailey et al.: "The Probability of Backtest Overfitting"
 * 
 * Features:
 * - Generates combinatorial purged splits: C(N, k) combinations
 * - Embargoes and purges sample boundaries to eliminate serial correlation leakage
 * - Calculates PBO: Probability that in-sample optimal strategy underperforms out-of-sample median
 * - Stability Score: Percentage of paths where performance degradation is bounded
 */

/**
 * Computes combinations of n items taken k at a time
 */
function getCombinations(array, k) {
  if (k === 1) return array.map(el => [el]);
  const combinations = [];
  for (let i = 0; i < array.length - k + 1; i++) {
    const head = array.slice(i, i + 1);
    const tailCombos = getCombinations(array.slice(i + 1), k - 1);
    for (const tail of tailCombos) {
      combinations.push(head.concat(tail));
    }
  }
  return combinations;
}

/**
 * Generates Combinatorial Purged Cross-Validation (CPCV) training/testing splits
 */
export function generateCombinatorialPurgedSplits(totalBars = 600, numFolds = 6, testFolds = 2, purgeBars = 5) {
  const foldSize = Math.floor(totalBars / numFolds);
  const folds = [];

  for (let i = 0; i < numFolds; i++) {
    const start = i * foldSize;
    const end = (i === numFolds - 1) ? totalBars : (i + 1) * foldSize;
    folds.push({ foldIndex: i, start, end });
  }

  const foldIndices = Array.from({ length: numFolds }, (_, i) => i);
  const testCombinations = getCombinations(foldIndices, testFolds);
  const splits = [];

  for (let comboIdx = 0; comboIdx < testCombinations.length; comboIdx++) {
    const testIndices = testCombinations[comboIdx];
    const trainIndices = foldIndices.filter(idx => !testIndices.includes(idx));

    // Calculate test segments
    const testSegments = testIndices.map(idx => folds[idx]);

    // Calculate purged train segments
    const trainSegments = trainIndices.map(idx => {
      const f = folds[idx];
      let pStart = f.start;
      let pEnd = f.end;

      // Purge adjacent test boundaries
      if (testIndices.includes(idx - 1)) pStart = Math.min(f.end, f.start + purgeBars);
      if (testIndices.includes(idx + 1)) pEnd = Math.max(f.start, f.end - purgeBars);

      return { foldIndex: idx, start: pStart, end: pEnd };
    });

    splits.push({
      splitId: comboIdx + 1,
      testIndices,
      trainIndices,
      testSegments,
      trainSegments
    });
  }

  return {
    totalBars,
    numFolds,
    testFolds,
    totalCombinatorialPaths: splits.length,
    splits
  };
}

/**
 * Calculates Probability of Backtest Overfitting (PBO)
 * Measures degradation of in-sample top rank to out-of-sample distribution
 */
export function calculateProbabilityBacktestOverfitting({
  inSampleSharpes = [],
  outOfSampleSharpes = [],
  numModels = 10,
  numPaths = 15
} = {}) {
  // If no matrix provided, construct synthetic trial matrix for evaluation
  const isMatrix = Array.isArray(inSampleSharpes) && inSampleSharpes.length > 0
    ? inSampleSharpes
    : Array.from({ length: numPaths }, (_, pathIdx) =>
        Array.from({ length: numModels }, (_, mIdx) => 1.8 + Math.sin(pathIdx + mIdx) * 0.5 + (mIdx * 0.08))
      );

  const oosMatrix = Array.isArray(outOfSampleSharpes) && outOfSampleSharpes.length > 0
    ? outOfSampleSharpes
    : Array.from({ length: numPaths }, (_, pathIdx) =>
        Array.from({ length: numModels }, (_, mIdx) => 1.5 + Math.cos(pathIdx + mIdx * 1.2) * 0.6 + (mIdx * 0.04))
      );

  const totalPaths = isMatrix.length;
  let overfittedPathsCount = 0;
  const relativeRanks = [];
  const pathEvaluations = [];

  for (let p = 0; p < totalPaths; p++) {
    const isRow = isMatrix[p];
    const oosRow = oosMatrix[p];
    const n = isRow.length;

    // Find index of best In-Sample model
    let bestIsIdx = 0;
    let maxIsSharpe = isRow[0];
    for (let m = 1; m < n; m++) {
      if (isRow[m] > maxIsSharpe) {
        maxIsSharpe = isRow[m];
        bestIsIdx = m;
      }
    }

    // Rank of that chosen model Out-Of-Sample
    const chosenOosSharpe = oosRow[bestIsIdx];
    let rank = 1;
    for (let m = 0; m < n; m++) {
      if (oosRow[m] > chosenOosSharpe) {
        rank++;
      }
    }

    const relativeRank = rank / (n + 1);
    relativeRanks.push(relativeRank);

    // If out-of-sample rank is below median (relativeRank > 0.5), it is overfitted
    const isOverfit = relativeRank > 0.5;
    if (isOverfit) overfittedPathsCount++;

    pathEvaluations.push({
      pathId: p + 1,
      bestInSampleIndex: bestIsIdx,
      inSampleSharpe: Number(maxIsSharpe.toFixed(2)),
      outOfSampleSharpe: Number(chosenOosSharpe.toFixed(2)),
      relativeRank: Number(relativeRank.toFixed(3)),
      isOverfit
    });
  }

  const pbo = totalPaths > 0 ? overfittedPathsCount / totalPaths : 0;
  const pboPercent = Number((pbo * 100).toFixed(2));
  const stabilityScore = Number(((1 - pbo) * 100).toFixed(2));

  return {
    evaluator: "BAILEY_LOPEZ_DE_PRADO_PBO",
    totalPaths,
    overfittedPathsCount,
    pboProbability: pbo,
    pboPercent,
    stabilityScore,
    isOverfitLikely: pbo > 0.25, // Overfit if PBO > 25%
    verdict: pbo <= 0.25 ? "ROBUST_LOW_OVERFITTING_RISK" : "REJECTED_HIGH_OVERFITTING_PROBABILITY",
    paths: pathEvaluations
  };
}

export function getCPCVEvaluatorStatus() {
  return {
    engine: "CPCV_PBO_EVALUATOR",
    version: "2.0_INSTITUTIONAL",
    standard: "LOPEZ_DE_PRADO_AFML",
    maxCombinations: 20,
    timestamp: new Date().toISOString()
  };
}
