import { SpeechSegment } from '@pulpit-ai/audio-engine';
import { WhisperWorkerProcess, TranscriptionJobResult } from './WhisperWorkerProcess.js';
import { TranscriptNormalizer, NormalizedTranscript } from './TranscriptNormalizer.js';

export interface RecognizedTranscriptEvent {
  id: string;
  segmentId: string;
  sourceId: string;
  timestamp: number;
  rawText: string;
  normalizedText: string;
  tokens: string[];
  confidence: number;
  latencyMs: number;
}

export type TranscriptListener = (event: RecognizedTranscriptEvent) => void;
export type ErrorListener = (error: Error) => void;

export class SpeechRecognitionEngine {
  private worker: WhisperWorkerProcess;
  private normalizer: TranscriptNormalizer;
  private transcriptListeners: Set<TranscriptListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();
  private isProcessing = false;
  private segmentQueue: SpeechSegment[] = [];

  constructor(worker?: WhisperWorkerProcess, normalizer?: TranscriptNormalizer) {
    this.worker = worker ?? new WhisperWorkerProcess();
    this.normalizer = normalizer ?? new TranscriptNormalizer();

    // Setup worker crash listener
    this.worker.onCrash((code, signal) => {
      const err = new Error(
        `Whisper recognition worker crashed with code ${code} and signal ${signal}. Restarting cleanly.`
      );
      this.notifyError(err);
      this.worker.restart();
    });
  }

  public getWorker(): WhisperWorkerProcess {
    return this.worker;
  }

  /**
   * Processes a speech segment emitted by the audio segmenter.
   * Queues segments sequentially so continuous preaching speech is never dropped.
   */
  public async processSegment(segment: SpeechSegment): Promise<RecognizedTranscriptEvent | null> {
    if (this.isProcessing) {
      if (this.segmentQueue.length < 3) {
        this.segmentQueue.push(segment);
      }
      return null;
    }

    this.isProcessing = true;

    try {
      return await this.executeTranscription(segment);
    } finally {
      this.isProcessing = false;
      if (this.segmentQueue.length > 0) {
        const nextSegment = this.segmentQueue.shift()!;
        setTimeout(() => {
          this.processSegment(nextSegment).catch((err) => {
            console.error('Queued segment processing error:', err);
          });
        }, 10);
      }
    }
  }

  private async executeTranscription(segment: SpeechSegment): Promise<RecognizedTranscriptEvent | null> {
    try {
      const result: TranscriptionJobResult = await this.worker.transcribeSegment(segment);
      if (!result.text || result.text.trim().length === 0) {
        return null;
      }
      const normalized: NormalizedTranscript = this.normalizer.normalize(result.text);

      const event: RecognizedTranscriptEvent = {
        id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        segmentId: segment.id,
        sourceId: segment.sourceId,
        timestamp: Date.now(),
        rawText: normalized.rawText,
        normalizedText: normalized.normalizedText,
        tokens: normalized.tokens,
        confidence: result.confidence,
        latencyMs: result.latencyMs
      };

      for (const listener of this.transcriptListeners) {
        try {
          listener(event);
        } catch (err) {
          console.error('Error in transcript listener:', err);
        }
      }

      return event;
    } catch (err: any) {
      this.notifyError(err);
      return null;
    }
  }

  /**
   * Directly ingests a transcript (e.g. from an audio simulation or direct feed),
   * normalizes it, and broadcasts to listeners.
   */
  public ingestDirectTranscript(rawText: string, sourceId = 'simulated_mic'): RecognizedTranscriptEvent {
    const normalized: NormalizedTranscript = this.normalizer.normalize(rawText);

    const event: RecognizedTranscriptEvent = {
      id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      segmentId: `sim_seg_${Date.now()}`,
      sourceId,
      timestamp: Date.now(),
      rawText: normalized.rawText,
      normalizedText: normalized.normalizedText,
      tokens: normalized.tokens,
      confidence: 0.96,
      latencyMs: 14
    };

    for (const listener of this.transcriptListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in transcript listener:', err);
      }
    }

    return event;
  }

  public onTranscript(listener: TranscriptListener): () => void {
    this.transcriptListeners.add(listener);
    return () => this.transcriptListeners.delete(listener);
  }

  public onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  private notifyError(err: Error): void {
    for (const listener of this.errorListeners) {
      try {
        listener(err);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    }
  }
}
