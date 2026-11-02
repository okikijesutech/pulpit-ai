import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SongDatabase,
  SEED_SONGS,
  SongDuplicateDetector,
  SongReviewManager,
  ParsedSongDraft
} from '../src/index.js';

describe('SongDuplicateDetector', () => {
  let db: SongDatabase;

  beforeEach(() => {
    db = new SongDatabase(':memory:');
    db.loadSeedHymns(SEED_SONGS);
  });

  afterEach(() => {
    db.close();
  });

  it('identifies exact duplicate songs with identical title and lyrics', () => {
    const draft: ParsedSongDraft = {
      title: 'Amazing Grace',
      sections: [
        {
          type: 'verse',
          label: 'Verse 1',
          lines: [
            'Amazing grace! How sweet the sound',
            'That saved a wretch like me!',
            'I once was lost, but now am found;',
            'Was blind, but now I see.'
          ]
        }
      ],
      sourceFormat: 'txt',
      sourceFileName: 'amazing_grace.txt'
    };

    const result = SongDuplicateDetector.checkDuplicate(draft, db);
    expect(result.status).toBe('exact_match');
    expect(result.recommendation).toBe('reject');
    expect(result.matchedSong?.canonicalTitle).toBe('Amazing Grace');
  });

  it('identifies arrangement variants (e.g. Amazing Grace with modern chorus)', () => {
    const draft: ParsedSongDraft = {
      title: 'Amazing Grace (My Chains Are Gone)',
      sections: [
        {
          type: 'verse',
          label: 'Verse 1',
          lines: ['Amazing grace! How sweet the sound', 'That saved a wretch like me!']
        },
        {
          type: 'chorus',
          label: 'Chorus',
          lines: ['My chains are gone, I have been set free', 'My God, my Savior has ransomed me']
        }
      ],
      sourceFormat: 'txt',
      sourceFileName: 'amazing_grace_chains.txt'
    };

    const result = SongDuplicateDetector.checkDuplicate(draft, db);
    expect(result.status).toBe('variant_version');
    expect(result.recommendation).toBe('add_as_version');
    expect(result.matchedSong?.canonicalTitle).toBe('Amazing Grace');
  });

  it('identifies clean, unique new songs with zero library overlap', () => {
    const draft: ParsedSongDraft = {
      title: 'In Christ Alone',
      author: 'Keith Getty, Stuart Townend',
      sections: [
        {
          type: 'verse',
          label: 'Verse 1',
          lines: [
            'In Christ alone my hope is found',
            'He is my light, my strength, my song'
          ]
        }
      ],
      sourceFormat: 'txt',
      sourceFileName: 'in_christ_alone.txt'
    };

    const result = SongDuplicateDetector.checkDuplicate(draft, db);
    expect(result.status).toBe('unique_new');
    expect(result.recommendation).toBe('create_new');
  });
});

describe('SongReviewManager', () => {
  let db: SongDatabase;
  let reviewManager: SongReviewManager;

  beforeEach(() => {
    db = new SongDatabase(':memory:');
    db.loadSeedHymns(SEED_SONGS);
    reviewManager = new SongReviewManager(db);
  });

  afterEach(() => {
    db.close();
  });

  it('stages a draft for operator review and holds it in quarantine', () => {
    const draft: ParsedSongDraft = {
      title: 'Cornerstone',
      author: 'Jonas Myrin, Reuben Morgan',
      sections: [
        {
          type: 'verse',
          label: 'Verse 1',
          lines: ['My hope is built on nothing less', 'Than Jesus blood and righteousness']
        }
      ],
      sourceFormat: 'txt',
      sourceFileName: 'cornerstone.txt'
    };

    const staged = reviewManager.stageDraft(draft);
    expect(staged.id).toBeDefined();
    expect(staged.reviewStatus).toBe('pending');
    expect(staged.duplicateCheck.status).toBe('unique_new');
    expect(reviewManager.listStaged().length).toBe(1);

    // Verify it is NOT in database yet (fails closed, quarantined)
    expect(db.searchSongs('Cornerstone').length).toBe(0);
  });

  it('strictly blocks approval if operator has not confirmed church rights', () => {
    const draft: ParsedSongDraft = {
      title: 'Test Song',
      sections: [{ type: 'verse', label: 'Verse 1', lines: ['Test line'] }],
      sourceFormat: 'txt',
      sourceFileName: 'test.txt'
    };

    const staged = reviewManager.stageDraft(draft);

    expect(() =>
      reviewManager.approveImport(staged.id, {
        action: 'create_new',
        rightsConfirmed: false
      })
    ).toThrow(/confirm church usage rights/i);
  });

  it('promotes staged song to library upon operator approval with rights confirmed', () => {
    const draft: ParsedSongDraft = {
      title: 'Cornerstone',
      author: 'Reuben Morgan',
      sections: [
        {
          type: 'verse',
          label: 'Verse 1',
          lines: ['My hope is built on nothing less', 'Than Jesus blood and righteousness']
        }
      ],
      sourceFormat: 'txt',
      sourceFileName: 'cornerstone.txt'
    };

    const staged = reviewManager.stageDraft(draft);
    const saved = reviewManager.approveImport(staged.id, {
      action: 'create_new',
      rightsConfirmed: true
    });

    expect(saved.canonicalTitle).toBe('Cornerstone');
    expect(reviewManager.listStaged().length).toBe(0);

    // Verify it is now live in database
    const found = db.searchSongs('Cornerstone');
    expect(found.length).toBe(1);
    expect(found[0].song.canonicalTitle).toBe('Cornerstone');
  });

  it('adds an arrangement as a new version without destroying the original', () => {
    const draft: ParsedSongDraft = {
      title: 'Amazing Grace (Acoustic Arrangement)',
      sections: [
        {
          type: 'verse',
          label: 'Verse 1',
          lines: ['Amazing grace! How sweet the sound']
        }
      ],
      sourceFormat: 'txt',
      sourceFileName: 'ag_acoustic.txt'
    };

    const staged = reviewManager.stageDraft(draft);
    const saved = reviewManager.approveImport(staged.id, {
      action: 'add_as_version',
      versionName: 'Acoustic 2026',
      rightsConfirmed: true
    });

    expect(saved.canonicalTitle).toBe('Amazing Grace');
    expect(saved.versions.length).toBe(2);
    expect(saved.versions.some(v => v.versionName === 'Acoustic 2026')).toBe(true);
    expect(saved.versions.some(v => v.versionName.includes('Standard'))).toBe(true);
  });

  it('rejects a staged import and discards it from quarantine', () => {
    const draft: ParsedSongDraft = {
      title: 'Spam / Malformed Song',
      sections: [{ type: 'verse', label: 'Verse 1', lines: ['Garbage'] }],
      sourceFormat: 'txt',
      sourceFileName: 'bad.txt'
    };

    const staged = reviewManager.stageDraft(draft);
    const rejected = reviewManager.rejectImport(staged.id, 'Copyright unverified');

    expect(rejected).toBe(true);
    expect(reviewManager.listStaged().length).toBe(0);
    expect(db.searchSongs('Spam').length).toBe(0);
  });
});
