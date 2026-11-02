import { describe, it, expect } from 'vitest';
import { CanonValidator, findCanonBook, CANON_BOOKS } from '../src/index.js';

describe('CanonValidator', () => {
  it('contains exactly 66 books in the Protestant canon', () => {
    expect(CANON_BOOKS.length).toBe(66);
    const otBooks = CANON_BOOKS.filter(b => b.testament === 'OT');
    const ntBooks = CANON_BOOKS.filter(b => b.testament === 'NT');
    expect(otBooks.length).toBe(39);
    expect(ntBooks.length).toBe(27);
  });

  it('validates recognized canon books and aliases', () => {
    expect(CanonValidator.validateBook('Genesis').isValid).toBe(true);
    expect(CanonValidator.validateBook('gen').isValid).toBe(true);
    expect(CanonValidator.validateBook('1 Corinthians').isValid).toBe(true);
    expect(CanonValidator.validateBook('first corinthians').isValid).toBe(true);
    expect(CanonValidator.validateBook('psalms').isValid).toBe(true);
    expect(CanonValidator.validateBook('psalm').isValid).toBe(true);
    expect(CanonValidator.validateBook('Revelation').isValid).toBe(true);
    expect(CanonValidator.validateBook('revelations').isValid).toBe(true);
  });

  it('rejects uncanonical or unknown book names', () => {
    expect(CanonValidator.validateBook('Tobit').isValid).toBe(false);
    expect(CanonValidator.validateBook('Gospel of Thomas').isValid).toBe(false);
    expect(CanonValidator.validateBook('UnknownBook').isValid).toBe(false);
    expect(CanonValidator.validateBook('').isValid).toBe(false);
  });

  it('validates correct reference within exact bounds', () => {
    // John 3:16
    const res1 = CanonValidator.validateReference('John', 3, 16);
    expect(res1.isValid).toBe(true);
    expect(res1.normalizedBookName).toBe('John');

    // 1 Corinthians 13:4-7
    const res2 = CanonValidator.validateReference('1 Corinthians', 13, 4, 7);
    expect(res2.isValid).toBe(true);

    // Psalm 119:176 (longest psalm)
    const res3 = CanonValidator.validateReference('Psalms', 119, 176);
    expect(res3.isValid).toBe(true);
  });

  it('rejects out-of-bounds chapter', () => {
    // John only has 21 chapters
    const res = CanonValidator.validateReference('John', 22, 1);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Chapter 22 is out of bounds for "John"');
  });

  it('rejects out-of-bounds verseStart', () => {
    // John 3 has 36 verses
    const res = CanonValidator.validateReference('John', 3, 50);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Verse 50 is out of bounds for "John 3"');
  });

  it('rejects out-of-bounds verseEnd', () => {
    // 1 Corinthians 13 has 13 verses
    const res = CanonValidator.validateReference('1 Corinthians', 13, 1, 20);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('End verse 20 is out of bounds for "1 Corinthians 13"');
  });

  it('rejects inverted verse ranges where verseEnd < verseStart', () => {
    const res = CanonValidator.validateReference('John', 3, 16, 10);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('end verse cannot be less than start verse');
  });
});
