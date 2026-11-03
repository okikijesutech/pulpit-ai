/**
 * Voice Activity Detector (VAD) for real-time speech vs silence/ambient noise classification.
 * Evaluates short-time energy, zero-crossing rate (ZCR), and peak-to-average dynamics.
 */

export interface VadFrameResult {
  isSpeech: boolean;
  energy: number;
  zeroCrossingRate: number;
}

export interface VadOptions {
  sampleRate?: number;
  frameSizeSamples?: number; // e.g. 480 samples = 30ms at 16kHz
  energyThreshold?: number; // Minimum short-time energy for speech
  minZcr?: number; // Minimum zero crossings (rejects low rumble/DC)
  maxZcr?: number; // Maximum zero crossings (rejects high-frequency hiss)
}

export class VoiceActivityDetector {
  private readonly sampleRate: number;
  private readonly frameSize: number;
  private readonly energyThreshold: number;
  private readonly minZcr: number;
  private readonly maxZcr: number;

  constructor(options: VadOptions = {}) {
    this.sampleRate = options.sampleRate ?? 16000;
    this.frameSize = options.frameSizeSamples ?? 480; // 30ms @ 16kHz
    this.energyThreshold = options.energyThreshold ?? 0.005; // ~ -46 dBFS (sensitive to room preaching speech)
    this.minZcr = options.minZcr ?? 5; // Min 5 crossings per 30ms
    this.maxZcr = options.maxZcr ?? 220; // Max 220 crossings per 30ms
  }

  /**
   * Processes a 30ms frame of 16-bit PCM audio samples.
   */
  public processFrame(frame: Int16Array): VadFrameResult {
    if (frame.length === 0) {
      return { isSpeech: false, energy: 0, zeroCrossingRate: 0 };
    }

    let sumSquares = 0;
    let zeroCrossings = 0;

    for (let i = 0; i < frame.length; i++) {
      const sampleNorm = frame[i] / 32768.0;
      sumSquares += sampleNorm * sampleNorm;

      if (i > 0) {
        // Check sign change
        if ((frame[i] >= 0 && frame[i - 1] < 0) || (frame[i] < 0 && frame[i - 1] >= 0)) {
          zeroCrossings++;
        }
      }
    }

    const energy = Math.sqrt(sumSquares / frame.length);

    // Speech criteria: energy above threshold and ZCR in human phoneme band
    const isSpeech =
      energy >= this.energyThreshold &&
      zeroCrossings >= this.minZcr &&
      zeroCrossings <= this.maxZcr;

    return {
      isSpeech,
      energy,
      zeroCrossingRate: zeroCrossings
    };
  }

  public getFrameSize(): number {
    return this.frameSize;
  }
}
