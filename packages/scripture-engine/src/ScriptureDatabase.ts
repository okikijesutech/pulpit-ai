/**
 * Local Scripture Storage Engine using SQLite.
 *
 * Implements deterministic passage lookups, translation package metadata,
 * and exact verse storage according to Section 9 and Section 13 of the spec.
 * Never generates or invents verses; retrieves verified text only.
 */

import { CanonValidator } from './CanonValidator.js';
import {
  TranslationMetadata,
  ScriptureVerseRecord,
  ScripturePassageResult,
  TranslationPackage
} from './types.js';

let SqliteDatabaseSync: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sqlite = require('node:sqlite');
  SqliteDatabaseSync = sqlite.DatabaseSync;
} catch {
  SqliteDatabaseSync = null;
}

export class ScriptureDatabase {
  private db: any = null;
  private inMemoryFallback = {
    translations: new Map<string, TranslationMetadata>(),
    verses: new Map<string, ScriptureVerseRecord>() // key: `${translationId}:${bookName}:${chapter}:${verse}`
  };

  constructor(private dbPath: string = ':memory:') {
    this.initialize();
  }

  private initialize(): void {
    if (SqliteDatabaseSync) {
      this.db = new SqliteDatabaseSync(this.dbPath);
      this.createTables();
    }
  }

  private createTables(): void {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bible_translations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        abbreviation TEXT NOT NULL UNIQUE,
        language TEXT NOT NULL,
        source TEXT,
        edition TEXT,
        copyright TEXT NOT NULL,
        license TEXT NOT NULL,
        attribution TEXT NOT NULL,
        redistribution_status TEXT NOT NULL,
        checksum TEXT,
        verification_status TEXT NOT NULL,
        offline_storage_permission INTEGER NOT NULL DEFAULT 1,
        redistribution_permission INTEGER NOT NULL DEFAULT 1,
        ai_processing_permission INTEGER NOT NULL DEFAULT 1,
        imported_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bible_books (
        id TEXT NOT NULL,
        translation_id TEXT NOT NULL,
        name TEXT NOT NULL,
        testament TEXT NOT NULL,
        total_chapters INTEGER NOT NULL,
        PRIMARY KEY (translation_id, id),
        FOREIGN KEY (translation_id) REFERENCES bible_translations(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS bible_verses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        translation_id TEXT NOT NULL,
        book_id TEXT NOT NULL,
        book_name TEXT NOT NULL,
        chapter INTEGER NOT NULL,
        verse INTEGER NOT NULL,
        text TEXT NOT NULL,
        FOREIGN KEY (translation_id) REFERENCES bible_translations(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_verses_lookup 
      ON bible_verses(translation_id, book_name, chapter, verse);
    `);
  }

  /**
   * Registers a translation's metadata.
   */
  public registerTranslation(meta: TranslationMetadata): void {
    if (this.db) {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO bible_translations (
          id, name, abbreviation, language, source, edition,
          copyright, license, attribution, redistribution_status,
          checksum, verification_status, offline_storage_permission,
          redistribution_permission, ai_processing_permission, imported_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        meta.id,
        meta.name,
        meta.abbreviation,
        meta.language,
        meta.source || null,
        meta.edition || null,
        meta.copyright,
        meta.license,
        meta.attribution,
        meta.redistributionStatus,
        meta.checksum || null,
        meta.verificationStatus,
        meta.offlineStoragePermission !== false ? 1 : 0,
        meta.redistributionPermission !== false ? 1 : 0,
        meta.aiProcessingPermission !== false ? 1 : 0,
        meta.importedAt
      );
    } else {
      this.inMemoryFallback.translations.set(meta.id.toUpperCase(), meta);
      this.inMemoryFallback.translations.set(meta.abbreviation.toUpperCase(), meta);
    }
  }

  /**
   * Retrieves translation metadata by ID or abbreviation.
   */
  public getTranslation(idOrAbbr: string): TranslationMetadata | null {
    const key = idOrAbbr.trim().toUpperCase();
    if (this.db) {
      const stmt = this.db.prepare(`
        SELECT * FROM bible_translations 
        WHERE UPPER(id) = ? OR UPPER(abbreviation) = ? 
        LIMIT 1
      `);
      const row = stmt.get(key, key);
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        abbreviation: row.abbreviation,
        language: row.language,
        source: row.source,
        edition: row.edition,
        copyright: row.copyright,
        license: row.license,
        attribution: row.attribution,
        redistributionStatus: row.redistribution_status,
        checksum: row.checksum,
        verificationStatus: row.verification_status,
        offlineStoragePermission: row.offline_storage_permission === 1,
        redistributionPermission: row.redistribution_permission === 1,
        aiProcessingPermission: row.ai_processing_permission === 1,
        importedAt: row.imported_at
      };
    } else {
      return this.inMemoryFallback.translations.get(key) || null;
    }
  }

  /**
   * Lists all installed translations.
   */
  public listTranslations(): TranslationMetadata[] {
    if (this.db) {
      const stmt = this.db.prepare(`SELECT * FROM bible_translations ORDER BY abbreviation ASC`);
      const rows = stmt.all();
      return rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        abbreviation: row.abbreviation,
        language: row.language,
        source: row.source,
        edition: row.edition,
        copyright: row.copyright,
        license: row.license,
        attribution: row.attribution,
        redistributionStatus: row.redistribution_status,
        checksum: row.checksum,
        verificationStatus: row.verification_status,
        offlineStoragePermission: row.offline_storage_permission === 1,
        redistributionPermission: row.redistribution_permission === 1,
        aiProcessingPermission: row.ai_processing_permission === 1,
        importedAt: row.imported_at
      }));
    } else {
      return Array.from(new Set(this.inMemoryFallback.translations.values()));
    }
  }

  /**
   * Inserts a single verse record.
   */
  public insertVerse(verse: ScriptureVerseRecord): void {
    if (this.db) {
      const stmt = this.db.prepare(`
        INSERT INTO bible_verses (translation_id, book_id, book_name, chapter, verse, text)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        verse.translationId.toUpperCase(),
        verse.bookId.toUpperCase(),
        verse.bookName,
        verse.chapter,
        verse.verse,
        verse.text
      );
    } else {
      const key = `${verse.translationId.toUpperCase()}:${verse.bookName.toLowerCase()}:${verse.chapter}:${verse.verse}`;
      this.inMemoryFallback.verses.set(key, verse);
    }
  }

  /**
   * Bulk inserts a list of verses in a single transaction.
   */
  public insertVersesBatch(verses: ScriptureVerseRecord[]): void {
    if (this.db) {
      this.db.exec('BEGIN TRANSACTION');
      try {
        const stmt = this.db.prepare(`
          INSERT INTO bible_verses (translation_id, book_id, book_name, chapter, verse, text)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const v of verses) {
          stmt.run(
            v.translationId.toUpperCase(),
            v.bookId.toUpperCase(),
            v.bookName,
            v.chapter,
            v.verse,
            v.text
          );
        }
        this.db.exec('COMMIT');
      } catch (err) {
        this.db.exec('ROLLBACK');
        throw err;
      }
    } else {
      for (const v of verses) {
        const key = `${v.translationId.toUpperCase()}:${v.bookName.toLowerCase()}:${v.chapter}:${v.verse}`;
        this.inMemoryFallback.verses.set(key, v);
      }
    }
  }

  /**
   * Loads an entire translation package.
   */
  public loadPackage(pkg: TranslationPackage): void {
    this.registerTranslation(pkg.metadata);
    this.insertVersesBatch(pkg.verses);
  }

  /**
   * Retrieves an exact passage from the verified local storage.
   *
   * @param translationId Translation abbreviation or ID (e.g. 'WEB', 'KJV').
   * @param bookName Book name or alias (e.g. 'John', '1 Corinthians', 'Psalms').
   * @param chapter Chapter number.
   * @param verseStart Start verse.
   * @param verseEnd Optional end verse. If omitted, verseEnd = verseStart.
   */
  public getPassage(
    translationId: string,
    bookName: string,
    chapter: number,
    verseStart: number,
    verseEnd?: number
  ): ScripturePassageResult | null {
    const endVerse = verseEnd !== undefined ? verseEnd : verseStart;

    // Validate reference bounds first
    const canonResult = CanonValidator.validateReference(bookName, chapter, verseStart, endVerse);
    if (!canonResult.isValid || !canonResult.book) {
      return null;
    }

    const canonicalBookName = canonResult.normalizedBookName || canonResult.book.name;
    const translation = this.getTranslation(translationId);
    if (!translation) {
      return null;
    }

    // Strict Licensing Check: Only verified translations authorized for AI processing may be queried
    if (translation.verificationStatus !== 'verified' || translation.aiProcessingPermission === false) {
      return null;
    }

    const verses: ScriptureVerseRecord[] = [];

    if (this.db) {
      const stmt = this.db.prepare(`
        SELECT translation_id, book_id, book_name, chapter, verse, text 
        FROM bible_verses 
        WHERE UPPER(translation_id) = ? 
          AND (LOWER(book_name) = ? OR UPPER(book_id) = ?) 
          AND chapter = ? 
          AND verse >= ? 
          AND verse <= ? 
        ORDER BY verse ASC
      `);
      const rows = stmt.all(
        translation.abbreviation.toUpperCase(),
        canonicalBookName.toLowerCase(),
        canonResult.book.id.toUpperCase(),
        chapter,
        verseStart,
        endVerse
      );

      for (const row of rows) {
        verses.push({
          translationId: row.translation_id,
          bookId: row.book_id,
          bookName: row.book_name,
          chapter: row.chapter,
          verse: row.verse,
          text: row.text
        });
      }
    } else {
      for (let v = verseStart; v <= endVerse; v++) {
        const key = `${translation.abbreviation.toUpperCase()}:${canonicalBookName.toLowerCase()}:${chapter}:${v}`;
        const record = this.inMemoryFallback.verses.get(key);
        if (record) {
          verses.push(record);
        }
      }
    }

    // Strict rule: if any requested verse in range is missing from storage, return null or incomplete
    const expectedCount = endVerse - verseStart + 1;
    if (verses.length === 0 || verses.length < expectedCount) {
      // Missing verified verses -> fail closed, never invent missing text
      return null;
    }

    const fullText = verses.map(v => v.text).join(' ');
    const formattedText = verses.map(v => `[${v.verse}] ${v.text}`).join(' ');

    return {
      found: true,
      reference: {
        book: canonicalBookName,
        chapter,
        verseStart,
        verseEnd: endVerse > verseStart ? endVerse : undefined,
        translation: translation.abbreviation,
        rawSpokenText: `${canonicalBookName} ${chapter}:${verseStart}${endVerse > verseStart ? `-${endVerse}` : ''}`
      },
      translation,
      verses,
      fullText,
      formattedText,
      attribution: translation.attribution
    };
  }

  /**
   * Closes database connection.
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
