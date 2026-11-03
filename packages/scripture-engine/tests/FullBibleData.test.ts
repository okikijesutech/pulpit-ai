import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ScriptureDatabase,
  CANON_BOOKS,
  getBibleDataFilePath,
  loadFullBiblePackages
} from '../src/index.js';

describe('FullBibleData (PR 4 - Full Bible Data & Integrity)', () => {
  let db: ScriptureDatabase;

  beforeEach(() => {
    db = new ScriptureDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('loads verified full WEB Bible package and validates every single book and chapter against CanonData', () => {
    const webPath = getBibleDataFilePath('web.json');
    db.loadPackageFromFile(webPath);

    const counts = db.getAllChapterVerseCounts('WEB');

    // Verify every book and chapter against CanonData specifications without hard-coding totals
    for (const book of CANON_BOOKS) {
      for (let ch = 1; ch <= book.totalChapters; ch++) {
        const expectedVerses = book.versesPerChapter[ch - 1];
        const actualVerses = counts.get(`${book.id}:${ch}`) || 0;
        expect(
          actualVerses,
          `Mismatch in WEB ${book.name} chapter ${ch}: expected ${expectedVerses}, got ${actualVerses}`
        ).toBe(expectedVerses);
      }

      // Out of bounds check: chapter beyond book maximum must be null
      const outOfBoundsCh = db.getPassage('WEB', book.name, book.totalChapters + 1, 1);
      expect(outOfBoundsCh).toBeNull();
    }
  });

  it('loads verified full KJV Bible package and validates every single book and chapter against CanonData', () => {
    const kjvPath = getBibleDataFilePath('kjv.json');
    db.loadPackageFromFile(kjvPath);

    const counts = db.getAllChapterVerseCounts('KJV');

    // Verify every book and chapter against CanonData specifications without hard-coding totals
    for (const book of CANON_BOOKS) {
      for (let ch = 1; ch <= book.totalChapters; ch++) {
        const expectedVerses = book.versesPerChapter[ch - 1];
        const actualVerses = counts.get(`${book.id}:${ch}`) || 0;
        expect(
          actualVerses,
          `Mismatch in KJV ${book.name} chapter ${ch}: expected ${expectedVerses}, got ${actualVerses}`
        ).toBe(expectedVerses);
      }

      // Out of bounds check: chapter beyond book maximum must be null
      const outOfBoundsCh = db.getPassage('KJV', book.name, book.totalChapters + 1, 1);
      expect(outOfBoundsCh).toBeNull();
    }
  });

  it('spot-checks Matthew 5:3 and Psalm 119:11 accurately for both WEB and KJV', () => {
    loadFullBiblePackages(db);

    // --- Matthew 5:3 Spot Check ---
    const mat53Web = db.getPassage('WEB', 'Matthew', 5, 3);
    expect(mat53Web).not.toBeNull();
    expect(mat53Web?.verses.length).toBe(1);
    expect(mat53Web?.fullText).toContain('Blessed are the poor in spirit');
    expect(mat53Web?.fullText).toContain('Kingdom of Heaven');

    const mat53Kjv = db.getPassage('KJV', 'Matthew', 5, 3);
    expect(mat53Kjv).not.toBeNull();
    expect(mat53Kjv?.verses.length).toBe(1);
    expect(mat53Kjv?.fullText).toContain('Blessed are the poor in spirit');
    expect(mat53Kjv?.fullText).toContain('kingdom of heaven');

    // --- Psalm 119:11 Spot Check ---
    const psa11911Web = db.getPassage('WEB', 'Psalms', 119, 11);
    expect(psa11911Web).not.toBeNull();
    expect(psa11911Web?.verses.length).toBe(1);
    expect(psa11911Web?.fullText).toBe('I have hidden your word in my heart, that I might not sin against you.');

    const psa11911Kjv = db.getPassage('KJV', 'Psalms', 119, 11);
    expect(psa11911Kjv).not.toBeNull();
    expect(psa11911Kjv?.verses.length).toBe(1);
    expect(psa11911Kjv?.fullText).toBe('Thy word have I hid in mine heart, that I might not sin against thee.');
  });

  it('refuses to load a package when SHA-256 checksum mismatches (tampered checksum)', () => {
    const webPath = getBibleDataFilePath('web.json');
    // Load valid file content and forge checksum
    const pkg = JSON.parse(readFileSync(webPath, 'utf-8'));
    const originalChecksum = pkg.metadata.checksum;
    pkg.metadata.checksum = '0000000000000000000000000000000000000000000000000000000000000000';

    expect(() => {
      db.loadPackage(pkg);
    }).toThrow(/checksum mismatch/i);

    // Verify fail-closed behavior: translation is not registered and verses are not loaded
    expect(db.getTranslation('WEB')).toBeNull();
    expect(db.getVerseCount('WEB', 'Genesis', 1)).toBe(0);
  });

  it('refuses to load a package when verse content is tampered with', () => {
    const webPath = getBibleDataFilePath('web.json');
    const pkg = JSON.parse(readFileSync(webPath, 'utf-8'));
    
    // Tamper with Genesis 1:1 text while leaving checksum unchanged
    pkg.verses[0].text = 'In the beginning was an unauthorized modification.';

    expect(() => {
      db.loadPackage(pkg);
    }).toThrow(/checksum mismatch/i);

    expect(db.getTranslation('WEB')).toBeNull();
    expect(db.getVerseCount('WEB', 'Genesis', 1)).toBe(0);
  });

  it('refuses to load a package without a checksum when verification is required', () => {
    const invalidPkg: any = {
      metadata: {
        id: 'TEST',
        name: 'Test Translation',
        abbreviation: 'TEST',
        language: 'en',
        copyright: 'Public Domain',
        license: 'Public Domain',
        attribution: 'Test',
        redistributionStatus: 'unrestricted',
        verificationStatus: 'verified',
        importedAt: Date.now()
        // No checksum property
      },
      verses: [
        {
          translationId: 'TEST',
          bookId: 'GEN',
          bookName: 'Genesis',
          chapter: 1,
          verse: 1,
          text: 'Verse text'
        }
      ]
    };

    expect(() => {
      db.loadPackage(invalidPkg, { requireChecksum: true });
    }).toThrow(/missing required cryptographic SHA-256 checksum/i);

    expect(db.getTranslation('TEST')).toBeNull();
  });

  it('throws an error when loading from a non-existent file', () => {
    expect(() => {
      db.loadPackageFromFile('nonexistent-path-to-scripture.json');
    }).toThrow(/not found/i);
  });
});
