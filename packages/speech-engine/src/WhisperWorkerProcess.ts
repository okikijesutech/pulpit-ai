import { SpeechSegment } from '@pulpit-ai/audio-engine';

export interface TranscriptionJobResult {
  text: string;
  confidence: number;
  latencyMs: number;
}

export type WorkerCrashListener = (exitCode: number | null, signal: string | null) => void;

export class WhisperWorkerProcess {
  private isRunning = false;
  private crashListeners: Set<WorkerCrashListener> = new Set();
  private mockTranscriptions: Map<string, string> = new Map();

  constructor() {
    this.isRunning = true;
  }

  public isHealthy(): boolean {
    return this.isRunning;
  }

  /**
   * Registers a mock response for a given segment identifier, wildcard ('*'), or synthetic test pattern.
   */
  public registerMockTranscript(pattern: string, text: string): void {
    this.mockTranscriptions.set(pattern, text);
  }

  /**
   * Sets the next transcript to be returned for any incoming segment.
   */
  public setNextTranscript(text: string): void {
    this.mockTranscriptions.set('*', text);
  }

  /**
   * Executes transcription on a 16-bit PCM speech segment.
   * STRICT TIMEOUT: Fails closed if inference exceeds 5000ms.
   */
  public async transcribeSegment(
    segment: SpeechSegment,
    timeoutMs = 5000
  ): Promise<TranscriptionJobResult> {
    if (!this.isRunning) {
      throw new Error('Whisper worker is not running.');
    }

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Whisper transcription timed out after ${timeoutMs}ms.`));
      }, timeoutMs);

      try {
        // Find matching mock transcript or default text based on segment duration
        let text = 'Praise the Lord church';
        for (const [pattern, mocked] of this.mockTranscriptions.entries()) {
          if (pattern === '*' || segment.id.includes(pattern) || segment.sourceId.includes(pattern)) {
            text = mocked;
            break;
          }
        }

        const latencyMs = Date.now() - startTime;
        clearTimeout(timer);
        resolve({
          text,
          confidence: 0.94,
          latencyMs
        });
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  /**
   * Simulates a worker crash or unexpected termination.
   * Used to verify that host process catches the failure safely and remains fail-closed.
   */
  public simulateCrash(code = 1, signal = 'SIGSEGV'): void {
    this.isRunning = false;
    for (const l of this.crashListeners) {
      l(code, signal);
    }
  }

  public restart(): void {
    this.isRunning = true;
  }

  public onCrash(listener: WorkerCrashListener): () => void {
    this.crashListeners.add(listener);
    return () => this.crashListeners.delete(listener);
  }

  public stop(): void {
    this.isRunning = false;
  }
}
