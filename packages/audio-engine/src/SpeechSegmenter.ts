import { VoiceActivityDetector } from './VoiceActivityDetector.js';

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
  minSegmentSeconds?: number; // Minimum length of speech to emit (default 1.0s)
  maxSegmentSeconds?: number; // Maximum length before forced segment cut (default 5.0s)
  silenceHangoverFrames?: number; // Number of silent frames required to cut a phrase (e.g. 15 frames * 30ms = 450ms)
}

export class SpeechSegmenter {
  private vad: VoiceActivityDetector;
  private readonly sampleRate: number;
  private readonly minSamples: number;
  private readonly maxSamples: number;
  private readonly hangoverFrames: number;

  private accumulatedFrames: Int16Array[] = [];
  private accumulatedSampleCount = 0;
  private consecutiveSilenceFrames = 0;
  private isSpeaking = false;
  private currentSourceId = 'default_source';
  private listeners: Set<SegmentListener> = new Set();

  constructor(options: SpeechSegmenterOptions = {}) {
    this.sampleRate = options.sampleRate ?? 16000;
    this.vad = new VoiceActivityDetector({ sampleRate: this.sampleRate });
    this.minSamples = Math.floor((options.minSegmentSeconds ?? 1.0) * this.sampleRate);
    this.maxSamples = Math.floor((options.maxSegmentSeconds ?? 5.0) * this.sampleRate);
    this.hangoverFrames = options.silenceHangoverFrames ?? 15; // ~450ms of silence
  }

  public setSourceId(sourceId: string): void {
    if (this.currentSourceId !== sourceId) {
      // Discard in-progress segment to prevent cross-device contamination
      this.reset();
      this.currentSourceId = sourceId;
    }
  }

  /**
   * Ingests a frame of 16-bit PCM audio (typically 30ms = 480 samples).
   */
  public pushFrame(frame: Int16Array): void {
    const vadResult = this.vad.processFrame(frame);

    if (vadResult.isSpeech) {
      this.isSpeaking = true;
      this.consecutiveSilenceFrames = 0;
      this.accumulatedFrames.push(new Int16Array(frame));
      this.accumulatedSampleCount += frame.length;

      // Check if max duration reached (prevent runaway utterances)
      if (this.accumulatedSampleCount >= this.maxSamples) {
        this.emitSegment();
      }
    } else {
      if (this.isSpeaking) {
        this.consecutiveSilenceFrames++;
        this.accumulatedFrames.push(new Int16Array(frame));
        this.accumulatedSampleCount += frame.length;

        // If silence persists past hangover time, utterance is complete
        if (this.consecutiveSilenceFrames >= this.hangoverFrames) {
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

  private emitSegment(): void {
    if (this.accumulatedSampleCount === 0) return;

    // Concat all accumulated frames into one contiguous Int16Array
    const combined = new Int16Array(this.accumulatedSampleCount);
    let offset = 0;
    for (const f of this.accumulatedFrames) {
      combined.set(f, offset);
      offset += f.length;
    }

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
  }
}
