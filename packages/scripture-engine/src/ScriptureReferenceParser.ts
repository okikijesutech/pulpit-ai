/**
 * Deterministic Explicit Scripture Reference Parser.
 *
 * Scans spoken transcripts for explicit Bible references (book + chapter + verse/range).
 * Strictly rejects sermon themes, topical discourse, or vague mentions.
 * Normalizes spoken numbers and ordinal book prefixes, validates against Protestant canon,
 * and preserves exact raw speech snippets as evidence for operator audit.
 */

import { ScriptureReference } from '@pulpit-ai/shared-types';
import { CanonValidator, CanonValidationResult } from './CanonValidator.js';
import { CANON_BOOKS, findCanonBook, CanonBook } from './CanonData.js';
import { normalizeSpokenNumbersInText, parseSpokenNumber } from './SpokenNumberConverter.js';

export interface ParsedScriptureResult {
  hasReference: boolean;
  reference?: ScriptureReference;
  rawEvidence: string;
  confidence: number;
  isCanonValid: boolean;
  isIncomplete?: boolean;
  isInvalid?: boolean;
  validationError?: string;
  detectedBook?: CanonBook;
}

export class ScriptureReferenceParser {
  private static bookRegexPattern: RegExp | null = null;

  /**
   * Builds an optimized regex matching all 66 canon book names and known aliases,
   * sorted longest-first to prevent partial collisions (e.g. "1 Corinthians" before "Corinthians").
   */
  private static getBookRegexPattern(): RegExp {
    if (!this.bookRegexPattern) {
      const allAliases: string[] = [];
      for (const book of CANON_BOOKS) {
        allAliases.push(book.name.toLowerCase());
        for (const alias of book.aliases) {
          allAliases.push(alias.toLowerCase());
        }
      }

      // Sort descending by length so longer multi-word phrases match first
      allAliases.sort((a, b) => b.length - a.length);

      // Escape special characters (e.g. dot in abbreviations)
      const escaped = allAliases.map(a => a.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
      this.bookRegexPattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'i');
    }
    return this.bookRegexPattern;
  }

  /**
   * Parses a speech transcript for an explicit Scripture reference.
   *
   * @param rawTranscript The raw unedited speech string from Whisper.
   * @param defaultTranslation Translation identifier (e.g. 'WEB', 'KJV').
   * @returns ParsedScriptureResult detailing match, reference, validity, and evidence.
   */
  public static parse(rawTranscript: string, defaultTranslation = 'WEB'): ParsedScriptureResult {
    if (!rawTranscript || rawTranscript.trim().length === 0) {
      return {
        hasReference: false,
        rawEvidence: '',
        confidence: 0,
        isCanonValid: false
      };
    }

    const trimmed = rawTranscript.trim();

    // Step 1: Pre-normalize numbers in text while preserving book names
    const normalized = normalizeSpokenNumbersInText(trimmed);

    // Step 2: Search for book names
    const bookRegex = this.getBookRegexPattern();
    const bookMatch = bookRegex.exec(normalized);

    if (!bookMatch) {
      // No canon book mentioned at all -> definite no reference
      return {
        hasReference: false,
        rawEvidence: '',
        confidence: 0,
        isCanonValid: false
      };
    }

    const matchedBookText = bookMatch[1];
    const canonBook = findCanonBook(matchedBookText);
    if (!canonBook) {
      return {
        hasReference: false,
        rawEvidence: '',
        confidence: 0,
        isCanonValid: false
      };
    }

    // Slice text immediately following the book match to inspect chapter & verse
    const afterBook = normalized.slice(bookMatch.index + matchedBookText.length).trim();

    // --- PATTERN 1: Standard Colon notation (e.g. "3:16", "13:4-7", "13:4 to 7", "13:4 through 7") ---
    const colonPattern = /^[:\s]*(\d+)\s*:\s*(\d+)(?:\s*(?:-|to|through)\s*(\d+))?/i;
    const colonMatch = colonPattern.exec(afterBook);

    if (colonMatch) {
      const chapter = parseInt(colonMatch[1], 10);
      const verseStart = parseInt(colonMatch[2], 10);
      const verseEnd = colonMatch[3] ? parseInt(colonMatch[3], 10) : undefined;

      const rawEvidence = trimmed.slice(
        Math.max(0, bookMatch.index),
        Math.min(trimmed.length, bookMatch.index + matchedBookText.length + colonMatch[0].length + 10)
      );

      return this.validateAndBuildResult(
        canonBook,
        chapter,
        verseStart,
        verseEnd,
        rawEvidence,
        defaultTranslation,
        0.95
      );
    }

    // --- PATTERN 2: Explicit Spoken format (e.g. "chapter 3 verse 16", "13 verses 4 to 7", "chapter 1 verses 1-3") ---
    const spokenPattern = /^(?:chapter\s+)?(\d+)[,\s]*(?:verses?|v\.?)\s*(\d+)(?:\s*(?:-|to|through|and)\s*(\d+))?/i;
    const spokenMatch = spokenPattern.exec(afterBook);

    if (spokenMatch) {
      const chapter = parseInt(spokenMatch[1], 10);
      const verseStart = parseInt(spokenMatch[2], 10);
      const verseEnd = spokenMatch[3] ? parseInt(spokenMatch[3], 10) : undefined;

      const rawEvidence = trimmed.slice(
        Math.max(0, bookMatch.index),
        Math.min(trimmed.length, bookMatch.index + matchedBookText.length + spokenMatch[0].length + 10)
      );

      return this.validateAndBuildResult(
        canonBook,
        chapter,
        verseStart,
        verseEnd,
        rawEvidence,
        defaultTranslation,
        0.92
      );
    }

    // --- PATTERN 3: Spoken two-number sequence (e.g. "John 3 16", "Romans 8 28") ---
    const twoNumberPattern = /^(?:chapter\s+)?(\d+)\s+(\d+)(?:\s*(?:-|to|through)\s*(\d+))?/i;
    const twoNumberMatch = twoNumberPattern.exec(afterBook);

    if (twoNumberMatch) {
      const chapter = parseInt(twoNumberMatch[1], 10);
      const verseStart = parseInt(twoNumberMatch[2], 10);
      const verseEnd = twoNumberMatch[3] ? parseInt(twoNumberMatch[3], 10) : undefined;

      const rawEvidence = trimmed.slice(
        Math.max(0, bookMatch.index),
        Math.min(trimmed.length, bookMatch.index + matchedBookText.length + twoNumberMatch[0].length + 10)
      );

      return this.validateAndBuildResult(
        canonBook,
        chapter,
        verseStart,
        verseEnd,
        rawEvidence,
        defaultTranslation,
        0.85
      );
    }

    // --- PATTERN 4: Psalms / Entire Chapter mention (e.g. "Psalm 23", "Psalm chapter 23") ---
    const chapterOnlyPattern = /^(?:chapter\s+)?(\d+)(?!\s*[:\d])/i;
    const chapterMatch = chapterOnlyPattern.exec(afterBook);

    if (chapterMatch) {
      const chapter = parseInt(chapterMatch[1], 10);
      const rawEvidence = trimmed.slice(
        Math.max(0, bookMatch.index),
        Math.min(trimmed.length, bookMatch.index + matchedBookText.length + chapterMatch[0].length + 5)
      );

      // In church preaching, "Psalm 23" or "John chapter 3" defaults to opening that chapter
      if (canonBook.id === 'PSA') {
        const maxVerses = CanonValidator.getMaxVerses(canonBook.name, chapter) || 1;
        return this.validateAndBuildResult(
          canonBook,
          chapter,
          1,
          maxVerses,
          rawEvidence,
          defaultTranslation,
          0.90
        );
      }

      // Default to opening chapter at verse 1
      return this.validateAndBuildResult(
        canonBook,
        chapter,
        1,
        undefined,
        rawEvidence,
        defaultTranslation,
        0.88
      );
    }

    // --- Incomplete Reference: Book was mentioned, but no valid chapter or verse ---
    return {
      hasReference: false,
      isIncomplete: true,
      isCanonValid: false,
      rawEvidence: trimmed.slice(Math.max(0, bookMatch.index), bookMatch.index + matchedBookText.length),
      confidence: 0.2,
      detectedBook: canonBook,
      validationError: `Book "${canonBook.name}" mentioned without chapter or verse numbers`
    };
  }

  /**
   * Helper that runs CanonValidator and constructs the final ParsedScriptureResult.
   */
  private static validateAndBuildResult(
    canonBook: CanonBook,
    chapter: number,
    verseStart: number,
    verseEnd: number | undefined,
    rawEvidence: string,
    translation: string,
    confidence: number
  ): ParsedScriptureResult {
    const valResult: CanonValidationResult = CanonValidator.validateReference(
      canonBook.name,
      chapter,
      verseStart,
      verseEnd
    );

    if (!valResult.isValid) {
      return {
        hasReference: true,
        isCanonValid: false,
        isInvalid: true,
        validationError: valResult.error,
        rawEvidence,
        confidence: 0.4,
        detectedBook: canonBook
      };
    }

    const reference: ScriptureReference = {
      book: canonBook.name,
      chapter,
      verseStart,
      verseEnd,
      translation,
      rawSpokenText: rawEvidence.trim()
    };

    return {
      hasReference: true,
      reference,
      rawEvidence: rawEvidence.trim(),
      confidence,
      isCanonValid: true,
      detectedBook: canonBook
    };
  }
}
