/**
 * Canon and bounds validator for Scripture references.
 * Strictly checks existence against the 66-book Protestant canon and verifies
 * chapter and verse numbers against exact historical chapter/verse limits.
 */

import { CanonBook, CANON_BOOKS, findCanonBook } from './CanonData.js';

export interface CanonValidationResult {
  isValid: boolean;
  book?: CanonBook;
  error?: string;
  normalizedBookName?: string;
}

export class CanonValidator {
  /**
   * Validates whether a book name or alias belongs to the 66-book Protestant canon.
   */
  public static validateBook(bookName: string): CanonValidationResult {
    if (!bookName || bookName.trim().length === 0) {
      return { isValid: false, error: 'Empty or undefined book name' };
    }

    const book = findCanonBook(bookName);
    if (!book) {
      return {
        isValid: false,
        error: `Book "${bookName}" is not recognized in the 66-book canon`
      };
    }

    return {
      isValid: true,
      book,
      normalizedBookName: book.name
    };
  }

  /**
   * Strictly validates a complete Scripture reference (book, chapter, verseStart, verseEnd).
   * Verifies that chapter and verse numbers are within canonical bounds.
   */
  public static validateReference(
    bookName: string,
    chapter: number,
    verseStart: number,
    verseEnd?: number
  ): CanonValidationResult {
    const bookRes = this.validateBook(bookName);
    if (!bookRes.isValid || !bookRes.book) {
      return bookRes;
    }

    const book = bookRes.book;

    // Validate chapter
    if (!Number.isInteger(chapter) || chapter < 1) {
      return {
        isValid: false,
        book,
        error: `Invalid chapter number ${chapter} for book "${book.name}". Chapter must be a positive integer.`
      };
    }

    if (chapter > book.totalChapters) {
      return {
        isValid: false,
        book,
        error: `Chapter ${chapter} is out of bounds for "${book.name}" (total chapters: ${book.totalChapters})`
      };
    }

    const maxVerses = book.versesPerChapter[chapter - 1];

    // Validate verseStart
    if (!Number.isInteger(verseStart) || verseStart < 1) {
      return {
        isValid: false,
        book,
        error: `Invalid start verse ${verseStart} for "${book.name} ${chapter}". Verse must be a positive integer.`
      };
    }

    if (verseStart > maxVerses) {
      return {
        isValid: false,
        book,
        error: `Verse ${verseStart} is out of bounds for "${book.name} ${chapter}" (maximum verses: ${maxVerses})`
      };
    }

    // Validate verseEnd if provided
    if (verseEnd !== undefined && verseEnd !== null) {
      if (!Number.isInteger(verseEnd) || verseEnd < 1) {
        return {
          isValid: false,
          book,
          error: `Invalid end verse ${verseEnd} for "${book.name} ${chapter}". Verse must be a positive integer.`
        };
      }

      if (verseEnd < verseStart) {
        return {
          isValid: false,
          book,
          error: `Invalid verse range ${verseStart}-${verseEnd}: end verse cannot be less than start verse`
        };
      }

      if (verseEnd > maxVerses) {
        return {
          isValid: false,
          book,
          error: `End verse ${verseEnd} is out of bounds for "${book.name} ${chapter}" (maximum verses: ${maxVerses})`
        };
      }
    }

    return {
      isValid: true,
      book,
      normalizedBookName: book.name
    };
  }

  /**
   * Returns maximum verses for a book and chapter.
   */
  public static getMaxVerses(bookName: string, chapter: number): number | null {
    const book = findCanonBook(bookName);
    if (!book || chapter < 1 || chapter > book.totalChapters) {
      return null;
    }
    return book.versesPerChapter[chapter - 1];
  }
}
