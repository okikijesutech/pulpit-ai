/**
 * Transcript Normalizer for Speech Recognition output.
 * Formats spoken numbers and compounds for display and tokenization only.
 * Compound spoken numbers (e.g. "twenty-three", "one hundred and nineteen") are resolved
 * to proper integers ("23", "119") rather than broken single-digit words ("20 3", "1 100 19").
 * 
 * NOTE: For deterministic Scripture reference parsing and canon validation, ALWAYS pass
 * rawText to scriptureGenerator.processTranscript.
 */

export interface NormalizedTranscript {
  rawText: string;
  normalizedText: string;
  tokens: string[];
}

export class TranscriptNormalizer {
  private static readonly ONES: Record<string, number> = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19
  };

  private static readonly TENS: Record<string, number> = {
    twenty: 20,
    thirty: 30,
    forty: 40,
    fifty: 50,
    sixty: 60,
    seventy: 70,
    eighty: 80,
    ninety: 90
  };

  private static readonly ORDINALS: Record<string, number> = {
    first: 1,
    '1st': 1,
    second: 2,
    '2nd': 2,
    third: 3,
    '3rd': 3
  };

  private static parseCompoundNumber(phrase: string): number | null {
    const cleaned = phrase.trim().toLowerCase().replace(/-/g, ' ');
    const parts = cleaned.split(/\s+/).filter((p) => p.length > 0 && p !== 'and');
    if (parts.length === 0) return null;

    let total = 0;
    let currentGroup = 0;

    for (const part of parts) {
      if (/^\d+$/.test(part)) {
        currentGroup += parseInt(part, 10);
      } else if (TranscriptNormalizer.ONES[part] !== undefined) {
        currentGroup += TranscriptNormalizer.ONES[part];
      } else if (TranscriptNormalizer.TENS[part] !== undefined) {
        currentGroup += TranscriptNormalizer.TENS[part];
      } else if (TranscriptNormalizer.ORDINALS[part] !== undefined) {
        currentGroup += TranscriptNormalizer.ORDINALS[part];
      } else if (part === 'hundred') {
        currentGroup = (currentGroup === 0 ? 1 : currentGroup) * 100;
      } else {
        return null;
      }
    }

    return total + currentGroup;
  }

  /**
   * Normalizes raw spoken transcript text for display and token extraction.
   * Handles compounds (tens + ones, hundreds) so numbers are not fragmented.
   */
  public normalize(rawText: string): NormalizedTranscript {
    if (!rawText || rawText.trim().length === 0) {
      return { rawText: '', normalizedText: '', tokens: [] };
    }

    let text = rawText.toLowerCase().trim();

    // Clean punctuation to spaces while preserving hyphenated compound numbers
    text = text.replace(/[,.:;?!'"_()\[\]{}]/g, ' ');

    // Normalize multiple spaces
    text = text.replace(/\s+/g, ' ');

    // 1. Replace hyphenated tens + ones: "twenty-three" -> "23"
    text = text.replace(
      /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)-(one|two|three|four|five|six|seven|eight|nine)\b/gi,
      (match) => {
        const val = TranscriptNormalizer.parseCompoundNumber(match);
        return val !== null ? String(val) : match;
      }
    );

    // 2. Replace spaced tens + ones: "twenty three" -> "23"
    text = text.replace(
      /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(one|two|three|four|five|six|seven|eight|nine)\b/gi,
      (match) => {
        const val = TranscriptNormalizer.parseCompoundNumber(match);
        return val !== null ? String(val) : match;
      }
    );

    // 3. Replace hundreds compound: "one hundred and nineteen" -> "119", "one hundred" -> "100"
    text = text.replace(
      /\b(one|two|three|four|five|six|seven|eight|nine)\s+hundred(?:\s+(?:and\s+)?(\d+|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|one|two|three|four|five|six|seven|eight|nine))?\b/gi,
      (match) => {
        const val = TranscriptNormalizer.parseCompoundNumber(match);
        return val !== null ? String(val) : match;
      }
    );

    // 4. Replace standalone numbers and ordinals
    const allWords = [
      ...Object.keys(TranscriptNormalizer.ONES),
      ...Object.keys(TranscriptNormalizer.TENS),
      ...Object.keys(TranscriptNormalizer.ORDINALS)
    ];
    allWords.sort((a, b) => b.length - a.length);

    for (const w of allWords) {
      const val =
        TranscriptNormalizer.ONES[w] ??
        TranscriptNormalizer.TENS[w] ??
        TranscriptNormalizer.ORDINALS[w];
      text = text.replace(new RegExp(`\\b${w}\\b`, 'gi'), String(val));
    }

    // Final space normalization
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    const tokens = normalizedText.split(' ').filter((w) => w.length > 0);

    return {
      rawText,
      normalizedText,
      tokens
    };
  }
}
