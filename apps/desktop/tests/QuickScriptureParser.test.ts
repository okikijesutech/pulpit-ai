import { describe, it, expect } from 'vitest';
import { parseQuickScripture } from '../src/renderer/utils/quickScriptureParser.js';

describe('QuickScriptureParser (Instant Church Verse Launcher)', () => {
  it('parses standard colon-formatted references (Romans 10:1, John 3:16)', () => {
    const res1 = parseQuickScripture('Romans 10:1');
    expect(res1.isValid).toBe(true);
    expect(res1.bookName).toBe('Romans');
    expect(res1.chapter).toBe(10);
    expect(res1.verseStart).toBe(1);
    expect(res1.referenceString).toBe('Romans 10:1');

    const res2 = parseQuickScripture('John 3:16');
    expect(res2.isValid).toBe(true);
    expect(res2.bookName).toBe('John');
    expect(res2.chapter).toBe(3);
    expect(res2.verseStart).toBe(16);
    expect(res2.referenceString).toBe('John 3:16');
  });

  it('parses space-delimited typing without colon (rom 10 1, jn 3 16, ps 23 1)', () => {
    const res1 = parseQuickScripture('rom 10 1');
    expect(res1.isValid).toBe(true);
    expect(res1.bookName).toBe('Romans');
    expect(res1.chapter).toBe(10);
    expect(res1.verseStart).toBe(1);

    const res2 = parseQuickScripture('jn 3 16');
    expect(res2.isValid).toBe(true);
    expect(res2.bookName).toBe('John');
    expect(res2.chapter).toBe(3);
    expect(res2.verseStart).toBe(16);

    const res3 = parseQuickScripture('ps 23 1');
    expect(res3.isValid).toBe(true);
    expect(res3.bookName).toBe('Psalms');
    expect(res3.chapter).toBe(23);
    expect(res3.verseStart).toBe(1);
  });

  it('parses numbered epistle prefixes (1cor 13:4-8, 2tim 1 7)', () => {
    const res1 = parseQuickScripture('1cor 13:4-8');
    expect(res1.isValid).toBe(true);
    expect(res1.bookName).toBe('1 Corinthians');
    expect(res1.chapter).toBe(13);
    expect(res1.verseStart).toBe(4);
    expect(res1.verseEnd).toBe(8);
    expect(res1.referenceString).toBe('1 Corinthians 13:4-8');

    const res2 = parseQuickScripture('2tim 1 7');
    expect(res2.isValid).toBe(true);
    expect(res2.bookName).toBe('2 Timothy');
    expect(res2.chapter).toBe(1);
    expect(res2.verseStart).toBe(7);
  });

  it('strips spoken preacher fluff (open to, turn to, book of)', () => {
    const res = parseQuickScripture('open our bibles to romans 10 1');
    expect(res.isValid).toBe(true);
    expect(res.bookName).toBe('Romans');
    expect(res.chapter).toBe(10);
    expect(res.verseStart).toBe(1);
  });

  it('validates canonical chapter and verse bounds', () => {
    // Romans has 16 chapters
    const invalidChapter = parseQuickScripture('Romans 50 1');
    expect(invalidChapter.isValid).toBe(false);
    expect(invalidChapter.error).toContain('chapters');

    // Romans 10 has 21 verses
    const invalidVerse = parseQuickScripture('Romans 10 99');
    expect(invalidVerse.isValid).toBe(false);
    expect(invalidVerse.error).toContain('verses');
  });
});
