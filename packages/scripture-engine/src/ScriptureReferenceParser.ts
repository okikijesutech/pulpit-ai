/**
 * Deterministic Explicit Scripture Reference Parser with Production Safety Guards.
 *
 * Scans spoken transcripts for explicit Bible references (book + chapter + verse/range).
 * Implements PR 5 Parser Guards:
 * - Requires a cue for bare numbers (colon, "chapter", "verse", or phrases like "turn to", "open to").
 * - Cue-less matches receive lower confidence and a "needs review" flag.
 * - Non-scriptural units (e.g. "10 times", "2 weeks ago") immediately reject false matches.
 * - Labels whole-chapter results as "whole chapter, no verse given" and avoids silently defaulting to verse 1.
 * - Returns all references found in a segment via parseAll().
 */

import { ScriptureReference } from '@pulpit-ai/shared-types';
import { CanonValidator, CanonValidationResult } from './CanonValidator.js';
import { CANON_BOOKS, findCanonBook, CanonBook } from './CanonData.js';
import { normalizeSpokenNumbersInText } from './SpokenNumberConverter.js';

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
  needsReview?: boolean;
  hasCue?: boolean;
  isWholeChapter?: boolean;
}

const PRECEDING_CUE_REGEX = /(?:turn\s+(?:our\s+bibles\s+|your\s+bibles\s+|with\s+me\s+)?to|open\s+(?:our\s+bibles\s+|your\s+bibles\s+|with\s+me\s+)?to|read\s+(?:together\s+)?from|reading\s+from|look\s+at|looking\s+at|book\s+of|gospel\s+of|epistle\s+of|letter\s+of)\s*$/i;

const NON_SCRIPTURE_UNITS_REGEX = /^\s*(?:times|time|weeks?|days?|months?|years?|hours?|minutes?|seconds?|percent|dollars?|cents?|naira|pounds?|ago)\b/i;

const NUMBER_WORDS_REGEX = /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|\d+)\b/i;

export class ScriptureReferenceParser {
  private static bookRegexPattern: RegExp | null = null;
  private static bookGlobalRegexPattern: RegExp | null = null;

  /**
   * Builds an optimized regex matching all 66 canon book names and known aliases,
   * sorted longest-first to prevent partial collisions (e.g. "1 Corinthians" before "Corinthians").
   */
  private static getBookRegexPattern(global = false): RegExp {
    if (!this.bookRegexPattern) {
      const allAliases: string[] = [];
      for (const book of CANON_BOOKS) {
        allAliases.push(book.name.toLowerCase());
        for (const alias of book.aliases) {
          allAliases.push(alias.toLowerCase());
        }
      }

      allAliases.sort((a, b) => b.length - a.length);
      const escaped = allAliases.map(a => a.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
      this.bookRegexPattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'i');
      this.bookGlobalRegexPattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
    }
    return global ? new RegExp(this.bookGlobalRegexPattern!.source, 'gi') : this.bookRegexPattern;
  }

  /**
   * Checks if a string contains any canon book name or alias.
   */
  public static containsBook(text: string): boolean {
    if (!text || text.trim().length === 0) return false;
    return this.getBookRegexPattern().test(text);
  }

  /**
   * Checks if a string contains digits or spoken number words.
   */
  public static containsNumber(text: string): boolean {
    if (!text || text.trim().length === 0) return false;
    return NUMBER_WORDS_REGEX.test(text);
  }

  /**
   * Parses all explicit Scripture references found in a speech transcript segment.
   *
   * @param rawTranscript Raw spoken utterance from speech recognition engine.
   * @param defaultTranslation Translation identifier (e.g. 'WEB', 'KJV').
   * @returns Array of ParsedScriptureResult records.
   */
  public static parseAll(rawTranscript: string, defaultTranslation = 'WEB'): ParsedScriptureResult[] {
    if (!rawTranscript || rawTranscript.trim().length === 0) {
      return [];
    }

    const trimmed = rawTranscript.trim();
    const normalized = normalizeSpokenNumbersInText(trimmed);
    const globalBookRegex = this.getBookRegexPattern(true);

    const results: ParsedScriptureResult[] = [];
    let match: RegExpExecArray | null;

    while ((match = globalBookRegex.exec(normalized)) !== null) {
      const matchedBookText = match[1];
      const matchIndex = match.index;
      const canonBook = findCanonBook(matchedBookText);
      if (!canonBook) continue;

      // Inspect text preceding this book match for a spoken cue
      const textBefore = normalized.slice(Math.max(0, matchIndex - 40), matchIndex).trim();
      const hasPrecedingCue = PRECEDING_CUE_REGEX.test(textBefore);

      // Inspect text immediately following this book match
      const afterBook = normalized.slice(matchIndex + matchedBookText.length).trim();

      const parsed = this.parseAfterBook(
        canonBook,
        matchedBookText,
        matchIndex,
        afterBook,
        hasPrecedingCue,
        trimmed,
        defaultTranslation
      );

      if (parsed && parsed.hasReference) {
        results.push(parsed);
      }
    }

    return results;
  }

  /**
   * Parses a speech transcript for an explicit Scripture reference (returns primary match).
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

    const all = this.parseAll(rawTranscript, defaultTranslation);
    if (all.length > 0) {
      return all[0];
    }

    // Check if a book was mentioned without chapter/verse numbers (incomplete check)
    const normalized = normalizeSpokenNumbersInText(rawTranscript.trim());
    const bookMatch = this.getBookRegexPattern().exec(normalized);
    if (bookMatch) {
      const canonBook = findCanonBook(bookMatch[1]);
      if (canonBook) {
        return {
          hasReference: false,
          isIncomplete: true,
          isCanonValid: false,
          rawEvidence: rawTranscript.trim().slice(Math.max(0, bookMatch.index), bookMatch.index + bookMatch[1].length),
          confidence: 0.2,
          detectedBook: canonBook,
          validationError: `Book "${canonBook.name}" mentioned without chapter or verse numbers`
        };
      }
    }

    return {
      hasReference: false,
      rawEvidence: '',
      confidence: 0,
      isCanonValid: false
    };
  }

  private static parseAfterBook(
    canonBook: CanonBook,
    matchedBookText: string,
    bookMatchIndex: number,
    afterBook: string,
    hasPrecedingCue: boolean,
    rawText: string,
    translation: string
  ): ParsedScriptureResult | null {
    // --- PATTERN 1: Standard Colon notation (e.g. "3:16", "13:4-7", "13:4 to 7") ---
    const colonPattern = /^[:\s]*(\d+)\s*:\s*(\d+)(?:\s*(?:-|to|through)\s*(\d+))?/i;
    const colonMatch = colonPattern.exec(afterBook);

    if (colonMatch) {
      const chapter = parseInt(colonMatch[1], 10);
      const verseStart = parseInt(colonMatch[2], 10);
      const verseEnd = colonMatch[3] ? parseInt(colonMatch[3], 10) : undefined;

      const rawEvidence = rawText.slice(
        Math.max(0, bookMatchIndex),
        Math.min(rawText.length, bookMatchIndex + matchedBookText.length + colonMatch[0].length + 10)
      );

      return this.validateAndBuildResult(
        canonBook,
        chapter,
        verseStart,
        verseEnd,
        rawEvidence,
        translation,
        0.95,
        { hasCue: true, needsReview: false }
      );
    }

    // --- PATTERN 2: Explicit Spoken format (e.g. "chapter 3 verse 16", "13 verses 4 to 7", "chapter 1 verses 1-3") ---
    const spokenPattern = /^(?:chapter\s+)?(\d+)[,\s]*(?:verses?|v\.?)\s*(\d+)(?:\s*(?:-|to|through|and)\s*(\d+))?/i;
    const spokenMatch = spokenPattern.exec(afterBook);

    if (spokenMatch) {
      const chapter = parseInt(spokenMatch[1], 10);
      const verseStart = parseInt(spokenMatch[2], 10);
      const verseEnd = spokenMatch[3] ? parseInt(spokenMatch[3], 10) : undefined;

      const rawEvidence = rawText.slice(
        Math.max(0, bookMatchIndex),
        Math.min(rawText.length, bookMatchIndex + matchedBookText.length + spokenMatch[0].length + 10)
      );

      return this.validateAndBuildResult(
        canonBook,
        chapter,
        verseStart,
        verseEnd,
        rawEvidence,
        translation,
        0.92,
        { hasCue: true, needsReview: false }
      );
    }

    // --- PATTERN 3: Spoken two-number sequence (e.g. "John 3 16", "Romans 8 28") ---
    const twoNumberPattern = /^(?:chapter\s+)?(\d+)\s+(\d+)(?:\s*(?:-|to|through)\s*(\d+))?/i;
    const twoNumberMatch = twoNumberPattern.exec(afterBook);

    if (twoNumberMatch) {
      const chapter = parseInt(twoNumberMatch[1], 10);
      const verseStart = parseInt(twoNumberMatch[2], 10);
      const verseEnd = twoNumberMatch[3] ? parseInt(twoNumberMatch[3], 10) : undefined;

      const hasWordCue = /chapter/i.test(twoNumberMatch[0]);
      const hasCue = hasPrecedingCue || hasWordCue;

      // Check for non-scriptural unit words following the numbers (e.g. "10 2 weeks ago")
      const remainingAfterNumbers = afterBook.slice(twoNumberMatch[0].length);
      if (NON_SCRIPTURE_UNITS_REGEX.test(remainingAfterNumbers)) {
        return null;
      }

      const rawEvidence = rawText.slice(
        Math.max(0, bookMatchIndex),
        Math.min(rawText.length, bookMatchIndex + matchedBookText.length + twoNumberMatch[0].length + 10)
      );

      // Cue-less matches receive lower confidence and needsReview flag
      const confidence = hasCue ? 0.90 : 0.75;
      const needsReview = !hasCue;

      return this.validateAndBuildResult(
        canonBook,
        chapter,
        verseStart,
        verseEnd,
        rawEvidence,
        translation,
        confidence,
        { hasCue, needsReview }
      );
    }

    // --- PATTERN 4: Single Number / Whole Chapter mention (e.g. "Psalm 23", "John chapter 3", "turn to Mark 10") ---
    const chapterOnlyPattern = /^(?:chapter\s+)?(\d+)(?!\s*[:\d])/i;
    const chapterMatch = chapterOnlyPattern.exec(afterBook);

    if (chapterMatch) {
      const chapter = parseInt(chapterMatch[1], 10);
      const remaining = afterBook.slice(chapterMatch[0].length);

      // Guard: Check for non-scriptural units (e.g. "mark 10 times", "job 2 weeks ago")
      if (NON_SCRIPTURE_UNITS_REGEX.test(remaining)) {
        return null; // Definitely not a scripture reference!
      }

      const hasWordCue = /chapter/i.test(chapterMatch[0]);
      const hasCue = hasPrecedingCue || hasWordCue;

      const rawEvidence = rawText.slice(
        Math.max(0, bookMatchIndex),
        Math.min(rawText.length, bookMatchIndex + matchedBookText.length + chapterMatch[0].length + 5)
      );

      // Special case: Psalms in worship context (e.g. "Psalm 23" covers entire psalm)
      if (canonBook.id === 'PSA') {
        const maxVerses = CanonValidator.getMaxVerses(canonBook.name, chapter) || 1;
        const confidence = hasCue ? 0.92 : 0.85;
        return this.validateAndBuildResult(
          canonBook,
          chapter,
          1,
          maxVerses,
          rawEvidence,
          translation,
          confidence,
          { hasCue, needsReview: !hasCue, isWholeChapter: false }
        );
      }

      // Non-Psalm books: Whole Chapter results must be labeled as "whole chapter, no verse given"
      // and NOT silently default to verse 1!
      const maxVerses = CanonValidator.getMaxVerses(canonBook.name, chapter) || 1;

      // If there is NO cue at all (e.g. bare "mark 10"), lower confidence and flag needsReview
      const confidence = hasCue ? 0.88 : 0.45;
      const needsReview = !hasCue;

      return this.validateAndBuildResult(
        canonBook,
        chapter,
        1,
        maxVerses,
        rawEvidence,
        translation,
        confidence,
        {
          hasCue,
          needsReview,
          isWholeChapter: true,
          label: 'whole chapter, no verse given'
        }
      );
    }

    return null;
  }

  private static validateAndBuildResult(
    canonBook: CanonBook,
    chapter: number,
    verseStart: number,
    verseEnd: number | undefined,
    rawEvidence: string,
    translation: string,
    confidence: number,
    options: {
      hasCue?: boolean;
      needsReview?: boolean;
      isWholeChapter?: boolean;
      label?: string;
    } = {}
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
        detectedBook: canonBook,
        needsReview: true
      };
    }

    const reference: ScriptureReference = {
      book: canonBook.name,
      chapter,
      verseStart,
      verseEnd,
      translation,
      rawSpokenText: rawEvidence.trim(),
      label: options.label,
      isWholeChapter: options.isWholeChapter,
      needsReview: options.needsReview
    };

    return {
      hasReference: true,
      reference,
      rawEvidence: rawEvidence.trim(),
      confidence,
      isCanonValid: true,
      detectedBook: canonBook,
      hasCue: options.hasCue ?? true,
      needsReview: options.needsReview ?? false,
      isWholeChapter: options.isWholeChapter ?? false
    };
  }
}
