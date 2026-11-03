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
  minZcrPerSecond?: number; // Minimum zero crossings per second (rejects low rumble/DC)
  maxZcrPerSecond?: number; // Maximum zero crossings per second (rejects ultrasonic hiss)
}

export class VoiceActivityDetector {
  private readonly sampleRate: number;
  private readonly frameSize: number;
  private readonly energyThreshold: number;
  private readonly minZcrPerSecond: number;
  private readonly maxZcrPerSecond: number;

  constructor(options: VadOptions = {}) {
    this.sampleRate = options.sampleRate ?? 16000;
    this.frameSize = options.frameSizeSamples ?? 480;
    this.energyThreshold = options.energyThreshold ?? 0.0035; // Sensitive to natural preaching voice
    this.minZcrPerSecond = options.minZcrPerSecond ?? 30; // Reject DC offset & rumble (< 30 Hz)
    this.maxZcrPerSecond = options.maxZcrPerSecond ?? 7800; // Allow full human speech spectrum including sibilants
  }

  /**
   * Processes a frame of 16-bit PCM audio samples.
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
        // Sign change detection
        if ((frame[i] >= 0 && frame[i - 1] < 0) || (frame[i] < 0 && frame[i - 1] >= 0)) {
          zeroCrossings++;
        }
      }
    }

    const energy = Math.sqrt(sumSquares / frame.length);
    // Normalize zero crossings to per-second rate regardless of frame buffer size
    const zcrPerSecond = (zeroCrossings / frame.length) * this.sampleRate;

    // Speech criteria: audible energy above ambient threshold and ZCR within human vocal band
    const isSpeech =
      energy >= this.energyThreshold &&
      zcrPerSecond >= this.minZcrPerSecond &&
      zcrPerSecond <= this.maxZcrPerSecond;

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
