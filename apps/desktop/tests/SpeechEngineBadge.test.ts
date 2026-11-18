import { describe, it, expect } from 'vitest';
import { resolveSpeechRoutingPlan, HardwareProfile } from '@pulpit-ai/speech-engine';
import { formatEngineStatusBadge } from '../src/renderer/utils/speechEngineStatus.js';

const TIER1_CPU: HardwareProfile = {
  platform: 'win32',
  arch: 'x64',
  cpuModel: 'Intel(R) Core(TM) i5-6300U CPU @ 2.40GHz',
  logicalCores: 4,
  optimalWhisperThreads: 2,
  totalRamGb: 7.9,
  freeRamGb: 3.8,
  recommendedBackend: 'cpu_avx2'
};

const TIER2_METAL: HardwareProfile = {
  platform: 'darwin',
  arch: 'arm64',
  cpuModel: 'Apple M3 Pro',
  logicalCores: 12,
  optimalWhisperThreads: 8,
  totalRamGb: 18,
  freeRamGb: 10.2,
  recommendedBackend: 'metal'
};

describe('Live Hardware Tier & Active Speech Engine UI Badge', () => {
  it('falls back safely to Tier 1 whisper.cpp (AVX2) before routing status arrives', () => {
    const view = formatEngineStatusBadge(null);
    expect(view.tierTag).toBe('TIER 1');
    expect(view.tierTone).toBe('emerald');
    expect(view.engineLabel).toBe('whisper.cpp (AVX2)');
    expect(view.hasSecondaryVerifier).toBe(false);
    expect(view.verifierLabel).toBe('Single-Pass');
  });

  it('formats Tier 1 persistent whisper-server daemon badge with thread & model cap', () => {
    const plan = resolveSpeechRoutingPlan(TIER1_CPU, {
      sherpaStreamingAvailable: false,
      whisperServerAvailable: true,
      whisperCliAvailable: true
    });
    const view = formatEngineStatusBadge(plan);

    expect(view.tierTag).toBe('TIER 1');
    expect(view.tierTone).toBe('emerald');
    expect(view.engineLabel).toBe('whisper-server (AVX2)');
    expect(view.hasSecondaryVerifier).toBe(false);
    expect(view.modelSummary).toBe('base-q5_1 · 2T cap');
    expect(view.hardwareSummary).toContain('4 cores');
    expect(view.hardwareSummary).toContain('7.9 GB RAM');
    expect(view.tooltip).toContain('Intel(R) Core(TM) i5-6300U');
  });

  it('formats Tier 1 Sherpa Streaming + Whisper Verifier (ambiguous only)', () => {
    const plan = resolveSpeechRoutingPlan(TIER1_CPU, {
      sherpaStreamingAvailable: true,
      whisperServerAvailable: true,
      whisperCliAvailable: true
    });
    const view = formatEngineStatusBadge(plan);

    expect(view.tierTag).toBe('TIER 1');
    expect(view.engineLabel).toBe('Sherpa Streaming');
    expect(view.hasSecondaryVerifier).toBe(true);
    expect(view.verifierLabel).toBe('Whisper Verifier');
    expect(view.verificationPolicy).toBe('Whisper Verifier (ambiguous only)');
  });

  it('formats Tier 2 Apple Silicon Metal + Sherpa Streaming + Moonshine INT8', () => {
    const plan = resolveSpeechRoutingPlan(TIER2_METAL, {
      sherpaStreamingAvailable: true,
      whisperServerAvailable: true,
      whisperCliAvailable: true,
      moonshineAvailable: true
    });
    const view = formatEngineStatusBadge(plan);

    expect(view.tierTag).toBe('TIER 2');
    expect(view.tierTone).toBe('indigo');
    expect(view.backendTag).toBe('Metal');
    expect(view.engineLabel).toBe('Sherpa Streaming');
    expect(view.hasSecondaryVerifier).toBe(true);
    expect(view.verifierLabel).toBe('Moonshine INT8');
    expect(view.verificationPolicy).toBe('Moonshine INT8 (all citations)');
    expect(view.modelSummary).toBe('small-q5_1 · 8T cap');
  });
});
