import { describe, it, expect, beforeEach } from 'vitest';
import { AuthorityManager } from '../src/AuthorityManager.js';
import { SuggestionCandidate } from '@pulpit-ai/shared-types';

describe('PR 3: Candidate Approval by ID (Security & Life-cycle Guards)', () => {
  let manager: AuthorityManager;

  const createTestCandidate = (id = 'cand_valid_1', detectedAt = Date.now()): SuggestionCandidate => ({
    id,
    type: 'scripture',
    title: 'John 3:16',
    contentPreview: 'For God so loved the world...',
    confidence: 0.98,
    evidence: 'Spoken: "John chapter three verse sixteen"',
    detectedAt,
    status: 'pending',
    actionPayload: {
      action: 'start_scripture',
      data: { reference: 'John 3:16' },
      source: 'ai',
      correlationId: `corr_${id}`,
      createdAt: detectedAt
    }
  });

  beforeEach(() => {
    manager = new AuthorityManager();
    manager.setFreeShowConnected(true);
  });

  it('approves a registered candidate by ID and returns an operator-scoped command', () => {
    const candidate = createTestCandidate('cand_100');
    manager.registerCandidate(candidate);

    const approval = manager.approveCandidate('cand_100');
    expect(approval.success).toBe(true);
    expect(approval.command).toBeDefined();
    expect(approval.command?.source).toBe('operator');
    expect(approval.command?.action).toBe('start_scripture');
    expect(approval.command?.data).toEqual({ reference: 'John 3:16' });

    // Stored candidate status updated
    expect(candidate.status).toBe('approved');

    // Audit trail records candidate_approved
    const events = manager.getAuditLogger().getEvents();
    expect(events.some((e) => e.action === 'candidate_approved')).toBe(true);
  });

  it('forged payload rejected: rejects approval when payload object is passed instead of candidateId', () => {
    const forgedPayload = {
      id: 'forged_cand',
      actionPayload: {
        action: 'start_scripture',
        data: { reference: 'Malicious 1:1' }
      }
    };

    const approval = manager.approveCandidate(forgedPayload as any);
    expect(approval.success).toBe(false);
    expect(approval.command).toBeUndefined();
    expect(approval.reason?.toLowerCase()).toContain('forged');

    // Audit trail records security rejection
    const events = manager.getAuditLogger().getEvents();
    const securityEvent = events.find((e) => e.severity === 'security');
    expect(securityEvent).toBeDefined();
    expect(securityEvent?.action).toBe('candidate_rejected');
  });

  it('forged payload rejected: rejects unknown candidateId not in the registry', () => {
    const approval = manager.approveCandidate('unregistered_cand_999');
    expect(approval.success).toBe(false);
    expect(approval.command).toBeUndefined();
    expect(approval.reason?.toLowerCase()).toContain('unknown');

    // Audit trail records security rejection
    const events = manager.getAuditLogger().getEvents();
    const secEvent = events.find((e) => e.severity === 'security');
    expect(secEvent).toBeDefined();
  });

  it('replay rejected: candidate approval is single-use only', () => {
    const candidate = createTestCandidate('cand_single_use');
    manager.registerCandidate(candidate);

    // First approval succeeds
    const firstApproval = manager.approveCandidate('cand_single_use');
    expect(firstApproval.success).toBe(true);
    expect(firstApproval.command).toBeDefined();

    // Replay attempt fails immediately
    const replayApproval = manager.approveCandidate('cand_single_use');
    expect(replayApproval.success).toBe(false);
    expect(replayApproval.command).toBeUndefined();
    expect(replayApproval.reason?.toLowerCase()).toContain('already');

    // Audit trail records rejection
    const events = manager.getAuditLogger().getEvents();
    expect(events.some((e) => e.action === 'candidate_rejected' && String(e.details.reason).includes('already'))).toBe(true);
  });

  it('expired rejected: candidates older than 2 minutes are rejected', () => {
    const now = Date.now();
    const candidate = createTestCandidate('cand_expired', now - 121_000); // 2 min 1 sec ago
    manager.registerCandidate(candidate, now - 121_000);

    // Attempt to approve at current time
    const approval = manager.approveCandidate('cand_expired', now);
    expect(approval.success).toBe(false);
    expect(approval.command).toBeUndefined();
    expect(approval.reason?.toLowerCase()).toContain('expired');

    // Audit trail records rejection
    const events = manager.getAuditLogger().getEvents();
    expect(events.some((e) => e.action === 'candidate_rejected' && String(e.details.reason).includes('expired'))).toBe(true);
  });

  it('lock active rejected: manual lock blocks candidate approval even with valid registered ID', () => {
    const candidate = createTestCandidate('cand_locked');
    manager.registerCandidate(candidate);

    // Activate manual lock
    manager.setManualLock(true, 'Operator locked projection');

    // Attempt approval while locked
    const approval = manager.approveCandidate('cand_locked');
    expect(approval.success).toBe(false);
    expect(approval.command).toBeUndefined();
    expect(approval.reason?.toLowerCase()).toContain('lock');

    // Audit trail records rejection
    const events = manager.getAuditLogger().getEvents();
    expect(events.some((e) => e.action === 'candidate_rejected' && String(e.details.reason).includes('Lock'))).toBe(true);
  });
});
