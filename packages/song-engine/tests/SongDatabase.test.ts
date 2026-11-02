import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SongDatabase, SEED_SONGS } from '../src/index.js';
import { Song } from '@pulpit-ai/shared-types';

describe('SongDatabase', () => {
  let db: SongDatabase;

  beforeEach(() => {
    db = new SongDatabase(':memory:');
    db.loadSeedHymns(SEED_SONGS);
  });

  afterEach(() => {
    db.close();
  });

  it('loads seed hymns and lists them with complete metadata', () => {
    const songs = db.listSongs();
    expect(songs.length).toBe(3);

    const titles = songs.map(s => s.canonicalTitle);
    expect(titles).toContain('Amazing Grace');
    expect(titles).toContain('Blessed Assurance');
    expect(titles).toContain('Holy, Holy, Holy! Lord God Almighty');
  });

  it('retrieves complete song graph with versions, sections, and ordered lyrics', () => {
    const ag = db.getSong('hymn_amazing_grace');
    expect(ag).not.toBeNull();
    expect(ag?.canonicalTitle).toBe('Amazing Grace');
    expect(ag?.author).toContain('John Newton');
    expect(ag?.copyright).toBe('Public Domain');
    expect(ag?.alternativeTitles).toContain('New Britain');
    expect(ag?.versions.length).toBe(1);

    const version = ag?.versions[0];
    expect(version?.versionName).toBe('Standard (Traditional)');
    expect(version?.sections.length).toBe(4);

    const v1 = version?.sections[0];
    expect(v1?.label).toBe('Verse 1');
    expect(v1?.lines[0]).toBe('Amazing grace! How sweet the sound');
    expect(v1?.lines[1]).toBe('That saved a wretch like me!');
  });

  it('searches songs by exact and partial title', () => {
    const results = db.searchSongs('Amazing Grace');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].song.canonicalTitle).toBe('Amazing Grace');
    expect(results[0].matchedTitle).toBe(true);
    expect(results[0].relevanceScore).toBeGreaterThanOrEqual(0.95);
  });

  it('searches songs by alternative title ("New Britain")', () => {
    const results = db.searchSongs('New Britain');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].song.canonicalTitle).toBe('Amazing Grace');
    expect(results[0].matchedAlternativeTitle).toBe('New Britain');
  });

  it('searches songs by lyric phrase ("how sweet the sound")', () => {
    const results = db.searchSongs('how sweet the sound');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].song.canonicalTitle).toBe('Amazing Grace');
    expect(results[0].matchedLyrics.length).toBeGreaterThanOrEqual(1);
    expect(results[0].matchedLyrics[0].sectionLabel).toBe('Verse 1');
    expect(results[0].matchedLyrics[0].line).toBe('Amazing grace! How sweet the sound');
  });

  it('searches chorus lyric phrase ("praising my savior all the day long")', () => {
    const results = db.searchSongs('praising my savior all the day long');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].song.canonicalTitle).toBe('Blessed Assurance');
    expect(results[0].matchedLyrics[0].sectionLabel).toBe('Chorus');
  });

  it('deletes a song cleanly with cascading removal', () => {
    const deleted = db.deleteSong('hymn_amazing_grace');
    expect(deleted).toBe(true);
    expect(db.getSong('hymn_amazing_grace')).toBeNull();
    expect(db.searchSongs('Amazing Grace').length).toBe(0);
    expect(db.listSongs().length).toBe(2);
  });

  it('updates an existing song without duplicating records', () => {
    const song = db.getSong('hymn_blessed_assurance');
    expect(song).not.toBeNull();
    if (song) {
      song.author = 'Fanny J. Crosby (Arr. Pulpit AI)';
      db.saveSong(song);
    }

    const updated = db.getSong('hymn_blessed_assurance');
    expect(updated?.author).toBe('Fanny J. Crosby (Arr. Pulpit AI)');
    expect(db.listSongs().length).toBe(3);
  });

  it('filters out unverified or AI-prohibited songs during recognition search', () => {
    // Save an unverified draft song
    const unverifiedSong: Song = {
      id: 'song_unverified_draft',
      canonicalTitle: 'Unverified Modern Song',
      alternativeTitles: [],
      author: 'Unknown Artist',
      copyright: 'Copyright Pending',
      license: 'All rights reserved',
      language: 'en',
      licensing: {
        source: 'Draft File',
        copyrightOwner: 'Unknown Artist',
        licenseType: 'custom_restricted',
        attribution: 'Pending License',
        offlineStoragePermission: true,
        redistributionPermission: false,
        aiProcessingPermission: false,
        verificationStatus: 'unverified'
      },
      versions: [
        {
          id: 'ver_draft_1',
          songId: 'song_unverified_draft',
          versionName: 'Draft',
          isDefault: true,
          sections: [
            {
              id: 'sec_draft_v1',
              type: 'verse',
              sequenceOrder: 1,
              label: 'Verse 1',
              lines: ['This is a secret draft lyric line not yet approved']
            }
          ]
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    db.saveSong(unverifiedSong);

    // Recognition search must exclude unverified content!
    const searchRecognition = db.searchSongs('secret draft lyric line', true);
    expect(searchRecognition.length).toBe(0);

    // Administrative review query (approvedOnly = false) can inspect it
    const searchAdmin = db.searchSongs('secret draft lyric line', false);
    expect(searchAdmin.length).toBe(1);
    expect(searchAdmin[0].song.canonicalTitle).toBe('Unverified Modern Song');
  });
});
