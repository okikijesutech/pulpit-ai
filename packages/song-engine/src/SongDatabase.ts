/**
 * Local Song and Hymn Database using SQLite.
 *
 * Implements relational song storage, multi-version management,
 * ordered lyric line persistence, and full-text search indexing.
 * Adheres strictly to Section 10 and Section 13 of the Pulpit AI build specification.
 */

import { Song, SongSection, SongVersion } from '@pulpit-ai/shared-types';

export interface SongLyricMatch {
  versionName: string;
  sectionLabel: string;
  line: string;
}

export interface SongSearchResult {
  song: Song;
  matchedTitle: boolean;
  matchedAlternativeTitle?: string;
  matchedLyrics: SongLyricMatch[];
  relevanceScore: number;
}

let SqliteDatabaseSync: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sqlite = require('node:sqlite');
  SqliteDatabaseSync = sqlite.DatabaseSync;
} catch {
  SqliteDatabaseSync = null;
}

export class SongDatabase {
  private db: any = null;
  private inMemoryFallback: Map<string, Song> = new Map();

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
      CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY,
        canonical_title TEXT NOT NULL,
        alt_titles TEXT NOT NULL,
        author TEXT,
        copyright TEXT,
        license TEXT,
        ccli_number TEXT,
        language TEXT NOT NULL,
        source TEXT,
        copyright_owner TEXT,
        license_type TEXT,
        attribution TEXT,
        offline_storage_permission INTEGER DEFAULT 1,
        redistribution_permission INTEGER DEFAULT 0,
        ai_processing_permission INTEGER DEFAULT 1,
        verification_status TEXT DEFAULT 'verified',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS song_versions (
        id TEXT PRIMARY KEY,
        song_id TEXT NOT NULL,
        version_name TEXT NOT NULL,
        key_signature TEXT,
        tempo INTEGER,
        is_default INTEGER NOT NULL DEFAULT 1,
        notes TEXT,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS song_sections (
        id TEXT PRIMARY KEY,
        version_id TEXT NOT NULL,
        section_type TEXT NOT NULL,
        sequence_order INTEGER NOT NULL,
        label TEXT NOT NULL,
        FOREIGN KEY (version_id) REFERENCES song_versions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS song_lyrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section_id TEXT NOT NULL,
        line_order INTEGER NOT NULL,
        lyric_text TEXT NOT NULL,
        normalized_text TEXT NOT NULL,
        FOREIGN KEY (section_id) REFERENCES song_sections(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(canonical_title);
      CREATE INDEX IF NOT EXISTS idx_versions_song ON song_versions(song_id);
      CREATE INDEX IF NOT EXISTS idx_sections_version ON song_sections(version_id);
      CREATE INDEX IF NOT EXISTS idx_lyrics_section ON song_lyrics(section_id);
      CREATE INDEX IF NOT EXISTS idx_lyrics_normalized ON song_lyrics(normalized_text);
    `);
  }

  /**
   * Normalizes text for search indexing and matching.
   */
  public static normalizeLyricText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Saves or updates a complete song with its versions, sections, and lyric lines.
   */
  public saveSong(song: Song): void {
    if (this.db) {
      this.db.exec('BEGIN TRANSACTION');
      try {
        // 1. Delete previous version graph to ensure clean update
        this.db.prepare('DELETE FROM songs WHERE id = ?').run(song.id);

        // 2. Insert song
        const songStmt = this.db.prepare(`
          INSERT INTO songs (
            id, canonical_title, alt_titles, author, copyright,
            license, ccli_number, language, source, copyright_owner,
            license_type, attribution, offline_storage_permission,
            redistribution_permission, ai_processing_permission,
            verification_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        songStmt.run(
          song.id,
          song.canonicalTitle,
          JSON.stringify(song.alternativeTitles || []),
          song.author || null,
          song.copyright || null,
          song.license || null,
          song.ccliNumber || null,
          song.language || 'en',
          song.licensing?.source || 'Local Church Library',
          song.licensing?.copyrightOwner || song.copyright || 'Unknown',
          song.licensing?.licenseType || song.license || 'custom_restricted',
          song.licensing?.attribution || (song.author ? `${song.canonicalTitle} - ${song.author}` : song.canonicalTitle),
          song.licensing?.offlineStoragePermission !== false ? 1 : 0,
          song.licensing?.redistributionPermission ? 1 : 0,
          song.licensing?.aiProcessingPermission !== false ? 1 : 0,
          song.licensing?.verificationStatus || 'verified',
          song.createdAt,
          song.updatedAt
        );

        // 3. Insert versions, sections, and lyrics
        const verStmt = this.db.prepare(`
          INSERT INTO song_versions (
            id, song_id, version_name, key_signature, tempo, is_default, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const secStmt = this.db.prepare(`
          INSERT INTO song_sections (
            id, version_id, section_type, sequence_order, label
          ) VALUES (?, ?, ?, ?, ?)
        `);

        const lyricStmt = this.db.prepare(`
          INSERT INTO song_lyrics (
            section_id, line_order, lyric_text, normalized_text
          ) VALUES (?, ?, ?, ?)
        `);

        for (const ver of song.versions) {
          verStmt.run(
            ver.id,
            song.id,
            ver.versionName,
            ver.key || null,
            ver.tempo || null,
            ver.isDefault ? 1 : 0,
            ver.notes || null
          );

          for (const sec of ver.sections) {
            secStmt.run(sec.id, ver.id, sec.type, sec.sequenceOrder, sec.label);

            for (let i = 0; i < sec.lines.length; i++) {
              const line = sec.lines[i];
              lyricStmt.run(sec.id, i + 1, line, SongDatabase.normalizeLyricText(line));
            }
          }
        }

        this.db.exec('COMMIT');
      } catch (err) {
        this.db.exec('ROLLBACK');
        throw err;
      }
    } else {
      this.inMemoryFallback.set(song.id, JSON.parse(JSON.stringify(song)));
    }
  }

  /**
   * Retrieves a full song by its ID.
   */
  public getSong(id: string): Song | null {
    if (this.db) {
      const songRow = this.db.prepare('SELECT * FROM songs WHERE id = ?').get(id);
      if (!songRow) return null;

      const versions: SongVersion[] = [];
      const verRows = this.db.prepare('SELECT * FROM song_versions WHERE song_id = ?').all(id);

      for (const vRow of verRows) {
        const secRows = this.db
          .prepare('SELECT * FROM song_sections WHERE version_id = ? ORDER BY sequence_order ASC')
          .all(vRow.id);

        const sections: SongSection[] = [];
        for (const sRow of secRows) {
          const lyricRows = this.db
            .prepare('SELECT lyric_text FROM song_lyrics WHERE section_id = ? ORDER BY line_order ASC')
            .all(sRow.id);

          sections.push({
            id: sRow.id,
            type: sRow.section_type,
            sequenceOrder: sRow.sequence_order,
            label: sRow.label,
            lines: lyricRows.map((l: any) => l.lyric_text)
          });
        }

        versions.push({
          id: vRow.id,
          songId: vRow.song_id,
          versionName: vRow.version_name,
          key: vRow.key_signature,
          tempo: vRow.tempo,
          isDefault: Boolean(vRow.is_default),
          notes: vRow.notes,
          sections
        });
      }

      const licensing = songRow.source || songRow.verification_status ? {
        source: songRow.source || 'Local Church Library',
        copyrightOwner: songRow.copyright_owner || songRow.copyright || 'Unknown',
        licenseType: songRow.license_type || songRow.license || 'public_domain',
        attribution: songRow.attribution || songRow.canonical_title,
        offlineStoragePermission: songRow.offline_storage_permission === 1,
        redistributionPermission: songRow.redistribution_permission === 1,
        aiProcessingPermission: songRow.ai_processing_permission === 1,
        verificationStatus: (songRow.verification_status || 'verified') as any
      } : undefined;

      return {
        id: songRow.id,
        canonicalTitle: songRow.canonical_title,
        alternativeTitles: JSON.parse(songRow.alt_titles || '[]'),
        author: songRow.author,
        copyright: songRow.copyright,
        license: songRow.license,
        ccliNumber: songRow.ccli_number,
        language: songRow.language,
        licensing,
        createdAt: songRow.created_at,
        updatedAt: songRow.updated_at,
        versions
      };
    } else {
      const found = this.inMemoryFallback.get(id);
      return found ? JSON.parse(JSON.stringify(found)) : null;
    }
  }

  /**
   * Lists all songs in the library.
   */
  public listSongs(): Song[] {
    if (this.db) {
      const rows = this.db.prepare('SELECT id FROM songs ORDER BY canonical_title ASC').all();
      const songs: Song[] = [];
      for (const row of rows) {
        const s = this.getSong(row.id);
        if (s) songs.push(s);
      }
      return songs;
    } else {
      return Array.from(this.inMemoryFallback.values());
    }
  }

  /**
   * Deletes a song by its ID.
   */
  public deleteSong(id: string): boolean {
    if (this.db) {
      this.db.prepare('DELETE FROM songs WHERE id = ?').run(id);
      return true;
    } else {
      return this.inMemoryFallback.delete(id);
    }
  }

  /**
   * Searches songs by title, alternative title, or lyric content.
   */
  public searchSongs(query: string, approvedOnly: boolean = true): SongSearchResult[] {
    if (!query || query.trim().length === 0) return [];

    const normQuery = SongDatabase.normalizeLyricText(query);
    const queryTokens = normQuery.split(/\s+/).filter(t => t.length > 0);
    const results: Map<string, SongSearchResult> = new Map();

    const allSongs = this.listSongs();

    for (const song of allSongs) {
      // Strict Licensing Filter: Recognition engine searches only verified content with AI permission
      if (approvedOnly && song.licensing) {
        if (song.licensing.verificationStatus !== 'verified' || song.licensing.aiProcessingPermission === false) {
          continue;
        }
      }
      const normTitle = SongDatabase.normalizeLyricText(song.canonicalTitle);
      let matchedTitle = false;
      let matchedAltTitle: string | undefined = undefined;
      let score = 0;

      // 1. Check canonical title
      if (normTitle === normQuery) {
        matchedTitle = true;
        score = 1.0;
      } else if (normTitle.includes(normQuery)) {
        matchedTitle = true;
        score = 0.95;
      } else {
        // Token match on title
        const titleTokens = normTitle.split(/\s+/);
        const matchCount = queryTokens.filter(qt => titleTokens.includes(qt)).length;
        if (matchCount > 0 && matchCount === queryTokens.length) {
          matchedTitle = true;
          score = 0.85;
        }
      }

      // 2. Check alternative titles
      if (!matchedTitle && song.alternativeTitles) {
        for (const alt of song.alternativeTitles) {
          const normAlt = SongDatabase.normalizeLyricText(alt);
          if (normAlt === normQuery) {
            matchedAltTitle = alt;
            score = 1.0;
            break;
          } else if (new RegExp(`(^|\\s)${normQuery}(\\s|$)`).test(normAlt)) {
            matchedAltTitle = alt;
            score = 0.95;
            break;
          } else if (normAlt.includes(normQuery)) {
            matchedAltTitle = alt;
            score = 0.75;
            break;
          }
        }
      }

      // 3. Check lyric lines
      const matchedLyrics: SongLyricMatch[] = [];

      for (const ver of song.versions) {
        for (const sec of ver.sections) {
          for (const line of sec.lines) {
            const normLine = SongDatabase.normalizeLyricText(line);

            // Exact phrase match in line
            if (normLine.includes(normQuery)) {
              matchedLyrics.push({
                versionName: ver.versionName,
                sectionLabel: sec.label,
                line
              });
              score = Math.max(score, 0.88);
            } else if (queryTokens.length > 2) {
              // Token overlap match
              const lineTokens = normLine.split(/\s+/);
              const overlap = queryTokens.filter(qt => lineTokens.includes(qt)).length;
              if (overlap >= 3 && overlap / queryTokens.length >= 0.75) {
                matchedLyrics.push({
                  versionName: ver.versionName,
                  sectionLabel: sec.label,
                  line
                });
                score = Math.max(score, 0.75);
              }
            }
          }
        }
      }

      if (matchedTitle || matchedAltTitle || matchedLyrics.length > 0) {
        results.set(song.id, {
          song,
          matchedTitle,
          matchedAlternativeTitle: matchedAltTitle,
          matchedLyrics,
          relevanceScore: Math.round(score * 100) / 100
        });
      }
    }

    return Array.from(results.values()).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Loads seed hymns into the database.
   */
  public loadSeedHymns(songs: Song[]): void {
    for (const song of songs) {
      this.saveSong(song);
    }
  }

  /**
   * Closes the database.
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
