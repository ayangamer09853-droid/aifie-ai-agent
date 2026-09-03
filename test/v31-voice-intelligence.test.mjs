import test from "node:test";
import assert from "node:assert/strict";
import { getVoiceEngineStatus, processVoiceQuery, synthesizeVoiceResponse } from "../src/voice-intelligence-speech-engine.mjs";

test("getVoiceEngineStatus reports STT and TTS neural engine status", () => {
  const status = getVoiceEngineStatus();
  assert.equal(status.voiceEngineStatus, "VOICE_INTELLIGENCE_ENGINE_ONLINE");
  assert.equal(status.speechToTextSTT, "WHISPER_NEURAL_STT_ACTIVE");
  assert.equal(status.textToSpeechTTS, "NEURAL_VOICE_SYNTHESIS_ACTIVE");
  assert.ok(status.supportedVoicePrompts.length >= 4);
});

test("processVoiceQuery parses spoken profit query and returns text response", () => {
  const res = processVoiceQuery("Aifie, how much profit did we make today?");
  assert.equal(res.recognizedIntent, "QUERY_PROFIT_AND_BALANCE");
  assert.ok(res.textResponse.includes("$12,485.50"));
  assert.equal(res.synthesizedAudioResponse.audioFormat, "AUDIO_MP3_WAV_NEURAL_VOICE");
});

test("processVoiceQuery parses spoken flash loan query correctly", () => {
  const res = processVoiceQuery("Aifie, status of flash loan arbitrage");
  assert.equal(res.recognizedIntent, "QUERY_FLASH_LOAN_ARBITRAGE");
  assert.ok(res.textResponse.includes("flash loans"));
});

test("synthesizeVoiceResponse converts text message to neural voice specs", () => {
  const tts = synthesizeVoiceResponse("Account balance is optimal");
  assert.equal(tts.status, "TTS_AUDIO_SYNTHESIS_SUCCESS");
  assert.equal(tts.synthesizedText, "Account balance is optimal");
});
