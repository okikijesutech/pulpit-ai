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
   */
  public async processSegment(segment: SpeechSegment): Promise<RecognizedTranscriptEvent | null> {
    if (this.isProcessing) {
      // Non-blocking drop: prevent unbounded queue buildup on modest 2-core CPU
      return null;
    }

    this.isProcessing = true;

    try {
      const result: TranscriptionJobResult = await this.worker.transcribeSegment(segment);
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
    } finally {
      this.isProcessing = false;
    }
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
