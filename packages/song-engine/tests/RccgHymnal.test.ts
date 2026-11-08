import { describe, it, expect, beforeEach } from 'vitest';
import { SongDatabase } from '../src/SongDatabase.js';
import { SongCandidateGenerator } from '../src/SongCandidateGenerator.js';
import { RCCG_HYMNS, loadRccgHymnsIntoDatabase } from '../src/rccg/index.js';

describe('RCCG Redeemed Hymnal Integration Tests', () => {
  let db: SongDatabase;
  let generator: SongCandidateGenerator;

  beforeEach(() => {
    db = new SongDatabase(':memory:');
    loadRccgHymnsIntoDatabase(db);
    generator = new SongCandidateGenerator(db, {
      cooldownMs: 8000,
      minConfidence: 0.70
    });
  });

  it('loads the full curated RCCG Hymnal into the database', () => {
    const all = db.listSongs();
    expect(all.length).toBe(RCCG_HYMNS.length);
    expect(all.length).toBeGreaterThanOrEqual(15);
  });

  it('searches RCCG hymns by hymn number', () => {
    const hymn1 = db.searchSongs('RCCG Hymn 1');
    expect(hymn1.length).toBeGreaterThan(0);
    expect(hymn1[0].song.canonicalTitle).toContain('Praise to the Lord');

    const hymn5 = db.searchSongs('RCCG Hymn 5');
    expect(hymn5.length).toBeGreaterThan(0);
    expect(hymn5[0].song.canonicalTitle).toContain('Great Is Thy Faithfulness');
  });

  it('searches RCCG hymns by anthem and title', () => {
    const anthem = db.searchSongs('Redeemed of God');
    expect(anthem.length).toBeGreaterThan(0);
    expect(anthem[0].song.canonicalTitle).toContain('RCCG Anthem');

    const trust = db.searchSongs('Trust and Obey');
    expect(trust.length).toBeGreaterThan(0);
    expect(trust[0].song.canonicalTitle).toContain('Trust and Obey');
  });

  it('recognizes sung lyrics from RCCG Hymn 5 (Great Is Thy Faithfulness)', () => {
    const candidate = generator.processTranscript(
      'Great is Thy faithfulness, O God my Father, there is no shadow of turning with Thee',
      true,
      Date.now()
    );

    expect(candidate).not.toBeNull();
    expect(candidate?.type).toBe('song');
    expect(candidate?.title).toContain('Great Is Thy Faithfulness');
    expect(candidate?.confidence).toBeGreaterThanOrEqual(0.80);
    expect(candidate?.actionPayload.data).toEqual(
      expect.objectContaining({ name: 'Great Is Thy Faithfulness' })
    );
  });

  it('recognizes sung lyrics from the RCCG Anthem', () => {
    const candidate = generator.processTranscript(
      'We are the Redeemed of God bought with the precious blood of Jesus',
      true,
      Date.now()
    );

    expect(candidate).not.toBeNull();
    expect(candidate?.type).toBe('song');
    expect(candidate?.title).toContain('RCCG Anthem');
    expect(candidate?.confidence).toBeGreaterThanOrEqual(0.80);
  });
});
