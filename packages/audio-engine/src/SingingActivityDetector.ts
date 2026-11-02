/**
 * Singing and Worship Music Activity Detector.
 *
 * Distinguishes between spoken preaching and sustained singing/worship audio using:
 * - Short-time normalized autocorrelation harmonicity (F0 pitch peak)
 * - Pitch trajectory stability across consecutive vowel frames
 * - Energy continuity and sustained vocal formants
 * - Hysteresis state machine to prevent rapid mode flapping
 */

export type AudioActivityMode = 'silence' | 'speech' | 'singing';

export interface SingingFrameResult {
  mode: AudioActivityMode;
  isSinging: boolean;
  isSpeech: boolean;
  harmonicity: number; // 0.0 - 1.0 (peak normalized autocorrelation)
  estimatedPitchHz: number | null; // Estimated fundamental frequency (80 - 600 Hz)
  pitchStability: number; // 0.0 - 1.0 consistency over recent frames
  confidence: number;
}

export interface SingingDetectorOptions {
  sampleRate?: number; // Default 16000 Hz
  frameSizeSamples?: number; // Default 480 samples (30ms at 16kHz)
  minF0Hz?: number; // Lowest vocal fundamental (default 80 Hz)
  maxF0Hz?: number; // Highest vocal fundamental (default 600 Hz)
  harmonicityThreshold?: number; // Autocorrelation peak required for singing (default 0.60)
  minSustainedFrames?: number; // Consecutive stable frames before entering singing mode (default 6 = 180ms)
  hangoverFrames?: number; // Holdover frames across breath pauses (default 20 = 600ms)
  energySilenceThreshold?: number; // Minimum RMS energy to consider non-silence (default 0.012)
}

export class SingingActivityDetector {
  private readonly sampleRate: number;
  private readonly frameSize: number;
  private readonly minLag: number;
  private readonly maxLag: number;
  private readonly harmonicityThreshold: number;
  private readonly minSustainedFrames: number;
  private readonly hangoverFrames: number;
  private readonly energySilenceThreshold: number;

  private recentPitches: number[] = [];
  private sustainedSingingCount = 0;
  private hangoverRemaining = 0;
  private currentMode: AudioActivityMode = 'silence';

  constructor(options: SingingDetectorOptions = {}) {
    this.sampleRate = options.sampleRate ?? 16000;
    this.frameSize = options.frameSizeSamples ?? 480;
    const minF0 = options.minF0Hz ?? 80;
    const maxF0 = options.maxF0Hz ?? 600;
    this.minLag = Math.max(2, Math.floor(this.sampleRate / maxF0));
    this.maxLag = Math.min(this.frameSize - 2, Math.floor(this.sampleRate / minF0));
    this.harmonicityThreshold = options.harmonicityThreshold ?? 0.60;
    this.minSustainedFrames = options.minSustainedFrames ?? 6;
    this.hangoverFrames = options.hangoverFrames ?? 20;
    this.energySilenceThreshold = options.energySilenceThreshold ?? 0.012;
  }

  /**
   * Resets internal pitch history and state machine.
   */
  public reset(): void {
    this.recentPitches = [];
    this.sustainedSingingCount = 0;
    this.hangoverRemaining = 0;
    this.currentMode = 'silence';
  }

  /**
   * Returns current active acoustic mode.
   */
  public getCurrentMode(): AudioActivityMode {
    return this.currentMode;
  }

  /**
   * Evaluates a 30ms PCM frame (480 samples at 16kHz).
   */
  public processFrame(frame: Int16Array): SingingFrameResult {
    if (frame.length === 0) {
      return {
        mode: 'silence',
        isSinging: false,
        isSpeech: false,
        harmonicity: 0,
        estimatedPitchHz: null,
        pitchStability: 0,
        confidence: 0
      };
    }

    // 1. RMS Energy Calculation
    let sumSquares = 0;
    for (let i = 0; i < frame.length; i++) {
      const norm = frame[i] / 32768.0;
      sumSquares += norm * norm;
    }
    const rms = Math.sqrt(sumSquares / frame.length);

    // If below silence threshold
    if (rms < this.energySilenceThreshold) {
      if (this.hangoverRemaining > 0) {
        this.hangoverRemaining--;
        // Retain singing mode during brief breath pause
        return {
          mode: 'singing',
          isSinging: true,
          isSpeech: false,
          harmonicity: 0.5,
          estimatedPitchHz: this.recentPitches[this.recentPitches.length - 1] ?? null,
          pitchStability: 0.8,
          confidence: 0.7
        };
      }

      this.currentMode = 'silence';
      this.sustainedSingingCount = 0;
      this.recentPitches = [];

      return {
        mode: 'silence',
        isSinging: false,
        isSpeech: false,
        harmonicity: 0,
        estimatedPitchHz: null,
        pitchStability: 0,
        confidence: 0.95
      };
    }

    // 2. Normalized Autocorrelation Peak & Pitch Estimation
    const { harmonicity, pitchHz } = this.estimatePitchAndHarmonicity(frame);

    // 3. Pitch Stability Window (Last 8 frames ~ 240ms)
    let pitchStability = 0;
    if (pitchHz !== null) {
      this.recentPitches.push(pitchHz);
      if (this.recentPitches.length > 8) {
        this.recentPitches.shift();
      }

      pitchStability = this.calculatePitchStability(this.recentPitches);
    } else {
      if (this.recentPitches.length > 0) {
        this.recentPitches.shift();
      }
    }

    // 4. Singing vs Speech Classification with Hysteresis
    const isFrameSingingLike =
      harmonicity >= this.harmonicityThreshold &&
      pitchStability >= 0.70 &&
      pitchHz !== null;

    if (isFrameSingingLike) {
      this.sustainedSingingCount++;
      if (this.sustainedSingingCount >= this.minSustainedFrames) {
        this.currentMode = 'singing';
        this.hangoverRemaining = this.hangoverFrames;
      }
    } else {
      if (this.sustainedSingingCount > 0) {
        this.sustainedSingingCount--;
      }

      if (this.hangoverRemaining > 0) {
        this.hangoverRemaining--;
      } else {
        this.currentMode = 'speech';
      }
    }

    const confidence = this.currentMode === 'singing'
      ? Math.min(0.98, Math.max(0.65, (harmonicity + pitchStability) / 2))
      : 0.85;

    return {
      mode: this.currentMode,
      isSinging: this.currentMode === 'singing',
      isSpeech: this.currentMode === 'speech',
      harmonicity: Math.round(harmonicity * 100) / 100,
      estimatedPitchHz: pitchHz,
      pitchStability: Math.round(pitchStability * 100) / 100,
      confidence: Math.round(confidence * 100) / 100
    };
  }

  /**
   * Fast normalized autocorrelation within vocal lag bounds [minLag, maxLag].
   */
  private estimatePitchAndHarmonicity(frame: Int16Array): {
    harmonicity: number;
    pitchHz: number | null;
  } {
    const N = frame.length;
    let maxR = -1;
    let bestLag = 0;

    // Zero-lag energy E0
    let e0 = 0;
    for (let i = 0; i < N; i++) {
      e0 += frame[i] * frame[i];
    }
    if (e0 === 0) return { harmonicity: 0, pitchHz: null };

    // Search lags in human vocal range
    for (let lag = this.minLag; lag <= this.maxLag; lag++) {
      let cross = 0;
      let eLag = 0;

      for (let n = 0; n < N - lag; n++) {
        cross += frame[n] * frame[n + lag];
        eLag += frame[n + lag] * frame[n + lag];
      }

      if (eLag === 0) continue;

      // Normalized correlation coefficient
      const r = cross / Math.sqrt(e0 * eLag);

      if (r > maxR) {
        maxR = r;
        bestLag = lag;
      }
    }

    if (maxR > 0.35 && bestLag > 0) {
      const pitchHz = Math.round(this.sampleRate / bestLag);
      return { harmonicity: maxR, pitchHz };
    }

    return { harmonicity: Math.max(0, maxR), pitchHz: null };
  }

  /**
   * Evaluates pitch consistency across recent frames (tolerance ±8% of median).
   */
  private calculatePitchStability(pitches: number[]): number {
    if (pitches.length < 3) return 0.5;

    const sorted = [...pitches].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median === 0) return 0;

    let withinRange = 0;
    for (const p of pitches) {
      const diffFraction = Math.abs(p - median) / median;
      if (diffFraction <= 0.08) {
        withinRange++;
      }
    }

    return withinRange / pitches.length;
  }
}
