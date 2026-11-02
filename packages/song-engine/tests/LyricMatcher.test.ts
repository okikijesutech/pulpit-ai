import { describe, it, expect, beforeEach } from 'vitest';
import { SongDatabase } from '../src/SongDatabase.js';
import { SEED_SONGS } from '../src/SeedSongData.js';
import { LyricMatcher } from '../src/LyricMatcher.js';
import { ConsecutiveEvidenceTracker } from '../src/ConsecutiveEvidenceTracker.js';

describe('LyricMatcher and ConsecutiveEvidenceTracker Unit Tests', () => {
  let db: SongDatabase;
  let tracker: ConsecutiveEvidenceTracker;
  let matcher: LyricMatcher;

  beforeEach(() => {
    db = new SongDatabase(':memory:');
    for (const song of SEED_SONGS) {
      db.saveSong(song);
    }
    tracker = new ConsecutiveEvidenceTracker({ hypothesisWindowMs: 25000 });
    matcher = new LyricMatcher(db, tracker);
  });

  it('matches a distinctive lyric line with high confidence', () => {
    const transcript = 'Amazing grace how sweet the sound';
    const evalRes = matcher.evaluateTranscript(transcript, true);

    expect(evalRes.matchFound).toBe(true);
    expect(evalRes.topCandidate?.song.canonicalTitle).toBe('Amazing Grace');
    expect(evalRes.topCandidate?.confidence).toBeGreaterThanOrEqual(0.75);
    expect(evalRes.topCandidate?.distinctiveness).toBeGreaterThan(0.60);
    expect(evalRes.isAmbiguous).toBe(false);
  });

  it('suppresses generic one-off church phrases like Hallelujah from triggering false song suggestions', () => {
    const genericPhrases = ['Hallelujah', 'Praise the Lord', 'Amen praise God'];

    for (const phrase of genericPhrases) {
      const evalRes = matcher.evaluateTranscript(phrase, true);
      expect(evalRes.matchFound).toBe(false);
      expect(evalRes.suppressionReason).toContain('lacks distinctiveness');
    }
  });

  it('accumulates consecutive-line evidence across successive audio segments', () => {
    const t0 = 100000;
    // Line 1: Amazing grace
    const res1 = matcher.evaluateTranscript('Amazing grace how sweet the sound', true, t0);
    expect(res1.matchFound).toBe(true);
    expect(res1.topCandidate?.consecutiveMatches).toBe(1);

    // Line 2: That saved a wretch like me (5 seconds later)
    const res2 = matcher.evaluateTranscript('That saved a wretch like me', true, t0 + 5000);
    expect(res2.matchFound).toBe(true);
    expect(res2.topCandidate?.song.canonicalTitle).toBe('Amazing Grace');
    expect(res2.topCandidate?.consecutiveMatches).toBe(2);
    expect(res2.topCandidate?.isConsecutive).toBe(true);
    expect(res2.topCandidate?.confidence).toBeGreaterThanOrEqual(0.90);
    expect(res2.topCandidate?.explanation).toContain('Consecutive match (2 lines in sequence)');
  });

  it('handles ambiguous lyric phrases across distinct songs safely', () => {
    // Add two test songs that share an identical distinctive line prefix
    db.saveSong({
      id: 'test_song_a',
      canonicalTitle: 'Harvest Hymn Alpha',
      alternativeTitles: [],
      language: 'en',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      versions: [
        {
          id: 'v_a',
          songId: 'test_song_a',
          versionName: 'Standard',
          isDefault: true,
          sections: [
            {
              id: 'sec_a',
              type: 'verse',
              sequenceOrder: 1,
              label: 'Verse 1',
              lines: [
                'Lord of the harvest send forth laborers to the nations',
                'For the fields are white'
              ]
            }
          ]
        }
      ]
    });

    db.saveSong({
      id: 'test_song_b',
      canonicalTitle: 'Harvest Hymn Beta',
      alternativeTitles: [],
      language: 'en',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      versions: [
        {
          id: 'v_b',
          songId: 'test_song_b',
          versionName: 'Standard',
          isDefault: true,
          sections: [
            {
              id: 'sec_b',
              type: 'verse',
              sequenceOrder: 1,
              label: 'Verse 1',
              lines: [
                'Lord of the harvest send forth laborers to the harvest',
                'For the day is near'
              ]
            }
          ]
        }
      ]
    });

    // Evaluate an ambiguous snippet shared between both without consecutive line confirmation
    const evalRes = matcher.evaluateTranscript('Lord of the harvest send forth laborers', false);

    expect(evalRes.matchFound).toBe(false);
    expect(evalRes.isAmbiguous).toBe(true);
    expect(evalRes.suppressionReason).toContain('Ambiguous match');
  });

  it('prunes stale hypotheses after the time tracking window expires', () => {
    const t0 = 100000;
    matcher.evaluateTranscript('Amazing grace how sweet the sound', true, t0);
    expect(tracker.getTopHypotheses().length).toBeGreaterThan(0);

    // Advance time by 30 seconds (window is 25s)
    tracker.pruneStale(t0 + 30000);
    expect(tracker.getTopHypotheses().length).toBe(0);
  });
});
