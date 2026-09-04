/**
 * Walk-Forward Out-of-Sample Strategy Validator
 * Evaluates strategy robustness and detects overfitting across sliding train/test splits.
 */

import { Backtester } from "./backtester.mjs";

export function runWalkForwardTest(strategy, allData, windowSize = 40, stepSize = 10) {
  if (!Array.isArray(allData) || allData.length < windowSize + stepSize) {
    return [];
  }

  const results = [];

  for (let i = 0; i + windowSize + stepSize <= allData.length; i += stepSize) {
    const trainData = allData.slice(i, i + windowSize);
    const testData = allData.slice(i + windowSize, i + windowSize + stepSize);

    // Backtest on train window
    const backtester = new Backtester(strategy, trainData);
    const trainResult = backtester.run();

    // Validate on out-of-sample test window
    const validator = new Backtester(strategy, testData);
    const testResult = validator.run();

    const trainSharpe = trainResult.sharpeRatio || 0;
    const testSharpe = testResult.sharpeRatio || 0;
    const overfitting = Number((trainSharpe - testSharpe).toFixed(4));

    results.push({
      period: Math.floor(i / stepSize),
      trainStart: trainData[0]?.time || i,
      trainEnd: trainData[trainData.length - 1]?.time || (i + windowSize - 1),
      testStart: testData[0]?.time || (i + windowSize),
      testEnd: testData[testData.length - 1]?.time || (i + windowSize + stepSize - 1),
      trainSharpe,
      testSharpe,
      trainDD: trainResult.maxDrawdown || 0,
      testDD: testResult.maxDrawdown || 0,
      overfitting,
      robust: overfitting < 0.75 && testSharpe > 0
    });
  }

  return results;
}
