/**
 * Modular 5-Stage 24/7 AI Trading Machine Engine
 * 
 * Re-exports the Enhanced v94.0 Engine with Real Market Feeds & Indicator Confluence
 */

export * from "./modular-5stage-ai-trading-machine-v94.mjs";
export {
  runStage1ScannerWithRealData as runStage1Scanner,
  runStage2SignalEngineWithIndicators as runStage2SignalEngine,
  runStage3TradePlannerEnhanced as runStage3TradePlanner
} from "./modular-5stage-ai-trading-machine-v94.mjs";

import defaultEngine from "./modular-5stage-ai-trading-machine-v94.mjs";
export default defaultEngine;
