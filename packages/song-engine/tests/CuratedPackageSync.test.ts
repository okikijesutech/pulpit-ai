import { describe, it, expect, beforeEach } from 'vitest';
import { CuratedPackageManifest, CuratedSongEntry } from '@pulpit-ai/shared-types';
import { SongDatabase } from '../src/SongDatabase.js';
import { SEED_SONGS } from '../src/SeedSongData.js';
import { ManifestValidator } from '../src/sync/ManifestValidator.js';
import { CuratedPackageSync } from '../src/sync/CuratedPackageSync.js';

describe('Curated Shared Library and Synchronisation Tests', () => {
  let db: SongDatabase;
  let syncEngine: CuratedPackageSync;

  beforeEach(() => {
    db = new SongDatabase(':memory:');
    for (const song of SEED_SONGS) {
      db.saveSong(song);
    }
    syncEngine = new CuratedPackageSync(db);
  });

  function createSampleManifest(): CuratedPackageManifest {
    const song1: CuratedSongEntry = {
      canonicalTitle: 'Rock of Ages',
      alternativeTitles: ['Toplady'],
      author: 'Augustus Toplady (1776)',
      copyright: 'Public Domain',
      license: 'Public Domain',
      language: 'en',
      versionName: 'Traditional',
      sections: [
        {
          type: 'verse',
          label: 'Verse 1',
          lines: ['Rock of Ages, cleft for me,', 'Let me hide myself in Thee;']
        }
      ],
      contentHashSha256: ''
    };
    song1.contentHashSha256 = ManifestValidator.calculateSongHash(song1);

    const song2: CuratedSongEntry = {
      canonicalTitle: 'Amazing Grace',
      alternativeTitles: [],
      author: 'John Newton',
      copyright: 'Public Domain',
      license: 'Public Domain',
      language: 'en',
      versionName: 'Harmonized 2026',
      sections: [
        {
          type: 'verse',
          label: 'Verse 1',
          lines: ['Amazing grace! How sweet the sound', 'That saved a wretch like me!']
        }
      ],
      contentHashSha256: ''
    };
    song2.contentHashSha256 = ManifestValidator.calculateSongHash(song2);

    const songs = [song1, song2];
    const packageHash = ManifestValidator.calculatePackageHash(songs);

    return {
      packageId: 'curated_hymns_vol1',
      packageName: 'Historic Protestant Hymns Volume 1',
      version: '1.0.0',
      publishedAt: 1700000000000,
      publisher: {
        name: 'Ecumenical Hymnal Project',
        signatureSha256: 'valid_sig'
      },
      license: 'Public Domain',
      description: 'Standard public domain hymns with historical attribution.',
      totalSongs: 2,
      packageHashSha256: packageHash,
      songs
    };
  }

  it('validates a cryptographically intact package manifest', () => {
    const manifest = createSampleManifest();
    const valResult = ManifestValidator.validate(manifest);

    expect(valResult.valid).toBe(true);
    expect(valResult.errors.length).toBe(0);
    expect(valResult.calculatedHash).toBe(manifest.packageHashSha256);
  });

  it('fails closed and rejects a tampered package with altered lyrics', () => {
    const manifest = createSampleManifest();
    // Tamper with a lyric line without recomputing hash
    manifest.songs[0].sections[0].lines[0] = 'Rock of Ages, altered line';

    const valResult = ManifestValidator.validate(manifest);
    expect(valResult.valid).toBe(false);
    expect(valResult.errors.some(e => e.includes('Integrity check failed'))).toBe(true);
  });

  it('syncs new unique songs into the local library', () => {
    const manifest = createSampleManifest();
    const result = syncEngine.syncPackage(manifest, { conflictPolicy: 'add_as_variant' });

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1); // 'Rock of Ages' is new
    expect(result.updatedCount).toBe(1); // 'Amazing Grace' added as variant

    // Verify 'Rock of Ages' is now in local database
    const searched = db.searchSongs('Rock of Ages');
    expect(searched.length).toBe(1);
    expect(searched[0].song.canonicalTitle).toBe('Rock of Ages');
  });

  it('preserves existing local arrangements using add_as_variant policy', () => {
    const manifest = createSampleManifest();
    syncEngine.syncPackage(manifest, { conflictPolicy: 'add_as_variant' });

    const localSong = db.searchSongs('Amazing Grace')[0].song;
    expect(localSong.versions.length).toBe(2);
    expect(localSong.versions.some(v => v.versionName === 'Standard (Traditional)')).toBe(true);
    expect(localSong.versions.some(v => v.versionName === 'Harmonized 2026')).toBe(true);
  });

  it('respects keep_local policy and skips modifying local songs on conflict', () => {
    const manifest = createSampleManifest();
    const result = syncEngine.syncPackage(manifest, { conflictPolicy: 'keep_local' });

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1); // 'Rock of Ages'
    expect(result.skippedCount).toBe(1); // 'Amazing Grace' skipped
    expect(result.conflicts[0].resolution).toBe('kept_local');

    const localSong = db.searchSongs('Amazing Grace')[0].song;
    expect(localSong.versions.length).toBe(1); // Remains untouched!
  });
});
