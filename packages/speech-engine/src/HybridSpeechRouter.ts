import { HardwareProfile, detectHardwareProfile } from './WhisperWorkerProcess.js';

export type HardwareTier = 'tier1_low_spec_cpu' | 'tier2_high_spec';

export type ActiveSpeechEngineKind =
  | 'sherpa_zipformer_streaming'
  | 'whisper_server_daemon'
  | 'whisper_cli_legacy';

export type SecondaryVerifierKind =
  | 'moonshine_int8'
  | 'whisper_server_daemon'
  | 'none';

export interface EngineCapabilities {
  sherpaStreamingAvailable: boolean;
  whisperServerAvailable: boolean;
  whisperCliAvailable: boolean;
  moonshineAvailable?: boolean;
}

export interface SpeechRoutingPlan {
  tier: HardwareTier;
  tierLabel: string;
  primaryEngine: ActiveSpeechEngineKind;
  secondaryVerifier: SecondaryVerifierKind;
  recommendedWhisperModel: 'base-q5_1' | 'small-q5_1';
  maxWhisperThreads: number;
  verifyAmbiguousCitationsOnly: boolean;
  hardware: HardwareProfile;
}

/**
 * Classifies host hardware into Tier 1 (low-spec sanctuary CPU like Intel i5-6300U)
 * or Tier 2 (Apple Silicon Metal, discrete GPU, or >= 8 logical cores with >= 12 GB RAM).
 */
export function selectHardwareTier(profile: HardwareProfile): HardwareTier {
  if (profile.recommendedBackend === 'metal' || profile.recommendedBackend === 'cuda_or_vulkan') {
    return 'tier2_high_spec';
  }
  if (profile.logicalCores >= 8 && profile.totalRamGb >= 12) {
    return 'tier2_high_spec';
  }
  return 'tier1_low_spec_cpu';
}

/**
 * Resolves the optimal live primary engine, secondary semantic verifier, model size,
 * and CPU thread cap based on host hardware and installed local binaries/models.
 */
export function resolveSpeechRoutingPlan(
  profile: HardwareProfile = detectHardwareProfile(),
  capabilities: EngineCapabilities = {
    sherpaStreamingAvailable: false,
    whisperServerAvailable: true,
    whisperCliAvailable: true,
    moonshineAvailable: false
  }
): SpeechRoutingPlan {
  const tier = selectHardwareTier(profile);

  // Determine Primary Engine
  let primaryEngine: ActiveSpeechEngineKind;
  if (capabilities.sherpaStreamingAvailable) {
    primaryEngine = 'sherpa_zipformer_streaming';
  } else if (capabilities.whisperServerAvailable) {
    primaryEngine = 'whisper_server_daemon';
  } else {
    primaryEngine = 'whisper_cli_legacy';
  }

  // Determine Secondary Semantic Verifier for contested / low-confidence citations
  let secondaryVerifier: SecondaryVerifierKind = 'none';
  if (capabilities.moonshineAvailable) {
    secondaryVerifier = 'moonshine_int8';
  } else if (
    primaryEngine === 'sherpa_zipformer_streaming' &&
    capabilities.whisperServerAvailable
  ) {
    secondaryVerifier = 'whisper_server_daemon';
  }

  const isTier2 = tier === 'tier2_high_spec';

  return {
    tier,
    tierLabel: isTier2
      ? 'Tier 2 (High-Spec / Metal / GPU)'
      : 'Tier 1 (Low-Spec Sanctuary CPU)',
    primaryEngine,
    secondaryVerifier,
    recommendedWhisperModel: isTier2 ? 'small-q5_1' : 'base-q5_1',
    maxWhisperThreads: profile.optimalWhisperThreads,
    // Tier 1 only triggers secondary verification on ambiguous / low-confidence citations to guard CPU
    verifyAmbiguousCitationsOnly: !isTier2,
    hardware: profile
  };
}
