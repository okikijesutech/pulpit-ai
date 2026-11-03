import { describe, it, expect, beforeEach } from 'vitest';
import { AuthorityManager } from '@pulpit-ai/authority-manager';
import { FreeShowAdapter, MockFreeShowServer } from '@pulpit-ai/presentation-contracts';
import { SuggestionCandidate } from '@pulpit-ai/shared-types';

describe('PR 3: Main Process Candidate Approval by ID End-to-End', () => {
  let authorityManager: AuthorityManager;
  let mockServer: MockFreeShowServer;
  let adapter: FreeShowAdapter;
  let serverPort: number;

  beforeEach(async () => {
    authorityManager = new AuthorityManager();
    mockServer = new MockFreeShowServer();
    serverPort = await mockServer.start();

    adapter = new FreeShowAdapter(authorityManager, {
      host: '127.0.0.1',
      port: serverPort
    });
    await adapter.connect();
  });

  const simulateCandidateIssued = (id: string, ref: string, timestamp = Date.now()): SuggestionCandidate => {
    const candidate: SuggestionCandidate = {
      id,
      type: 'scripture',
      title: ref,
      contentPreview: 'Verified scripture verse content',
      confidence: 0.95,
      evidence: `Spoken: "${ref}"`,
      detectedAt: timestamp,
      status: 'pending',
      actionPayload: {
        action: 'start_scripture',
        data: { reference: ref },
        source: 'ai',
        correlationId: `corr_${id}`,
        createdAt: timestamp
      }
    };
    authorityManager.registerCandidate(candidate, timestamp);
    return candidate;
  };

  it('approves a registered candidate by ID, dispatches to FreeShow, and records audit trail', async () => {
    const cand = simulateCandidateIssued('cand_real_1', 'John 3:16');

    // Simulate IPC authority:approve-candidate handler behavior
    const approval = authorityManager.approveCandidate(cand.id);
    expect(approval.success).toBe(true);
    expect(approval.command).toBeDefined();

    const dispatchResult = await adapter.dispatchCommand(approval.command!);
    expect(dispatchResult.success).toBe(true);

    // Verify snapshot was updated with the genuine stored payload
    const snapshot = adapter.getSnapshot();
    expect(snapshot.currentShowId).toContain('John 3:16');
  });

  it('forged payload rejected: rejects forged payload object directly submitted to approval handler', async () => {
    const forgedObject = {
      id: 'forged_fake_id',
      actionPayload: {
        action: 'start_scripture',
        data: { reference: 'Malicious 1:1' }
      }
    };

    // Handler rejects non-string candidateId
    const approval = authorityManager.approveCandidate(forgedObject as any);
    expect(approval.success).toBe(false);
    expect(approval.reason?.toLowerCase()).toContain('forged');

    // Never dispatched
    const snapshot = adapter.getSnapshot();
    expect(snapshot.currentShowId).not.toContain('Malicious');
  });

  it('replay rejected: replaying an already approved candidate ID is rejected', async () => {
    const cand = simulateCandidateIssued('cand_replay_test', 'Romans 8:28');

    // First approval succeeds
    const firstApproval = authorityManager.approveCandidate(cand.id);
    expect(firstApproval.success).toBe(true);
    const firstDispatch = await adapter.dispatchCommand(firstApproval.command!);
    expect(firstDispatch.success).toBe(true);

    // Second approval attempt (replay)
    const replayApproval = authorityManager.approveCandidate(cand.id);
    expect(replayApproval.success).toBe(false);
    expect(replayApproval.reason).toContain('already');
  });

  it('expired rejected: candidate approval expires after 2 minutes (120s)', () => {
    const now = Date.now();
    const oldCand = simulateCandidateIssued('cand_old_1', 'Psalm 23:1', now - 125_000);

    const approval = authorityManager.approveCandidate(oldCand.id, now);
    expect(approval.success).toBe(false);
    expect(approval.reason).toContain('expired');
  });

  it('lock active rejected: manual lock prevents approval even with valid candidate ID', async () => {
    const cand = simulateCandidateIssued('cand_locked_test', 'Isaiah 53:5');

    // Operator activates emergency lock
    authorityManager.setManualLock(true);

    const approval = authorityManager.approveCandidate(cand.id);
    expect(approval.success).toBe(false);
    expect(approval.reason).toContain('Manual Safety Lock');
  });
});
