import test from "node:test";
import assert from "node:assert/strict";
import { getHftDarkPoolAggregatorStatus, scanCrossVenueArbitrageSpreads, ingestDarkPoolBlockPrints, executePrivateMevArbitrage } from "../src/hft-cross-venue-darkpool-aggregator.mjs";
import { getAutoMlRetrainingStatus, runDailyAutoMlRetrainingCycle, evaluatePboFalsificationGate } from "../src/automl-retraining-pbo-falsifier.mjs";
import { getWeb3RwaVaultStatus, harvestTokenizedRwaTreasuryYield, executeZkCrossChainAtomicSwap } from "../src/web3-rwa-treasury-zk-swaps.mjs";
import { getCanvasVoiceMatrixStatus, render60FpsCanvasFrame, processNaturalVoiceCommand } from "../src/canvas-voice-telemetry-matrix.mjs";

test("getHftDarkPoolAggregatorStatus and scanCrossVenueArbitrageSpreads scans cross-venue HFT spreads & dark pool prints", () => {
  const status = getHftDarkPoolAggregatorStatus();
  assert.equal(status.aggregatorStatus, "HFT_CROSS_VENUE_DARKPOOL_AGGREGATOR_ONLINE");

  const spread = scanCrossVenueArbitrageSpreads({ symbol: "AAPL" });
  assert.equal(spread.symbol, "AAPL");
  assert.equal(typeof spread.spreadBps, "number");

  const print = ingestDarkPoolBlockPrints({ symbol: "AAPL" });
  assert.equal(print.ingestStatus, "DARK_POOL_BLOCK_PRINT_INGESTED");
  assert.equal(print.whaleAccumulationBias, "BULLISH_INSTITUTIONAL_ACCUMULATION");
});

test("getAutoMlRetrainingStatus and evaluatePboFalsificationGate enforces AutoML retraining & PBO gate", () => {
  const status = getAutoMlRetrainingStatus();
  assert.equal(status.autoMlStatus, "AUTOML_RETRAINING_ENGINE_ONLINE");

  const cycle = runDailyAutoMlRetrainingCycle({ datasetDays: 180 });
  assert.equal(cycle.cycleStatus, "AUTOML_RETRAINING_CYCLE_COMPLETED_SUCCESS");
  assert.equal(cycle.trainedModelsCount, 4);

  const gatePass = evaluatePboFalsificationGate({ modelId: "XGBOOST_ENSEMBLE", pboValue: 0.035, dsrValue: 3.54 });
  assert.equal(gatePass.gateVerdict, "PROMOTED_TO_PRODUCTION");

  const gateFail = evaluatePboFalsificationGate({ modelId: "OVERFITTED_MODEL", pboValue: 0.12, dsrValue: 2.1 });
  assert.equal(gateFail.gateVerdict, "REJECTED_OVERFITTING_RISK");
});

test("getWeb3RwaVaultStatus and harvestTokenizedRwaTreasuryYield manages RWA treasury & ZK cross-chain swaps", () => {
  const status = getWeb3RwaVaultStatus();
  assert.equal(status.vaultStatus, "WEB3_RWA_TREASURY_VAULT_ACTIVE");
  assert.equal(status.blendedRwaApy, "5.10% APY");

  const harvest = harvestTokenizedRwaTreasuryYield();
  assert.equal(harvest.harvestStatus, "TOKENIZED_RWA_YIELD_HARVESTED_SUCCESSFULLY");

  const swap = executeZkCrossChainAtomicSwap({ fromChain: "TON", toChain: "SOLANA", tokenAmount: 100 });
  assert.equal(swap.swapStatus, "ZK_CROSS_CHAIN_ATOMIC_SWAP_EXECUTED");
  assert.equal(swap.fromChain, "TON");
  assert.equal(swap.toChain, "SOLANA");
});

test("getCanvasVoiceMatrixStatus and processNaturalVoiceCommand handles 60 FPS visual canvas & voice commands", () => {
  const status = getCanvasVoiceMatrixStatus();
  assert.equal(status.matrixStatus, "CANVAS_VOICE_TELEMETRY_MATRIX_ONLINE");
  assert.equal(status.canvasFps, 60.0);

  const frame = render60FpsCanvasFrame({ symbol: "AAPL" });
  assert.equal(frame.frameStatus, "CANVAS_FRAME_RENDERED");

  const voice = processNaturalVoiceCommand({ voiceQuery: "What is our current risk exposure on AAPL?" });
  assert.equal(voice.voiceStatus, "VOICE_QUERY_PARSED_AND_EXECUTED");
  assert.equal(voice.actionIntent, "QUERY_PORTFOLIO_RISK_VAR");
});
