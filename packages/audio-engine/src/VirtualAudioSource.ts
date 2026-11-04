/**
 * Virtual Audio Source for testing, continuous integration, and test fixtures.
 * Generates synthetic PCM frames (sine waves, speech-like envelopes, silence, clipping).
 */

export class VirtualAudioSource {
  private readonly sampleRate: number;

  constructor(sampleRate = 16000) {
    this.sampleRate = sampleRate;
  }

  /**
   * Generates pure silence (0 amplitude).
   */
  public generateSilence(durationSeconds: number): Int16Array {
    const samples = Math.floor(this.sampleRate * durationSeconds);
    return new Int16Array(samples);
  }

  /**
   * Generates a pure sine tone at a specified frequency and amplitude.
   */
  public generateTone(
    durationSeconds: number,
    frequencyHz = 440,
    amplitude = 0.5
  ): Int16Array {
    const count = Math.floor(this.sampleRate * durationSeconds);
    const result = new Int16Array(count);
    const maxInt16 = 32767;

    for (let i = 0; i < count; i++) {
      const t = i / this.sampleRate;
      const val = Math.sin(2 * Math.PI * frequencyHz * t) * amplitude;
      result[i] = Math.round(val * maxInt16);
    }

    return result;
  }

  /**
   * Generates a clipped signal (amplitude exceeding 1.0).
   */
  public generateClippedSignal(durationSeconds: number): Int16Array {
    const count = Math.floor(this.sampleRate * durationSeconds);
    const result = new Int16Array(count);

    for (let i = 0; i < count; i++) {
      // Force extreme saturation
      result[i] = i % 2 === 0 ? 32767 : -32768;
    }

    return result;
  }

  /**
   * Generates a speech-like modulated harmonic waveform.
   */
  public generateSyntheticSpeechFrame(durationSeconds: number): Int16Array {
    const count = Math.floor(this.sampleRate * durationSeconds);
    const result = new Int16Array(count);
    const maxInt16 = 32767;

    for (let i = 0; i < count; i++) {
      const t = i / this.sampleRate;
      // Speech formant simulation (fundamental ~150Hz + harmonics with envelope)
      const envelope = 0.4 + 0.3 * Math.sin(2 * Math.PI * 3 * t); // 3Hz syllable rhythm
      const fundamental = Math.sin(2 * Math.PI * 150 * t);
      const formant1 = 0.5 * Math.sin(2 * Math.PI * 700 * t);
      const formant2 = 0.25 * Math.sin(2 * Math.PI * 1800 * t);

      const sample = (fundamental + formant1 + formant2) * 0.4 * envelope;
      result[i] = Math.round(Math.max(-1, Math.min(1, sample)) * maxInt16);
    }

    return result;
  }

  /**
   * Generates white/ambient noise with controlled amplitude.
   */
  public generateNoise(durationSeconds: number, amplitude = 0.01): Int16Array {
    const count = Math.floor(this.sampleRate * durationSeconds);
    const result = new Int16Array(count);
    const maxInt16 = 32767;

    for (let i = 0; i < count; i++) {
      const sample = (Math.random() * 2 - 1) * amplitude;
      result[i] = Math.round(sample * maxInt16);
    }

    return result;
  }
}
