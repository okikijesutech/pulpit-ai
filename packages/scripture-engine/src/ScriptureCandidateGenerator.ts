/**
 * Suggestion Candidate Generator for Verified Scripture.
 *
 * Bridges speech transcripts to verified Scripture lookup and FreeShow presentation commands.
 * Strictly adheres to safety constraints:
 * - Emits SuggestionCandidate only when explicit reference matches verified local text.
 * - Suppresses duplicate candidates within a configurable cooldown window.
 * - Formats compliant FreeShowCommand actions for review by the Central Authority Manager.
 */

import { SuggestionCandidate, FreeShowCommand } from '@pulpit-ai/shared-types';
import { ScriptureReferenceParser, ParsedScriptureResult } from './ScriptureReferenceParser.js';
import { ScriptureDatabase } from './ScriptureDatabase.js';
import { CANON_BOOKS } from './CanonData.js';

export interface CandidateGeneratorOptions {
  activeTranslation?: string;
  cooldownMs?: number; // Minimum ms between identical reference suggestions
  confidenceThreshold?: number; // Minimum confidence to emit suggestion (default 0.7)
}

export type CandidateListener = (candidate: SuggestionCandidate) => void;
export type ErrorListener = (error: { rawText: string; reason: string; timestamp: number }) => void;

export class ScriptureCandidateGenerator {
  private activeTranslation: string;
  private cooldownMs: number;
  private confidenceThreshold: number;
  private lastEmittedRef: string = '';
  private lastEmittedTime: number = 0;

  private candidateListeners: Set<CandidateListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();

  constructor(
    private database: ScriptureDatabase,
    options: CandidateGeneratorOptions = {}
  ) {
    this.activeTranslation = options.activeTranslation || 'WEB';
    this.cooldownMs = options.cooldownMs ?? 10000; // 10s cooldown
    this.confidenceThreshold = options.confidenceThreshold ?? 0.7;
  }

  /**
   * Updates the active Bible translation for suggestions.
   */
  public setActiveTranslation(translationId: string): void {
    this.activeTranslation = translationId.toUpperCase();
  }

  public getActiveTranslation(): string {
    return this.activeTranslation;
  }

  /**
   * Registers a listener for new suggestion candidates.
   */
  public onCandidate(listener: CandidateListener): () => void {
    this.candidateListeners.add(listener);
    return () => this.candidateListeners.delete(listener);
  }

  /**
   * Registers a listener for invalid or incomplete reference detection events.
   */
  public onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * Ingests a speech transcript, parses for explicit Scripture reference,
   * queries verified local database, and emits a SuggestionCandidate if found.
   *
   * @param transcript Spoken text snippet from speech recognition engine.
   * @returns Generated SuggestionCandidate, or null if no valid verified reference found.
   */
  public processTranscript(transcript: string): SuggestionCandidate | null {
    if (!transcript || transcript.trim().length === 0) {
      return null;
    }

    const parseResult: ParsedScriptureResult = ScriptureReferenceParser.parse(
      transcript,
      this.activeTranslation
    );

    // If no reference or incomplete/invalid, record error and return null
    if (!parseResult.hasReference || !parseResult.isCanonValid || !parseResult.reference) {
      if (parseResult.isIncomplete || parseResult.isInvalid) {
        this.emitError({
          rawText: transcript,
          reason: parseResult.validationError || 'Incomplete or invalid scripture reference',
          timestamp: Date.now()
        });
      }
      return null;
    }

    // Check confidence threshold
    if (parseResult.confidence < this.confidenceThreshold) {
      return null;
    }

    const ref = parseResult.reference;
    const refKey = `${this.activeTranslation}:${ref.book}:${ref.chapter}:${ref.verseStart}:${ref.verseEnd || ref.verseStart}`;
    const now = Date.now();

    // Cooldown check for duplicate suppression
    if (refKey === this.lastEmittedRef && now - this.lastEmittedTime < this.cooldownMs) {
      return null;
    }

    // Retrieve exact verified text from SQLite database
    const passage = this.database.getPassage(
      this.activeTranslation,
      ref.book,
      ref.chapter,
      ref.verseStart,
      ref.verseEnd
    );

    // Strict safety check: if passage is missing or unverified, fail closed
    if (!passage || !passage.found || passage.verses.length === 0) {
      this.emitError({
        rawText: transcript,
        reason: `Passage ${ref.book} ${ref.chapter}:${ref.verseStart}${ref.verseEnd ? `-${ref.verseEnd}` : ''} not found in verified ${this.activeTranslation} translation`,
        timestamp: now
      });
      return null;
    }

    const verseRangeStr = ref.verseEnd && ref.verseEnd > ref.verseStart
      ? `${ref.verseStart}-${ref.verseEnd}`
      : `${ref.verseStart}`;

    const bookIdx = CANON_BOOKS.findIndex(
      b => b.name.toLowerCase() === ref.book.toLowerCase() || b.id.toLowerCase() === ref.book.toLowerCase()
    );
    const bookNumber = bookIdx >= 0 ? bookIdx + 1 : 1;
    const dotReference = `${bookNumber}.${ref.chapter}.${ref.verseStart}`;
    const referenceDisplay = `${ref.book} ${ref.chapter}:${verseRangeStr}`;

    // Build standard FreeShow projection command payload
    const actionPayload: FreeShowCommand = {
      action: 'start_scripture',
      data: {
        reference: dotReference, // FreeShow dot-notation: e.g. "43.3.16"
        referenceDisplay, // Formatted text: e.g. "John 3:16"
        book: ref.book,
        bookNumber,
        chapter: ref.chapter,
        verse: ref.verseStart,
        verseEnd: ref.verseEnd,
        text: passage.formattedText,
        fullText: passage.fullText,
        translation: passage.translation.abbreviation,
        attribution: passage.attribution
      },
      source: 'ai',
      correlationId: `cor_${now}_${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now
    };

    const candidate: SuggestionCandidate = {
      id: `cand_${now}_${Math.random().toString(36).substring(2, 9)}`,
      type: 'scripture',
      title: `${referenceDisplay} (${passage.translation.abbreviation})`,
      contentPreview: passage.formattedText,
      confidence: Math.round(parseResult.confidence * 100) / 100,
      evidence: parseResult.rawEvidence,
      detectedAt: now,
      actionPayload,
      status: 'pending'
    };

    // Update cooldown state
    this.lastEmittedRef = refKey;
    this.lastEmittedTime = now;

    // Notify listeners
    this.emitCandidate(candidate);
    return candidate;
  }

  private emitCandidate(candidate: SuggestionCandidate): void {
    for (const listener of this.candidateListeners) {
      try {
        listener(candidate);
      } catch (err) {
        console.error('Error in candidate listener:', err);
      }
    }
  }

  private emitError(error: { rawText: string; reason: string; timestamp: number }): void {
    for (const listener of this.errorListeners) {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    }
  }
}
