import { CanonBook } from '@pulpit-ai/shared-types';
import { detectEarlyCanonBookCue } from './LiturgicalHotwords.js';

export interface StreamingTokenSegmenterOptions {
  /** Maximum words retained in the sliding FIFO context window (default 16, range 12-18) */
  maxWindowWords?: number;
  /** Trailing silence duration in ms that triggers an acoustic endpoint flush (default 800ms) */
  endpointSilenceMs?: number;
}

export interface EarlyBookCueEvent {
  book: CanonBook;
  windowText: string;
  timestamp: number;
}

export interface StreamingUtteranceEvent {
  text: string;
  reason: 'endpoint' | 'silence_timeout' | 'manual_flush';
  timestamp: number;
}

/**
 * Streaming BPE/SentencePiece Token Boundary State Machine for sherpa-onnx Zipformer.
 *
 * Reassembles unpunctuated streaming subword tokens (e.g. "▁turn", "▁to", "▁deu", "ter", "onomy")
 * into clean whitespace-delimited words, maintains a 12-18 word sliding FIFO window,
 * fires early-cue canonical book notifications before chapter/verse completion, and emits
 * discrete utterance segments on transducer endpoints (>=800ms silence).
 */
export class StreamingTokenSegmenter {
  private readonly maxWindowWords: number;
  private readonly endpointSilenceMs: number;

  private activePartialText = '';
  private assembledWords: string[] = [];
  private lastTokenAt = 0;
  private lastSignaledBookId: string | null = null;

  private earlyCueListeners: Set<(ev: EarlyBookCueEvent) => void> = new Set();
  private utteranceListeners: Set<(ev: StreamingUtteranceEvent) => void> = new Set();

  constructor(options: StreamingTokenSegmenterOptions = {}) {
    this.maxWindowWords = Math.max(12, Math.min(18, options.maxWindowWords ?? 16));
    this.endpointSilenceMs = options.endpointSilenceMs ?? 800;
  }

  /**
   * Normalizes SentencePiece/BPE token strings (replacing U+2581 '▁' with standard spaces).
   */
  public static normalizeSubwords(rawTokenStream: string): string {
    return rawTokenStream
      .replace(/\u2581/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Ingests a streaming partial text snapshot from Zipformer (or incremental BPE piece).
   * @param text Latest recognizer text snapshot or subword token
   * @param isEndpoint True if sherpa-onnx's built-in endpoint detector triggered
   * @param now Timestamp in milliseconds
   */
  public pushPartial(text: string, isEndpoint = false, now = Date.now()): StreamingUtteranceEvent | null {
    const normalized = StreamingTokenSegmenter.normalizeSubwords(text);

    if (normalized) {
      this.activePartialText = normalized;
      this.lastTokenAt = now;

      const words = normalized.split(' ').filter(Boolean);
      this.assembledWords = words.slice(-this.maxWindowWords);

      const windowText = this.getSlidingWindowText();
      const detectedBook = detectEarlyCanonBookCue(windowText);
      if (detectedBook && detectedBook.id !== this.lastSignaledBookId) {
        this.lastSignaledBookId = detectedBook.id;
        const cueEvent: EarlyBookCueEvent = {
          book: detectedBook,
          windowText,
          timestamp: now
        };
        for (const fn of this.earlyCueListeners) {
          fn(cueEvent);
        }
      }
    }

    if (isEndpoint && this.activePartialText) {
      return this.flush('endpoint', now);
    }

    return null;
  }

  /**
   * Ingests an individual SentencePiece/BPE subword token (e.g. "▁rom", "ans").
   */
  public pushSubwordToken(token: string, isEndpoint = false, now = Date.now()): StreamingUtteranceEvent | null {
    const appended = this.activePartialText
      ? `${this.activePartialText}${token.startsWith('\u2581') || token.startsWith(' ') ? ' ' : ''}${token.replace(/^\u2581/, '')}`
      : token;
    return this.pushPartial(appended, isEndpoint, now);
  }

  /**
   * Checks whether trailing silence has exceeded endpointSilenceMs (>=800ms) and flushes if so.
   */
  public checkSilenceTimeout(now = Date.now()): StreamingUtteranceEvent | null {
    if (!this.activePartialText || this.lastTokenAt === 0) return null;
    if (now - this.lastTokenAt >= this.endpointSilenceMs) {
      return this.flush('silence_timeout', now);
    }
    return null;
  }

  /**
   * Flushes the current assembled utterance to downstream Scripture & Song parsers.
   */
  public flush(
    reason: StreamingUtteranceEvent['reason'] = 'manual_flush',
    now = Date.now()
  ): StreamingUtteranceEvent | null {
    const text = this.activePartialText.trim();
    this.activePartialText = '';
    this.assembledWords = [];
    this.lastTokenAt = 0;
    this.lastSignaledBookId = null;

    if (!text) return null;

    const event: StreamingUtteranceEvent = { text, reason, timestamp: now };
    for (const fn of this.utteranceListeners) {
      fn(event);
    }
    return event;
  }

  public getSlidingWindowText(): string {
    return this.assembledWords.join(' ');
  }

  public reset(): void {
    this.activePartialText = '';
    this.assembledWords = [];
    this.lastTokenAt = 0;
    this.lastSignaledBookId = null;
  }

  public onEarlyBookCue(listener: (ev: EarlyBookCueEvent) => void): () => void {
    this.earlyCueListeners.add(listener);
    return () => this.earlyCueListeners.delete(listener);
  }

  public onUtterance(listener: (ev: StreamingUtteranceEvent) => void): () => void {
    this.utteranceListeners.add(listener);
    return () => this.utteranceListeners.delete(listener);
  }
}
