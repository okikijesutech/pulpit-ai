/**
 * Suggestion Candidate Generator for Verified Scripture with Production Parser Guards.
 *
 * Bridges speech transcripts to verified Scripture lookup and FreeShow presentation commands.
 * Strictly adheres to safety constraints:
 * - Emits SuggestionCandidate only when explicit reference matches verified local text.
 * - Suppresses duplicate candidates within a configurable cooldown window.
 * - Labels whole-chapter results as "whole chapter, no verse given" and avoids silently defaulting to verse 1.
 * - Returns all references found in a segment via processTranscriptAll().
 * - Manages rolling context windows safely, re-parsing ONLY when newest segment adds a book or number.
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

interface RollingUtterance {
  text: string;
  timestamp: number;
}

export class ScriptureCandidateGenerator {
  private activeTranslation: string;
  private cooldownMs: number;
  private confidenceThreshold: number;
  private emittedTimes: Map<string, number> = new Map();

  private candidateListeners: Set<CandidateListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();

  private recentUtterances: RollingUtterance[] = [];
  private activeCandidates: SuggestionCandidate[] = [];

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
   * Returns currently active (pending) suggestion candidates.
   */
  public getActiveCandidates(): SuggestionCandidate[] {
    return this.activeCandidates.filter(c => c.status === 'pending');
  }

  /**
   * Clears the rolling transcript utterance buffer.
   */
  public clearRollingWindow(): void {
    this.recentUtterances = [];
  }

  /**
   * Ingests a speech segment, returning all valid candidates found in that segment.
   *
   * @param transcript Spoken text snippet from speech recognition engine.
   * @param timestamp Optional epoch timestamp for cooldown evaluation.
   * @returns Array of generated SuggestionCandidates.
   */
  public processTranscriptAll(transcript: string, timestamp?: number): SuggestionCandidate[] {
    if (!transcript || transcript.trim().length === 0) {
      return [];
    }

    const now = timestamp ?? Date.now();
    const parseResults: ParsedScriptureResult[] = ScriptureReferenceParser.parseAll(
      transcript,
      this.activeTranslation
    );

    const generatedCandidates: SuggestionCandidate[] = [];

    for (const parseResult of parseResults) {
      if (!parseResult.hasReference || !parseResult.isCanonValid || !parseResult.reference) {
        if (parseResult.isIncomplete || parseResult.isInvalid) {
          this.emitError({
            rawText: transcript,
            reason: parseResult.validationError || 'Incomplete or invalid scripture reference',
            timestamp: now
          });
        }
        continue;
      }

      // Check confidence threshold (rejects low-confidence cue-less matches)
      if (parseResult.confidence < this.confidenceThreshold) {
        continue;
      }

      const ref = parseResult.reference;
      const refKey = `${this.activeTranslation}:${ref.book}:${ref.chapter}:${ref.verseStart}:${ref.verseEnd || ref.verseStart}`;

      // Cooldown check for duplicate suppression
      const lastEmitted = this.emittedTimes.get(refKey) || 0;
      if (now - lastEmitted < this.cooldownMs) {
        continue;
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
        continue;
      }

      const isWholeChapter = !!ref.isWholeChapter;
      const verseRangeStr = ref.verseEnd && ref.verseEnd > ref.verseStart
        ? `${ref.verseStart}-${ref.verseEnd}`
        : `${ref.verseStart}`;

      const bookIdx = CANON_BOOKS.findIndex(
        b => b.name.toLowerCase() === ref.book.toLowerCase() || b.id.toLowerCase() === ref.book.toLowerCase()
      );
      const bookNumber = bookIdx >= 0 ? bookIdx + 1 : 1;
      const dotReference = isWholeChapter
        ? `${bookNumber}.${ref.chapter}`
        : `${bookNumber}.${ref.chapter}.${ref.verseStart}`;

      // Label whole-chapter results clearly; never silently default to verse 1
      const referenceDisplay = isWholeChapter
        ? `${ref.book} ${ref.chapter} (whole chapter, no verse given)`
        : `${ref.book} ${ref.chapter}:${verseRangeStr}`;

      const title = `${referenceDisplay} (${passage.translation.abbreviation})`;

      const actionPayload: FreeShowCommand = {
        action: 'start_scripture',
        data: {
          reference: dotReference,
          referenceDisplay,
          book: ref.book,
          bookNumber,
          chapter: ref.chapter,
          verse: isWholeChapter ? undefined : ref.verseStart,
          verseEnd: ref.verseEnd,
          isWholeChapter,
          label: ref.label,
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
        title,
        contentPreview: passage.formattedText,
        confidence: Math.round(parseResult.confidence * 100) / 100,
        evidence: parseResult.rawEvidence,
        detectedAt: now,
        actionPayload,
        status: 'pending',
        needsReview: parseResult.needsReview,
        isWholeChapter
      };

      // Record emission time for cooldown
      this.emittedTimes.set(refKey, now);
      this.activeCandidates.push(candidate);
      this.emitCandidate(candidate);
      generatedCandidates.push(candidate);
    }

    return generatedCandidates;
  }

  /**
   * Ingests a single speech transcript, returning primary candidate or null.
   * Backward compatible with single-candidate callers.
   */
  public processTranscript(transcript: string, timestamp?: number): SuggestionCandidate | null {
    const candidates = this.processTranscriptAll(transcript, timestamp);
    return candidates.length > 0 ? candidates[0] : null;
  }

  /**
   * Rolling utterance pipeline with PR 5 guards:
   * Re-parses rolling window ONLY when the newest segment adds a book or number,
   * preventing old references from re-triggering after cooldown expiry.
   *
   * @param rawText Newest speech segment from recognition engine.
   * @param timestamp Optional epoch timestamp.
   * @returns Array of emitted suggestion candidates for this utterance.
   */
  public processUtterance(rawText: string, timestamp?: number): SuggestionCandidate[] {
    if (!rawText || rawText.trim().length === 0) {
      return [];
    }

    const now = timestamp ?? Date.now();

    // Expire rolling window history older than 15s
    this.recentUtterances = this.recentUtterances.filter(u => now - u.timestamp <= 15000);

    // Direct parse on individual segment first
    const directCandidates = this.processTranscriptAll(rawText, now);

    // Guard: Check if the newest segment adds a book, number, or Scripture introductory cue
    const addsBookOrNumber =
      ScriptureReferenceParser.containsBook(rawText) ||
      ScriptureReferenceParser.containsNumber(rawText) ||
      /\b(bible|bibles|scripture|scriptures|book\s+of|turn\s+to|open\s+to|reading\s+from|read\s+from|chapter|verse|verses)\b/i.test(rawText);

    if (!addsBookOrNumber) {
      // Conversational utterance without book or number (e.g. "Amen church", "Praise the Lord")
      // Strictly do NOT re-parse rolling window!
      return directCandidates;
    }

    // Newest segment adds book or number: append to rolling history
    this.recentUtterances.push({ text: rawText, timestamp: now });
    if (this.recentUtterances.length > 3) {
      this.recentUtterances.shift();
    }

    // If rolling history contains multiple segments and direct segment didn't yield candidate,
    // or if rolling context can complete/refine an incomplete or whole-chapter mention:
    if (this.recentUtterances.length > 1) {
      const combined = this.recentUtterances.map(u => u.text).join(' ');
      const combinedCandidates = this.processTranscriptAll(combined, now);

      if (combinedCandidates.length > 0) {
        // When a combined segment refines a whole-chapter candidate from this same window
        // (e.g. "John chapter 3" followed by "verse 16" -> John 3:16):
        for (const cand of combinedCandidates) {
          const wholeChapterMatch = this.activeCandidates.find(
            c =>
              c.status === 'pending' &&
              c.isWholeChapter &&
              cand.actionPayload.data?.book === c.actionPayload.data?.book &&
              cand.actionPayload.data?.chapter === c.actionPayload.data?.chapter
          );

          if (wholeChapterMatch) {
            // Dismiss whole chapter candidate in favor of exact verse
            wholeChapterMatch.status = 'dismissed';
            cand.supersedesId = wholeChapterMatch.id;
          }
        }

        // Clear rolling window once combined reference resolves successfully
        this.recentUtterances = [];
        return combinedCandidates;
      }
    }

    return directCandidates;
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
