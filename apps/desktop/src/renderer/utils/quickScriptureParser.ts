import { CANON_BOOKS, CanonBook } from '@pulpit-ai/shared-types';

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  if (Math.abs(a.length - b.length) > 3) return 99;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

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

  // Fallback fuzzy recovery for typographical/phonetic misspellings (e.g. "philipains 4:6")
  if (!matchedBook) {
    const firstWordMatch = text.match(/^([1-3]?\s*[a-z]+)(.*)$/i);
    if (firstWordMatch) {
      const candidateWord = firstWordMatch[1].trim();
      const rest = firstWordMatch[2].trim();
      if (candidateWord.length >= 4) {
        let bestDist = 3;
        let bestEntry: AliasEntry | null = null;
        for (const entry of ALL_ALIASES) {
          if (Math.abs(entry.alias.length - candidateWord.length) > 2) continue;
          const dist = levenshteinDistance(candidateWord, entry.alias);
          if (dist < bestDist) {
            bestDist = dist;
            bestEntry = entry;
          }
        }
        if (bestEntry && bestDist <= 2) {
          matchedBook = bestEntry.book;
          remainingText = rest;
        }
      }
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

/**
 * Finds Bible books matching a partial prefix or alias for EasyWorship-style live autocomplete.
 */
export function findMatchingCanonBooks(query: string, limit = 6): CanonBook[] {
  const cleaned = query.trim().toLowerCase().replace(/^([1-3])([a-z])/i, '$1 $2');
  if (!cleaned) return [];

  const exactStarts: CanonBook[] = [];
  const aliasStarts: CanonBook[] = [];
  const contains: CanonBook[] = [];
  const fuzzy: CanonBook[] = [];
  const seenIds = new Set<string>();

  for (const book of CANON_BOOKS) {
    const lowerName = book.name.toLowerCase();
    if (lowerName.startsWith(cleaned)) {
      if (!seenIds.has(book.id)) {
        seenIds.add(book.id);
        exactStarts.push(book);
      }
    } else if (book.aliases.some((a) => a.toLowerCase().startsWith(cleaned))) {
      if (!seenIds.has(book.id)) {
        seenIds.add(book.id);
        aliasStarts.push(book);
      }
    } else if (
      lowerName.includes(cleaned) ||
      book.aliases.some((a) => a.toLowerCase().includes(cleaned))
    ) {
      if (!seenIds.has(book.id)) {
        seenIds.add(book.id);
        contains.push(book);
      }
    } else if (cleaned.length >= 4) {
      const minDistance = Math.min(
        levenshteinDistance(cleaned, lowerName),
        ...book.aliases.map((a) => levenshteinDistance(cleaned, a.toLowerCase()))
      );
      if (minDistance <= 2 && !seenIds.has(book.id)) {
        seenIds.add(book.id);
        fuzzy.push(book);
      }
    }
  }

  return [...exactStarts, ...aliasStarts, ...contains, ...fuzzy].slice(0, limit);
}

export interface EasyWorshipCompletionState {
  stage: 'book' | 'chapter' | 'verse';
  matchedBook: CanonBook | null;
  ghostText: string;
  suggestions: CanonBook[];
}

/**
 * Inspects the current input string to power EasyWorship-style progressive
 * Book -> Chapter -> Verse inline completion and dropdown suggestions.
 */
export function getEasyWorshipCompletion(input: string): EasyWorshipCompletionState {
  if (!input || !input.trim()) {
    return { stage: 'book', matchedBook: null, ghostText: '', suggestions: [] };
  }

  const trimmedStart = input.trimStart();

  // Check if a full canonical book + space is already locked in
  for (const entry of ALL_ALIASES) {
    const pattern = new RegExp(
      `^${entry.alias.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s+(.*)$`,
      'i'
    );
    const match = trimmedStart.match(pattern);
    if (match) {
      const rest = match[1] || '';
      if (/^\d+\s*[:\s]\s*\d*/.test(rest)) {
        return { stage: 'verse', matchedBook: entry.book, ghostText: '', suggestions: [] };
      }
      return { stage: 'chapter', matchedBook: entry.book, ghostText: '', suggestions: [] };
    }
  }

  // User is still typing the book name (handle lone "1", "2", "3" cleanly)
  const suggestions = findMatchingCanonBooks(trimmedStart, 6);
  const topBook = suggestions[0] || null;
  let ghostText = '';

  if (topBook && topBook.name.toLowerCase().startsWith(trimmedStart.toLowerCase())) {
    ghostText = topBook.name.slice(trimmedStart.length);
  }

  return {
    stage: 'book',
    matchedBook: topBook,
    ghostText,
    suggestions
  };
}

/**
 * Applies EasyWorship-style Spacebar / Tab progressive stepping:
 * 1. "1 th" + Space -> "1 Thessalonians "
 * 2. "rom" + Space  -> "Romans "
 * 3. "Romans 8" + Space -> "Romans 8:"
 * Returns null if normal spacebar typing should proceed.
 */
export function applyEasyWorshipSpaceStep(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Allow typing "1 ", "2 ", "3 " naturally for numbered books
  if (/^[1-3]$/.test(trimmed)) {
    return null;
  }

  // Case A: Book + valid chapter number -> append colon for verse (e.g. "Romans 8" -> "Romans 8:")
  const chapterStepMatch = trimmed.match(/^(.+?)\s+(\d+)$/);
  if (chapterStepMatch) {
    const bookPart = chapterStepMatch[1].trim();
    const chapterNum = parseInt(chapterStepMatch[2], 10);
    const matchedBooks = findMatchingCanonBooks(bookPart, 1);
    const book = matchedBooks[0];
    if (book && chapterNum >= 1 && chapterNum <= book.totalChapters) {
      return `${book.name} ${chapterNum}:`;
    }
  }

  // Case B: Already has chapter:verse -> allow space for range or leave alone
  if (/\d+[:\s]\d+/.test(trimmed)) {
    return null;
  }

  // Case C: Partial or alias book name -> lock in canonical book name + trailing space
  // Skip if input already ends with space after an exact book name
  if (input.endsWith(' ')) {
    return null;
  }

  const matchedBooks = findMatchingCanonBooks(trimmed, 1);
  if (matchedBooks.length > 0) {
    return `${matchedBooks[0].name} `;
  }

  return null;
}

/**
 * Parses a pasted list of pastor-supplied sermon passages separated by commas, semicolons, or newlines.
 */
export function parseBatchScriptureReferences(rawText: string): ParsedQuickScripture[] {
  if (!rawText || !rawText.trim()) return [];

  const tokens = rawText
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const parsedList: ParsedQuickScripture[] = [];

  for (const token of tokens) {
    const parsed = parseQuickScripture(token);
    if (parsed.isValid && parsed.referenceString && !seen.has(parsed.referenceString)) {
      seen.add(parsed.referenceString);
      parsedList.push(parsed);
    }
  }

  return parsedList;
}
