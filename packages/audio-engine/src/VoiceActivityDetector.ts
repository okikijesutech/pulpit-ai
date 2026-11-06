/**
 * Voice Activity Detector (VAD) for real-time speech vs silence/ambient noise classification.
 * Evaluates short-time energy (RMS), zero-crossing rate (ZCR), and adaptive background noise floor tracking.
 */

export interface VadFrameResult {
  isSpeech: boolean;
  energy: number;
  zeroCrossingRate: number;
  noiseFloor: number;
  threshold: number;
}

export interface VadOptions {
  sampleRate?: number;
  frameSizeSamples?: number; // e.g. 480 samples = 30ms at 16kHz
  energyThreshold?: number; // Minimum short-time energy for speech
  minZcrPerSecond?: number; // Minimum zero crossings per second (rejects low rumble/DC)
  maxZcrPerSecond?: number; // Maximum zero crossings per second (rejects ultrasonic hiss)
  adaptiveNoiseFloor?: boolean; // PR 8: Dynamic tracking of ambient background noise
  initialNoiseFloor?: number; // Starting noise floor estimate (default 0.002)
  minNoiseFloor?: number; // Lower bound on noise floor (default 0.001)
  maxNoiseFloor?: number; // Upper bound on noise floor (default 0.035)
  snrMarginMultiplier?: number; // Multiplier above noise floor required for speech (default 1.8)
  noiseAdaptRateUp?: number; // Adaptation speed when ambient noise increases (default 0.05)
  noiseAdaptRateDown?: number; // Adaptation speed when ambient noise subsides (default 0.10)
}

export class VoiceActivityDetector {
  private readonly sampleRate: number;
  private readonly frameSize: number;
  private readonly energyThreshold: number;
  private readonly minZcrPerSecond: number;
  private readonly maxZcrPerSecond: number;
  private readonly adaptiveNoiseFloor: boolean;
  private readonly minNoiseFloor: number;
  private readonly maxNoiseFloor: number;
  private readonly snrMarginMultiplier: number;
  private readonly noiseAdaptRateUp: number;
  private readonly noiseAdaptRateDown: number;

  private currentNoiseFloor: number;

  constructor(options: VadOptions = {}) {
    this.sampleRate = options.sampleRate ?? 16000;
    this.frameSize = options.frameSizeSamples ?? 480;
    this.energyThreshold = options.energyThreshold ?? 0.0050; // Sensitive to natural preaching voice while rejecting fan hum
    this.minZcrPerSecond = options.minZcrPerSecond ?? 30; // Reject DC offset & rumble (< 30 Hz)
    this.maxZcrPerSecond = options.maxZcrPerSecond ?? 7800; // Allow full human speech spectrum including sibilants
    this.adaptiveNoiseFloor = options.adaptiveNoiseFloor ?? true;
    this.minNoiseFloor = options.minNoiseFloor ?? 0.001;
    this.maxNoiseFloor = options.maxNoiseFloor ?? 0.035;
    this.currentNoiseFloor = options.initialNoiseFloor ?? 0.002;
    this.snrMarginMultiplier = options.snrMarginMultiplier ?? 1.8;
    this.noiseAdaptRateUp = options.noiseAdaptRateUp ?? 0.05;
    this.noiseAdaptRateDown = options.noiseAdaptRateDown ?? 0.10;
  }

  /**
   * Processes a frame of 16-bit PCM audio samples.
   */
  public processFrame(frame: Int16Array): VadFrameResult {
    const currentThreshold = this.getCurrentThreshold();

    if (frame.length === 0) {
      return {
        isSpeech: false,
        energy: 0,
        zeroCrossingRate: 0,
        noiseFloor: this.currentNoiseFloor,
        threshold: currentThreshold
      };
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

    // Speech criteria: audible energy above dynamic ambient threshold and ZCR within human vocal band
    const isSpeech =
      energy >= currentThreshold &&
      zcrPerSecond >= this.minZcrPerSecond &&
      zcrPerSecond <= this.maxZcrPerSecond;

    // PR 8: Adaptive Noise Floor Update
    if (this.adaptiveNoiseFloor) {
      if (!isSpeech) {
        // Frame is silence or ambient room noise; adapt noise floor towards frame energy
        if (energy < this.currentNoiseFloor) {
          // Noise floor subsiding
          this.currentNoiseFloor =
            (1 - this.noiseAdaptRateDown) * this.currentNoiseFloor + this.noiseAdaptRateDown * energy;
        } else if (energy <= this.maxNoiseFloor) {
          // Ambient noise rising
          this.currentNoiseFloor =
            (1 - this.noiseAdaptRateUp) * this.currentNoiseFloor + this.noiseAdaptRateUp * energy;
        }
      } else {
        // During speech, if energy is exceptionally close to noise floor, make no change or gentle decay
        if (energy < this.currentNoiseFloor) {
          this.currentNoiseFloor =
            (1 - this.noiseAdaptRateDown) * this.currentNoiseFloor + this.noiseAdaptRateDown * energy;
        }
      }

      // Clamp noise floor within configured safety bounds
      this.currentNoiseFloor = Math.max(
        this.minNoiseFloor,
        Math.min(this.maxNoiseFloor, this.currentNoiseFloor)
      );
    }

    return {
      isSpeech,
      energy,
      zeroCrossingRate: zeroCrossings,
      noiseFloor: this.currentNoiseFloor,
      threshold: this.getCurrentThreshold()
    };
  }

  /**
   * Returns the current estimated ambient noise floor.
   */
  public getNoiseFloor(): number {
    return this.currentNoiseFloor;
  }

  /**
   * Returns the effective speech detection energy threshold.
   */
  public getCurrentThreshold(): number {
    if (!this.adaptiveNoiseFloor) {
      return this.energyThreshold;
    }
    return Math.max(this.energyThreshold, this.currentNoiseFloor * this.snrMarginMultiplier);
  }

  /**
   * Resets the noise floor to a baseline value.
   */
  public resetNoiseFloor(initial = 0.002): void {
    this.currentNoiseFloor = Math.max(this.minNoiseFloor, Math.min(this.maxNoiseFloor, initial));
  }

  public getFrameSize(): number {
    return this.frameSize;
  }
}
