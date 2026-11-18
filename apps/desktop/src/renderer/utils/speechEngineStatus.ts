import type { SpeechRoutingPlan } from '@pulpit-ai/speech-engine';

export interface EngineStatusBadgeView {
  tierTag: 'TIER 1' | 'TIER 2';
  tierTone: 'emerald' | 'indigo';
  engineLabel: string;
  verifierLabel: string;
  hasSecondaryVerifier: boolean;
  backendTag: 'Metal' | 'GPU' | 'AVX2' | 'NEON';
  hardwareSummary: string;
  modelSummary: string;
  verificationPolicy: string;
  tooltip: string;
}

function formatBackendTag(
  backend: SpeechRoutingPlan['hardware']['recommendedBackend']
): EngineStatusBadgeView['backendTag'] {
  switch (backend) {
    case 'metal':
      return 'Metal';
    case 'cuda_or_vulkan':
      return 'GPU';
    case 'cpu_neon':
      return 'NEON';
    case 'cpu_avx2':
    default:
      return 'AVX2';
  }
}

export function formatEngineStatusBadge(
  plan: SpeechRoutingPlan | null | undefined,
  fallbackEngineLabel = 'whisper.cpp (AVX2)'
): EngineStatusBadgeView {
  if (!plan) {
    return {
      tierTag: 'TIER 1',
      tierTone: 'emerald',
      engineLabel: fallbackEngineLabel,
      verifierLabel: 'Single-Pass',
      hasSecondaryVerifier: false,
      backendTag: 'AVX2',
      hardwareSummary: 'Detecting local hardware...',
      modelSummary: 'base-q5_1',
      verificationPolicy: 'Local offline inference',
      tooltip: `${fallbackEngineLabel} — Local offline speech recognition`
    };
  }

  const isTier2 = plan.tier === 'tier2_high_spec';
  const backendTag = formatBackendTag(plan.hardware.recommendedBackend);

  let engineLabel: string;
  switch (plan.primaryEngine) {
    case 'sherpa_zipformer_streaming':
      engineLabel = 'Sherpa Streaming';
      break;
    case 'whisper_server_daemon':
      engineLabel = `whisper-server (${backendTag})`;
      break;
    case 'whisper_cli_legacy':
    default:
      engineLabel = `whisper.cpp (${backendTag})`;
      break;
  }

  let verifierLabel: string;
  switch (plan.secondaryVerifier) {
    case 'moonshine_int8':
      verifierLabel = 'Moonshine INT8';
      break;
    case 'whisper_server_daemon':
      verifierLabel = 'Whisper Verifier';
      break;
    case 'none':
    default:
      verifierLabel = 'Single-Pass';
      break;
  }

  const hasSecondaryVerifier = plan.secondaryVerifier !== 'none';
  const hardwareSummary = `${plan.hardware.logicalCores} cores · ${plan.hardware.totalRamGb} GB RAM · ${backendTag}`;
  const modelSummary = `${plan.recommendedWhisperModel} · ${plan.maxWhisperThreads}T cap`;
  const verificationPolicy = hasSecondaryVerifier
    ? plan.verifyAmbiguousCitationsOnly
      ? `${verifierLabel} (ambiguous only)`
      : `${verifierLabel} (all citations)`
    : 'Single-pass primary engine';

  const tooltip = [
    plan.tierLabel,
    `Primary: ${engineLabel}`,
    `Verifier: ${verificationPolicy}`,
    `Model: ${modelSummary}`,
    `Host: ${plan.hardware.cpuModel} (${hardwareSummary})`
  ].join('\n');

  return {
    tierTag: isTier2 ? 'TIER 2' : 'TIER 1',
    tierTone: isTier2 ? 'indigo' : 'emerald',
    engineLabel,
    verifierLabel,
    hasSecondaryVerifier,
    backendTag,
    hardwareSummary,
    modelSummary,
    verificationPolicy,
    tooltip
  };
}
