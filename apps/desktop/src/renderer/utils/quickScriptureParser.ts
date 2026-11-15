import { CANON_BOOKS, CanonBook } from '../data/canonBooks.js';

export interface ParsedQuickScripture {
  isValid: boolean;
  book?: CanonBook;
  bookName?: string;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
  referenceString?: string;
  error?: string;
}

// Pre-sort all book aliases by length descending so multi-word books match first (e.g. '1 Corinthians' before 'Corinthians')
interface AliasEntry {
  alias: string;
  book: CanonBook;
}

const ALL_ALIASES: AliasEntry[] = [];
for (const book of CANON_BOOKS) {
  ALL_ALIASES.push({ alias: book.name.toLowerCase(), book });
  for (const a of book.aliases) {
    ALL_ALIASES.push({ alias: a.toLowerCase(), book });
  }
}
ALL_ALIASES.sort((a, b) => b.alias.length - a.alias.length);

/**
 * Parses user input for rapid scripture lookups.
 * Supports:
 * - "Romans 10:1"
 * - "romans 10 1"
 * - "rom 10:1"
 * - "rom 10 1"
 * - "john 3:16"
 * - "jn 3 16"
 * - "ps 23:1"
 * - "psalm 23 1"
 * - "1 cor 13 4-8"
 * - "1cor 13:4-8"
 * - "2 tim 1 7"
 * - "gen 1 1-3"
 * - "genesis 1:1"
 */
export function parseQuickScripture(input: string): ParsedQuickScripture {
  if (!input || !input.trim()) {
    return { isValid: false };
  }

  // 1. Clean and normalize input
  let text = input.trim().toLowerCase();

  // Strip leading speech fluff if operator pasted or typed spoken phrases
  text = text.replace(/^(?:turn\s+(?:to|with\s+me\s+to)|open\s+(?:to|our\s+bibles\s+to)|read\s+from|book\s+of)\s+/i, '');

  // Normalize prefixes like "1cor" -> "1 cor", "2tim" -> "2 tim", "1jn" -> "1 jn"
  text = text.replace(/^([1-3])([a-z])/i, '$1 $2');

  // 2. Find matching CanonBook
  let matchedBook: CanonBook | null = null;
  let remainingText = '';

  for (const entry of ALL_ALIASES) {
    // Look for alias at start of text followed by whitespace, digit, or colon
    const pattern = new RegExp(`^${entry.alias.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(?:\\s+|(?=\\d))`, 'i');
    const match = text.match(pattern);
    if (match) {
      matchedBook = entry.book;
      remainingText = text.substring(match[0].length).trim();
      break;
    }
  }

  if (!matchedBook) {
    return { isValid: false, error: 'Book not recognized' };
  }

  // 3. Extract numbers from remaining text
  // Supports: "10:1", "10 1", "10:1-5", "10 1-5", "10 1 5", "10:1 to 5"
  const numbersMatch = remainingText.match(/^(\d+)(?:[:\s]+(\d+)(?:[-–\s]+(?:to\s+)?(\d+))?)?/i);
  if (!numbersMatch || !numbersMatch[1]) {
    return {
      isValid: false,
      book: matchedBook,
      bookName: matchedBook.name,
      error: `Please enter chapter for ${matchedBook.name}`
    };
  }

  const chapter = parseInt(numbersMatch[1], 10);
  if (isNaN(chapter) || chapter < 1 || chapter > matchedBook.totalChapters) {
    return {
      isValid: false,
      book: matchedBook,
      bookName: matchedBook.name,
      error: `${matchedBook.name} has only ${matchedBook.totalChapters} chapters`
    };
  }

  const verseStart = numbersMatch[2] ? parseInt(numbersMatch[2], 10) : 1;
  const maxVerses = matchedBook.versesPerChapter[chapter - 1] || 1;

  if (isNaN(verseStart) || verseStart < 1 || verseStart > maxVerses) {
    return {
      isValid: false,
      book: matchedBook,
      bookName: matchedBook.name,
      chapter,
      error: `${matchedBook.name} ${chapter} has only ${maxVerses} verses`
    };
  }

  let verseEnd: number | undefined = undefined;
  if (numbersMatch[3]) {
    const end = parseInt(numbersMatch[3], 10);
    if (!isNaN(end) && end >= verseStart && end <= maxVerses) {
      verseEnd = end;
    }
  }

  const referenceString =
    verseEnd && verseEnd > verseStart
      ? `${matchedBook.name} ${chapter}:${verseStart}-${verseEnd}`
      : `${matchedBook.name} ${chapter}:${verseStart}`;

  return {
    isValid: true,
    book: matchedBook,
    bookName: matchedBook.name,
    chapter,
    verseStart,
    verseEnd,
    referenceString
  };
}
