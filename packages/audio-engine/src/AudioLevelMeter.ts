/**
 * Real-time Audio Level Meter and Dynamics Monitor.
 * Computes RMS signal level, peak amplitude, silence detection, and digital clipping.
 */

export interface AudioLevelMetrics {
  rmsLevel: number; // 0.0 (silence) to 1.0 (full scale)
  decibels: number; // -Infinity to 0 dBFS
  isClipping: boolean;
  isSilent: boolean;
}

export class AudioLevelMeter {
  private readonly silenceThresholdRms: number;
  private readonly clippingThreshold: number;

  /**
   * @param silenceThresholdRms Minimum RMS level below which audio is considered silence (default ~0.005, approx -46 dBFS).
   * @param clippingThreshold Sample amplitude above which clipping is flagged (default 32700 for 16-bit signed PCM).
   */
  constructor(silenceThresholdRms = 0.005, clippingThreshold = 32700) {
    this.silenceThresholdRms = silenceThresholdRms;
    this.clippingThreshold = clippingThreshold;
  }

  /**
   * Analyzes a frame of 16-bit signed PCM samples.
   */
  public analyze(samples: Int16Array): AudioLevelMetrics {
    if (samples.length === 0) {
      return {
        rmsLevel: 0,
        decibels: -Infinity,
        isClipping: false,
        isSilent: true
      };
    }

    let sumSquares = 0;
    let hasClipping = false;

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      const absSample = Math.abs(sample);

      if (absSample >= this.clippingThreshold) {
        hasClipping = true;
      }

      // Normalize sample to -1.0 .. 1.0
      const norm = sample / 32768.0;
      sumSquares += norm * norm;
    }

    const rms = Math.sqrt(sumSquares / samples.length);
    // Clamp rms to 0.0 .. 1.0
    const clampedRms = Math.min(1.0, Math.max(0.0, rms));

    // Calculate dBFS (20 * log10(rms))
    const dbfs = clampedRms > 0.00001 ? 20 * Math.log10(clampedRms) : -100;

    const isSilent = clampedRms < this.silenceThresholdRms;

    return {
      rmsLevel: clampedRms,
      decibels: Math.max(-100, Math.round(dbfs * 10) / 10),
      isClipping: hasClipping,
      isSilent
    };
  }
}
