import { describe, it, expect, vi } from 'vitest';
import {
  selectHardwareTier,
  resolveSpeechRoutingPlan,
  DualEngineVerifier,
  HardwareProfile,
  SecondaryVerifierBackend
} from '@pulpit-ai/speech-engine';
import { ScriptureReferenceParser } from '@pulpit-ai/scripture-engine';

function extractCanonKey(text: string): string | null {
  const parsed = ScriptureReferenceParser.parse(text);
  if (!parsed.hasReference || !parsed.isCanonValid || !parsed.reference) {
    return null;
  }
  const ref = parsed.reference;
  return `${ref.book} ${ref.chapter}:${ref.verseStart}${ref.verseEnd ? `-${ref.verseEnd}` : ''}`;
}

const TIER1_SANCTUARY_PC: HardwareProfile = {
  platform: 'win32',
  arch: 'x64',
  cpuModel: 'Intel(R) Core(TM) i5-6300U CPU @ 2.40GHz',
  logicalCores: 4,
  optimalWhisperThreads: 2,
  totalRamGb: 7.9,
  freeRamGb: 3.4,
  recommendedBackend: 'cpu_avx2'
};

const TIER2_APPLE_SILICON: HardwareProfile = {
  platform: 'darwin',
  arch: 'arm64',
  cpuModel: 'Apple M3 Pro',
  logicalCores: 12,
  optimalWhisperThreads: 8,
  totalRamGb: 18,
  freeRamGb: 9.5,
  recommendedBackend: 'metal'
};

const TIER2_WORKSTATION_CPU: HardwareProfile = {
  platform: 'linux',
  arch: 'x64',
  cpuModel: 'AMD Ryzen 7 5800X',
  logicalCores: 16,
  optimalWhisperThreads: 8,
  totalRamGb: 32,
  freeRamGb: 20,
  recommendedBackend: 'cpu_avx2'
};

const TIER2_GPU_RIG: HardwareProfile = {
  platform: 'win32',
  arch: 'x64',
  cpuModel: 'Intel Core i5-12400F',
  logicalCores: 6,
  optimalWhisperThreads: 4,
  totalRamGb: 8,
  freeRamGb: 4,
  recommendedBackend: 'cuda_or_vulkan'
};

describe('Phase 3: Automatic Hardware Tiering (HybridSpeechRouter)', () => {
  it('classifies low-spec 4-core / 8 GB sanctuary PC as Tier 1', () => {
    expect(selectHardwareTier(TIER1_SANCTUARY_PC)).toBe('tier1_low_spec_cpu');

    const plan = resolveSpeechRoutingPlan(TIER1_SANCTUARY_PC, {
      sherpaStreamingAvailable: true,
      whisperServerAvailable: true,
      whisperCliAvailable: true
    });

    expect(plan.tier).toBe('tier1_low_spec_cpu');
    expect(plan.primaryEngine).toBe('sherpa_zipformer_streaming');
    expect(plan.secondaryVerifier).toBe('whisper_server_daemon');
    expect(plan.recommendedWhisperModel).toBe('base-q5_1');
    expect(plan.maxWhisperThreads).toBe(2);
    expect(plan.verifyAmbiguousCitationsOnly).toBe(true);
  });

  it('classifies Apple Silicon Metal, 16-core/32GB workstation, and GPU rigs as Tier 2', () => {
    expect(selectHardwareTier(TIER2_APPLE_SILICON)).toBe('tier2_high_spec');
    expect(selectHardwareTier(TIER2_WORKSTATION_CPU)).toBe('tier2_high_spec');
    expect(selectHardwareTier(TIER2_GPU_RIG)).toBe('tier2_high_spec');

    const macPlan = resolveSpeechRoutingPlan(TIER2_APPLE_SILICON, {
      sherpaStreamingAvailable: true,
      whisperServerAvailable: true,
      whisperCliAvailable: true,
      moonshineAvailable: true
    });

    expect(macPlan.tier).toBe('tier2_high_spec');
    expect(macPlan.primaryEngine).toBe('sherpa_zipformer_streaming');
    expect(macPlan.secondaryVerifier).toBe('moonshine_int8');
    expect(macPlan.recommendedWhisperModel).toBe('small-q5_1');
    expect(macPlan.maxWhisperThreads).toBe(8);
    expect(macPlan.verifyAmbiguousCitationsOnly).toBe(false);
  });

  it('gracefully falls back from Sherpa -> whisper-server -> legacy whisper-cli', () => {
    const serverOnlyPlan = resolveSpeechRoutingPlan(TIER1_SANCTUARY_PC, {
      sherpaStreamingAvailable: false,
      whisperServerAvailable: true,
      whisperCliAvailable: true
    });
    expect(serverOnlyPlan.primaryEngine).toBe('whisper_server_daemon');
    expect(serverOnlyPlan.secondaryVerifier).toBe('none');

    const cliOnlyPlan = resolveSpeechRoutingPlan(TIER1_SANCTUARY_PC, {
      sherpaStreamingAvailable: false,
      whisperServerAvailable: false,
      whisperCliAvailable: true
    });
    expect(cliOnlyPlan.primaryEngine).toBe('whisper_cli_legacy');
    expect(cliOnlyPlan.secondaryVerifier).toBe('none');
  });
});

describe('Phase 3: DualEngineVerifier Rolling Ring Buffer & Fail-Closed Consensus', () => {
  it('preserves exact chronological PCM order across rolling ring wraparound', () => {
    // 2 seconds at 10 Hz = 20 samples capacity (easy to inspect deterministically)
    const verifier = new DualEngineVerifier(undefined, {
      sampleRate: 10,
      rollingSeconds: 2
    });

    // Push 15 samples: [1..15]
    const chunk1 = Int16Array.from({ length: 15 }, (_, i) => i + 1);
    verifier.pushPcmFrame(chunk1);

    // Push 10 more samples: [16..25] -> wraps ring buffer (capacity 20 holds [6..25])
    const chunk2 = Int16Array.from({ length: 10 }, (_, i) => i + 16);
    verifier.pushPcmFrame(chunk2);

    // Request last 1 second = 10 samples -> should be [16..25]
    const last1s = verifier.snapshotRecentAudio(1);
    expect(Array.from(last1s)).toEqual([16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);

    // Request full 2 seconds = 20 samples -> should be [6..25]
    const last2s = verifier.snapshotRecentAudio(2);
    expect(Array.from(last2s)).toEqual([
      6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25
    ]);

    verifier.resetBuffer();
    expect(verifier.snapshotRecentAudio(1).length).toBe(0);
  });

  it('skips secondary verification on clear high-confidence citations in Tier 1 mode', async () => {
    const transcribeSpy = vi.fn(async () => ({ text: 'John 3:16', confidence: 0.95 }));
    const backend: SecondaryVerifierBackend = {
      name: 'whisper_server_daemon',
      transcribeSlice: transcribeSpy
    };
    const verifier = new DualEngineVerifier(backend, {
      sampleRate: 16000,
      extractReferenceKey: extractCanonKey
    });
    verifier.pushPcmFrame(new Int16Array(16000));

    const result = await verifier.verifyCandidate(
      {
        transcript: 'Turn your Bibles to John chapter 3 verse 16',
        canonicalReference: 'John 3:16',
        confidence: 0.94,
        needsReview: false
      },
      true
    );

    expect(result.outcome).toBe('skipped');
    expect(transcribeSpy).not.toHaveBeenCalled();
    expect(result.needsReview).toBe(false);
  });

  it('confirms ambiguous citation when both engines agree on canonical reference', async () => {
    const backend: SecondaryVerifierBackend = {
      name: 'whisper_server_daemon',
      transcribeSlice: async () => ({
        text: 'Open to Habakkuk chapter 2 verse 3',
        confidence: 0.84
      })
    };
    const verifier = new DualEngineVerifier(backend, {
      sampleRate: 16000,
      extractReferenceKey: extractCanonKey
    });
    verifier.pushPcmFrame(new Int16Array(16000));

    const result = await verifier.verifyCandidate(
      {
        transcript: 'Habakkuk 2 verse 3',
        canonicalReference: 'Habakkuk 2:3',
        confidence: 0.72,
        needsReview: true
      },
      true
    );

    expect(result.outcome).toBe('confirmed');
    expect(result.needsReview).toBe(false);
    expect(result.adjustedConfidence).toBeGreaterThan(0.84);
    expect(result.verifierName).toBe('whisper_server_daemon');
  });

  it('upgrades a garbled primary transcript when secondary verifier rescues a valid reference', async () => {
    const backend: SecondaryVerifierBackend = {
      name: 'moonshine_int8',
      transcribeSlice: async () => ({
        text: 'Let us read Deuteronomy chapter 28 verse 1',
        confidence: 0.91
      })
    };
    const verifier = new DualEngineVerifier(backend, {
      sampleRate: 16000,
      extractReferenceKey: extractCanonKey
    });
    verifier.pushPcmFrame(new Int16Array(16000));

    const result = await verifier.verifyCandidate(
      {
        transcript: 'Let us read due to run oh me twenty eight one',
        confidence: 0.52,
        needsReview: true,
        isFuzzyMatch: true
      },
      true
    );

    expect(result.outcome).toBe('upgraded');
    expect(result.finalTranscript).toBe('Let us read Deuteronomy chapter 28 verse 1');
    expect(result.needsReview).toBe(false);
    expect(result.adjustedConfidence).toBe(0.91);
  });

  it('fails closed (contested + needsReview=true) when primary and secondary disagree', async () => {
    const backend: SecondaryVerifierBackend = {
      name: 'whisper_server_daemon',
      transcribeSlice: async () => ({
        text: 'Turn to Romans chapter 8 verse 28',
        confidence: 0.88
      })
    };
    const verifier = new DualEngineVerifier(backend, {
      sampleRate: 16000,
      extractReferenceKey: extractCanonKey
    });
    verifier.pushPcmFrame(new Int16Array(16000));

    const result = await verifier.verifyCandidate(
      {
        transcript: 'Turn to Romans chapter 8 verse 18',
        canonicalReference: 'Romans 8:18',
        confidence: 0.71,
        needsReview: true
      },
      true
    );

    expect(result.outcome).toBe('contested');
    expect(result.needsReview).toBe(true);
    expect(result.adjustedConfidence).toBeLessThanOrEqual(0.65);
    expect(result.finalTranscript).toBe('Turn to Romans chapter 8 verse 18');
    expect(result.secondaryTranscript).toBe('Turn to Romans chapter 8 verse 28');
  });

  it('enforces bounded timeout and concurrency lock without blocking live captions', async () => {
    let releaseFirst!: () => void;
    const firstPromise = new Promise<{ text: string; confidence: number }>((resolve) => {
      releaseFirst = () => resolve({ text: 'John 3:16', confidence: 0.9 });
    });

    const slowBackend: SecondaryVerifierBackend = {
      name: 'slow_verifier',
      transcribeSlice: () => firstPromise
    };
    const verifier = new DualEngineVerifier(slowBackend, {
      sampleRate: 16000,
      timeoutMs: 80,
      extractReferenceKey: extractCanonKey
    });
    verifier.pushPcmFrame(new Int16Array(16000));

    // Launch first verification (will hang until timeout)
    const pendingFirst = verifier.verifyCandidate(
      { transcript: 'John 3:16', canonicalReference: 'John 3:16', confidence: 0.6, needsReview: true },
      true
    );

    // Immediately launch second verification while first is in-flight -> must skip (concurrency lock)
    const concurrentSecond = await verifier.verifyCandidate(
      { transcript: 'Psalm 23:1', canonicalReference: 'Psalms 23:1', confidence: 0.6, needsReview: true },
      true
    );
    expect(concurrentSecond.outcome).toBe('skipped');

    // First verification must cleanly time out and fail closed
    const firstResult = await pendingFirst;
    expect(firstResult.outcome).toBe('failed');
    expect(firstResult.needsReview).toBe(true);

    releaseFirst();
  });
});
