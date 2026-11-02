/**
 * Transcript Normalizer for Speech Recognition output.
 * Normalizes spoken numbers and book prefixes while preserving the original raw transcript for human review.
 */

export interface NormalizedTranscript {
  rawText: string;
  normalizedText: string;
  tokens: string[];
}

export class TranscriptNormalizer {
  private static readonly SPOKEN_NUMBERS: Record<string, string> = {
    zero: '0',
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    ten: '10',
    eleven: '11',
    twelve: '12',
    thirteen: '13',
    fourteen: '14',
    fifteen: '15',
    sixteen: '16',
    seventeen: '17',
    eighteen: '18',
    nineteen: '19',
    twenty: '20',
    thirty: '30',
    forty: '40',
    fifty: '50',
    sixty: '60',
    seventy: '70',
    eighty: '80',
    ninety: '90',
    hundred: '100',
    first: '1',
    second: '2',
    third: '3',
    '1st': '1',
    '2nd': '2',
    '3rd': '3'
  };

  /**
   * Normalizes raw spoken transcript text.
   */
  public normalize(rawText: string): NormalizedTranscript {
    if (!rawText || rawText.trim().length === 0) {
      return { rawText: '', normalizedText: '', tokens: [] };
    }

    let text = rawText.toLowerCase().trim();

    // Replace punctuation with spaces
    text = text.replace(/[,.:;?!'"\-_()\[\]{}]/g, ' ');

    // Normalize multiple spaces
    text = text.replace(/\s+/g, ' ');

    const words = text.split(' ');
    const normalizedWords = words.map((w) => TranscriptNormalizer.SPOKEN_NUMBERS[w] ?? w);

    const normalizedText = normalizedWords.join(' ');
    const tokens = normalizedWords.filter((w) => w.length > 0);

    return {
      rawText,
      normalizedText,
      tokens
    };
  }
}
