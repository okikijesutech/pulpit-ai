import { VoiceActivityDetector, VadOptions } from './VoiceActivityDetector.js';
import { AudioRingBuffer } from './AudioRingBuffer.js';

export interface SpeechSegment {
  id: string;
  samples: Int16Array;
  durationSeconds: number;
  sourceId: string;
  timestamp: number;
}

export type SegmentListener = (segment: SpeechSegment) => void;

export interface SpeechSegmenterOptions {
  sampleRate?: number;
  minSegmentSeconds?: number; // Minimum length of speech to emit (default 0.5s)
  maxSegmentSeconds?: number; // Maximum length before forced segment cut (default 6.0s)
  silenceHangoverFrames?: number; // Number of silent frames required to cut a phrase (e.g. 15 frames * 30ms = 450ms)
  preRollMs?: number; // Duration of pre-roll buffer in ms (default 250ms, 200-300ms)
  trailingOverlapMs?: number; // Duration of trailing overlap in ms when requested (default 1500ms)
  adaptiveNoiseFloor?: boolean; // Dynamic ambient noise tracking (default: true)
  minSegmentRms?: number; // Minimum RMS energy to emit a segment (default 0.005)
}

export class SpeechSegmenter {
  private vad: VoiceActivityDetector;
  private readonly sampleRate: number;
  private readonly minSamples: number;
  private readonly maxSamples: number;
  private readonly baseHangoverFrames: number;
  private readonly preRollCapacitySamples: number;
  private readonly defaultOverlapSamples: number;
  private readonly minSegmentRms: number;

  private preRollBuffer: AudioRingBuffer;
  private accumulatedFrames: Int16Array[] = [];
  private accumulatedSampleCount = 0;
  private consecutiveSilenceFrames = 0;
  private isSpeaking = false;
  private isSingingActive = false;
  private extraHangoverFrames = 0;

  private trailingOverlapSamples: Int16Array | null = null;
  private pendingOverlap = false;

  private currentSourceId = 'default_source';
  private listeners: Set<SegmentListener> = new Set();

  constructor(options: SpeechSegmenterOptions = {}) {
    this.sampleRate = options.sampleRate ?? 16000;
    this.minSamples = Math.floor((options.minSegmentSeconds ?? 0.5) * this.sampleRate);
    this.maxSamples = Math.floor((options.maxSegmentSeconds ?? 6.0) * this.sampleRate);
    this.baseHangoverFrames = options.silenceHangoverFrames ?? 15; // 15 frames * 30ms = 450ms
    this.minSegmentRms = options.minSegmentRms ?? 0.0020;

    // PR 8: Pre-roll AudioRingBuffer (default 250ms = 4,000 samples at 16kHz)
    const preRollMs = Math.max(200, Math.min(300, options.preRollMs ?? 250));
    this.preRollCapacitySamples = Math.floor((preRollMs / 1000) * this.sampleRate);
    this.preRollBuffer = new AudioRingBuffer(this.preRollCapacitySamples);

    // Overlap capacity (e.g. 1.5s = 24,000 samples)
    const overlapMs = options.trailingOverlapMs ?? 1500;
    this.defaultOverlapSamples = Math.floor((overlapMs / 1000) * this.sampleRate);

    const vadOptions: VadOptions = {
      sampleRate: this.sampleRate,
      adaptiveNoiseFloor: options.adaptiveNoiseFloor ?? true
    };
    this.vad = new VoiceActivityDetector(vadOptions);
  }

  /**
   * Sets or updates active singing state.
   * When singing is active, speech accumulation is suppressed.
   * If speech was in-progress, it is flushed or cleanly reset so worship music does not reach Whisper.
   */
  public setSingingActive(active: boolean): void {
    if (this.isSingingActive !== active) {
      this.isSingingActive = active;
      if (active) {
        if (this.isSpeaking && this.accumulatedSampleCount >= this.minSamples) {
          this.emitSegment();
        } else {
          this.reset();
        }
      }
    }
  }

  /**
   * Requests trailing audio overlap into the next emitted segment.
   * Used when a biblical book name appears near the end of a segment so the next segment
   * includes the trailing book name along with the subsequent chapter/verse.
   */
  public requestOverlap(overlapSeconds?: number): void {
    this.pendingOverlap = true;
    if (overlapSeconds !== undefined && this.trailingOverlapSamples) {
      const targetSamples = Math.floor(overlapSeconds * this.sampleRate);
      if (this.trailingOverlapSamples.length > targetSamples) {
        this.trailingOverlapSamples = this.trailingOverlapSamples.slice(
          this.trailingOverlapSamples.length - targetSamples
        );
      }
    }
  }

  /**
   * Returns whether an overlap from the previous segment is pending.
   */
  public hasPendingOverlap(): boolean {
    return this.pendingOverlap;
  }

  /**
   * Extends the silence hangover threshold for the current utterance.
   */
  public extendHangover(additionalFrames: number): void {
    this.extraHangoverFrames += additionalFrames;
  }

  public setSourceId(sourceId: string): SpeechSegment | null {
    if (this.currentSourceId !== sourceId) {
      // Switching sources flushes in-progress segmenter buffer cleanly
      const flushed = this.flush();
      this.currentSourceId = sourceId;
      this.preRollBuffer.flush();
      this.trailingOverlapSamples = null;
      this.pendingOverlap = false;
      return flushed;
    }
    return null;
  }

  /**
   * Flushes any in-progress accumulated speech frames immediately.
   * If accumulated speech exceeds minimum samples, emits and returns the segment;
   * otherwise, resets the accumulated buffer.
   */
  public flush(): SpeechSegment | null {
    if (this.accumulatedSampleCount >= this.minSamples) {
      return this.emitSegment();
    }
    this.reset();
    return null;
  }

  /**
   * Ingests a frame of 16-bit PCM audio (typically 30ms = 480 samples).
   * @param frame PCM audio samples
   * @param isSinging Optional flag indicating whether singing is currently active
   */
  public pushFrame(frame: Int16Array, isSinging = false): void {
    // PR 8: Send singing away from the speech path
    if (isSinging || this.isSingingActive) {
      if (this.isSpeaking && this.accumulatedSampleCount >= this.minSamples) {
        this.emitSegment();
      } else {
        this.reset();
      }
      return;
    }

    const vadResult = this.vad.processFrame(frame);

    if (vadResult.isSpeech) {
      if (!this.isSpeaking) {
        // Speech started!
        this.isSpeaking = true;
        this.consecutiveSilenceFrames = 0;

        // 1. If an overlap from a previous segment was requested, prepend it
        if (this.pendingOverlap && this.trailingOverlapSamples) {
          this.accumulatedFrames.push(new Int16Array(this.trailingOverlapSamples));
          this.accumulatedSampleCount += this.trailingOverlapSamples.length;
          this.pendingOverlap = false;
          this.trailingOverlapSamples = null;
        }

        // 2. Prepend pre-roll buffer from AudioRingBuffer (preserves initial phonemes)
        const preRoll = this.preRollBuffer.readAll();
        if (preRoll.length > 0) {
          this.accumulatedFrames.push(preRoll);
          this.accumulatedSampleCount += preRoll.length;
        }

        // 3. Add current speech frame
        this.accumulatedFrames.push(new Int16Array(frame));
        this.accumulatedSampleCount += frame.length;
      } else {
        // Continuing speech
        this.consecutiveSilenceFrames = 0;
        this.accumulatedFrames.push(new Int16Array(frame));
        this.accumulatedSampleCount += frame.length;

        // Check if max duration reached (prevent runaway utterances)
        if (this.accumulatedSampleCount >= this.maxSamples) {
          this.emitSegment();
        }
      }
    } else {
      if (!this.isSpeaking) {
        // Background / silence: continuously refresh pre-roll buffer
        this.preRollBuffer.write(frame);
      } else {
        // Silence following speech (evaluating hangover)
        this.consecutiveSilenceFrames++;
        this.accumulatedFrames.push(new Int16Array(frame));
        this.accumulatedSampleCount += frame.length;

        const effectiveHangover = this.baseHangoverFrames + this.extraHangoverFrames;
        if (this.consecutiveSilenceFrames >= effectiveHangover) {
          if (this.accumulatedSampleCount >= this.minSamples) {
            this.emitSegment();
          } else {
            // Segment was too brief (e.g. mic click or cough); discard
            this.reset();
          }
        }
      }
    }
  }

  private emitSegment(): SpeechSegment | null {
    if (this.accumulatedSampleCount === 0) return null;

    // Concat all accumulated frames into one contiguous Int16Array
    const combined = new Int16Array(this.accumulatedSampleCount);
    let offset = 0;
    for (const f of this.accumulatedFrames) {
      combined.set(f, offset);
      offset += f.length;
    }

    // PR Safeguard: Discard segments with average RMS below minSegmentRms (ambient hiss / fan noise)
    let sumSquares = 0;
    for (let i = 0; i < combined.length; i++) {
      const val = combined[i] / 32768.0;
      sumSquares += val * val;
    }
    const rms = Math.sqrt(sumSquares / combined.length);
    if (rms < this.minSegmentRms) {
      this.reset();
      return null;
    }

    // Save trailing samples for potential overlap into next segment
    const overlapLen = Math.min(combined.length, this.defaultOverlapSamples);
    this.trailingOverlapSamples = combined.slice(combined.length - overlapLen);

    const durationSeconds = combined.length / this.sampleRate;
    const segment: SpeechSegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      samples: combined,
      durationSeconds,
      sourceId: this.currentSourceId,
      timestamp: Date.now()
    };

    this.reset();

    for (const listener of this.listeners) {
      try {
        listener(segment);
      } catch (err) {
        console.error('Error in SpeechSegmenter listener:', err);
      }
    }

    return segment;
  }

  public onSegment(listener: SegmentListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public reset(): void {
    this.accumulatedFrames = [];
    this.accumulatedSampleCount = 0;
    this.consecutiveSilenceFrames = 0;
    this.isSpeaking = false;
    this.extraHangoverFrames = 0;
    this.preRollBuffer.flush();
  }

  public getPreRollBufferSize(): number {
    return this.preRollBuffer.size();
  }
}
