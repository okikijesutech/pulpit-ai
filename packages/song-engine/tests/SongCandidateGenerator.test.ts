import { describe, it, expect, beforeEach } from 'vitest';
import { AuthorityManager } from '@pulpit-ai/authority-manager';
import { SongDatabase } from '../src/SongDatabase.js';
import { SEED_SONGS } from '../src/SeedSongData.js';
import { SongCandidateGenerator } from '../src/SongCandidateGenerator.js';

describe('SongCandidateGenerator and Authority Integration Tests', () => {
  let db: SongDatabase;
  let generator: SongCandidateGenerator;
  let authorityManager: AuthorityManager;

  beforeEach(() => {
    db = new SongDatabase(':memory:');
    for (const song of SEED_SONGS) {
      db.saveSong(song);
    }
    generator = new SongCandidateGenerator(db, {
      cooldownMs: 8000,
      minConfidence: 0.70
    });
    authorityManager = new AuthorityManager();
  });

  it('generates a verified Song SuggestionCandidate from sung lyrics', () => {
    let emittedCandidate: any = null;
    generator.onCandidate((c) => {
      emittedCandidate = c;
    });

    const candidate = generator.processTranscript(
      'Amazing grace how sweet the sound that saved a wretch like me',
      true,
      100000
    );

    expect(candidate).not.toBeNull();
    expect(candidate?.type).toBe('song');
    expect(candidate?.title).toContain('Amazing Grace');
    expect(candidate?.confidence).toBeGreaterThanOrEqual(0.75);
    expect(candidate?.status).toBe('pending');
    expect(candidate?.actionPayload.action).toBe('start_show');
    expect(candidate?.actionPayload.source).toBe('ai');
    expect(candidate?.actionPayload.data).toEqual(
      expect.objectContaining({ name: 'Amazing Grace' })
    );

    expect(emittedCandidate).toBe(candidate);
  });

  it('enforces cooldown to suppress repeated candidates for the same song', () => {
    const t0 = 200000;
    const first = generator.processTranscript('Amazing grace how sweet the sound', true, t0);
    expect(first).not.toBeNull();

    // Immediate second transcript for the next line within 8s cooldown window
    const second = generator.processTranscript('That saved a wretch like me', true, t0 + 2000);
    expect(second).toBeNull(); // Suppressed by cooldown!

    // After 9 seconds (cooldown is 8s), new candidate can be emitted
    const third = generator.processTranscript('That saved a wretch like me', true, t0 + 9000);
    expect(third).not.toBeNull();
  });

  it('integrates with AuthorityManager: Human operator approves AI song candidate', () => {
    const candidate = generator.processTranscript('Blessed assurance Jesus is mine', true, 300000);
    expect(candidate).not.toBeNull();

    if (!candidate) return;

    // Operator approves candidate via AuthorityManager
    const approvedCommand = authorityManager.approveCandidate(candidate);

    expect(approvedCommand).not.toBeNull();
    expect(approvedCommand?.action).toBe('start_show');
    expect(approvedCommand?.data).toEqual(
      expect.objectContaining({ name: 'Blessed Assurance' })
    );

    // Verify audit trail logged candidate creation and approval
    const auditEvents = authorityManager.getAuditLogger().getEvents(10);
    expect(auditEvents.some((e) => e.action === 'candidate_approved')).toBe(true);
  });

  it('fail-closed security: manual lock blocks AI song candidate approval', () => {
    const candidate = generator.processTranscript('Holy holy holy Lord God Almighty', true, 400000);
    expect(candidate).not.toBeNull();
    if (!candidate) return;

    // Engage manual lock
    authorityManager.setManualLock(true);

    // Operator attempt to approve AI candidate while locked
    const approvedCommand = authorityManager.approveCandidate(candidate);

    // MUST be null (fail-closed, projection forbidden under lock)
    expect(approvedCommand).toBeNull();
  });
});
