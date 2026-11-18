import { CANON_BOOKS, CanonBook } from '@pulpit-ai/shared-types';

export type HotwordTier = 'low' | 'high' | 'liturgical_cue';

export interface CalibratedHotword {
  phrase: string;
  score: number;
  tier: HotwordTier;
}

/**
 * Short or polysemous canonical books that collide with common conversational English
 * (e.g. "good job", "acts of kindness", "mark my words").
 * Receive conservative +1.2 boosting so Aho-Corasick does not cause false-positive overrides.
 */
const LOW_TIER_BOOK_IDS = new Set([
  'JOB',
  'MRK',
  'ACT',
  'NUM',
  'RUT',
  'AMO',
  'TIT',
  'JHN',
  'LUK',
  'JUD',
  'JAS',
  'EZR',
  'JOL',
  '1KI',
  '2KI',
  'JDG',
  '1PE',
  '2PE',
  '1JN',
  '2JN',
  '3JN'
]);

/**
 * Liturgical navigational cue terms that precede or bridge spoken Scripture citations.
 */
const LITURGICAL_CUES: Array<{ phrase: string; score: number }> = [
  { phrase: 'chapter', score: 1.8 },
  { phrase: 'verse', score: 1.8 },
  { phrase: 'verses', score: 1.8 },
  { phrase: 'psalm', score: 2.0 },
  { phrase: 'psalms', score: 2.0 },
  { phrase: 'scripture', score: 1.8 },
  { phrase: 'testament', score: 1.6 },
  { phrase: 'gospel', score: 1.6 },
  { phrase: 'epistle', score: 1.8 }
];

export const HOTWORD_SCORES = {
  LOW_BOOK: 1.2,
  HIGH_BOOK: 3.0,
  LITURGICAL_CUE: 1.8
} as const;

/**
 * Generates the calibrated 3-tier Aho-Corasick hotword table for sherpa-onnx Zipformer decoding.
 */
export function generateLiturgicalHotwords(): CalibratedHotword[] {
  const entries: CalibratedHotword[] = [];
  const seen = new Set<string>();

  for (const book of CANON_BOOKS) {
    const isLow = LOW_TIER_BOOK_IDS.has(book.id);
    const tier: HotwordTier = isLow ? 'low' : 'high';
    const score = isLow ? HOTWORD_SCORES.LOW_BOOK : HOTWORD_SCORES.HIGH_BOOK;

    const canonicalKey = book.name.toLowerCase();
    if (!seen.has(canonicalKey)) {
      seen.add(canonicalKey);
      entries.push({ phrase: book.name, score, tier });
    }
  }

  for (const cue of LITURGICAL_CUES) {
    const key = cue.phrase.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      entries.push({ phrase: cue.phrase, score: cue.score, tier: 'liturgical_cue' });
    }
  }

  return entries;
}

/**
 * Formats calibrated hotwords into sherpa-onnx's `hotwords.txt` format (`PHRASE :SCORE`).
 */
export function formatSherpaHotwordsFile(hotwords: CalibratedHotword[] = generateLiturgicalHotwords()): string {
  return hotwords.map((h) => `${h.phrase} :${h.score.toFixed(1)}`).join('\n') + '\n';
}

// Pre-compiled longest-first lookup list for fast early-cue book detection on partial windows
const SORTED_BOOK_PATTERNS: Array<{ book: CanonBook; regex: RegExp }> = CANON_BOOKS
  .flatMap((book) => {
    const names = [book.name, ...book.aliases.filter((a) => a.length >= 4)];
    return Array.from(new Set(names.map((n) => n.toLowerCase()))).map((alias) => ({
      book,
      alias,
      regex: new RegExp(`\\b${alias.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i')
    }));
  })
  .sort((a, b) => b.alias.length - a.alias.length)
  .map(({ book, regex }) => ({ book, regex }));

/**
 * Runs an early-cue matcher over an active streaming sliding window to identify
 * a canonical book name before the pastor finishes speaking chapter & verse numbers.
 */
export function detectEarlyCanonBookCue(windowText: string): CanonBook | null {
  if (!windowText || !windowText.trim()) return null;
  for (const entry of SORTED_BOOK_PATTERNS) {
    if (entry.regex.test(windowText)) {
      return entry.book;
    }
  }
  return null;
}
