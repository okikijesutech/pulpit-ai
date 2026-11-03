import { describe, it, expect, beforeEach } from 'vitest';
import { AuthorityManager } from '../src/AuthorityManager.js';
import { FreeShowCommand, SuggestionCandidate } from '@pulpit-ai/shared-types';

describe('AuthorityManager', () => {
  let manager: AuthorityManager;

  beforeEach(() => {
    manager = new AuthorityManager();
  });

  it('initializes with safe fail-closed defaults', () => {
    const state = manager.getState();
    expect(state.operatorMode).toBe('suggestions');
    expect(state.listeningEnabled).toBe(true);
    expect(state.suggestionsEnabled).toBe(true);
    expect(state.projectionPermission).toBe(false);
    expect(state.manualLockActive).toBe(false);
    expect(state.freeShowConnected).toBe(false);
  });

  it('rejects commands with un-allowlisted action names with security severity', () => {
    manager.setFreeShowConnected(true);
    const maliciousCommand = {
      action: 'exec_arbitrary_shell' as any,
      source: 'operator',
      correlationId: 'test_1',
      createdAt: Date.now()
    } as FreeShowCommand;

    const decision = manager.authorizeCommand(maliciousCommand);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Action must be explicitly allowlisted');

    const auditEvents = manager.getAuditLogger().getEvents();
    expect(auditEvents[0].action).toBe('command_rejected_by_authority');
    expect(auditEvents[0].severity).toBe('security');
  });

  it('authorizes operator direct commands when FreeShow is connected', () => {
    manager.setFreeShowConnected(true);
    const command: FreeShowCommand = {
      action: 'next_slide',
      source: 'operator',
      correlationId: 'op_1',
      createdAt: Date.now()
    };

    const decision = manager.authorizeCommand(command);
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('Operator direct command');
    expect(manager.getState().lastOperatorActionAt).toBeGreaterThan(0);
  });

  it('rejects operator commands when FreeShow is disconnected', () => {
    manager.setFreeShowConnected(false);
    const command: FreeShowCommand = {
      action: 'next_slide',
      source: 'operator',
      correlationId: 'op_2',
      createdAt: Date.now()
    };

    const decision = manager.authorizeCommand(command);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('disconnected');
  });

  it('strictly blocks AI-originated projection in default suggestions mode', () => {
    manager.setFreeShowConnected(true);
    const aiCommand: FreeShowCommand = {
      action: 'next_slide',
      source: 'ai',
      correlationId: 'ai_1',
      createdAt: Date.now()
    };

    const decision = manager.authorizeCommand(aiCommand);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Suggestions mode is active');
  });

  it('strictly blocks AI-originated projection in manual mode', () => {
    manager.setFreeShowConnected(true);
    manager.setOperatorMode('manual');

    const aiCommand: FreeShowCommand = {
      action: 'next_slide',
      source: 'ai',
      correlationId: 'ai_2',
      createdAt: Date.now()
    };

    const decision = manager.authorizeCommand(aiCommand);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Operator is in Manual Mode');
  });

  it('manual safety lock immediately blocks all AI projection', () => {
    manager.setFreeShowConnected(true);
    manager.setManualLock(true, 'Emergency operator lock');

    expect(manager.getState().manualLockActive).toBe(true);

    const aiCommand: FreeShowCommand = {
      action: 'next_slide',
      source: 'ai',
      correlationId: 'ai_3',
      createdAt: Date.now()
    };

    const decision = manager.authorizeCommand(aiCommand);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Manual Safety Lock is active');
  });

  it('allows safe candidate approval workflow (scoped operator approval by ID)', () => {
    manager.setFreeShowConnected(true);

    const candidate: SuggestionCandidate = {
      id: 'cand_123',
      type: 'scripture',
      title: 'John 3:16',
      contentPreview: 'For God so loved the world...',
      confidence: 0.98,
      evidence: 'Spoken: "John chapter three verse sixteen"',
      detectedAt: Date.now(),
      status: 'pending',
      actionPayload: {
        action: 'start_scripture',
        data: { reference: 'John 3:16' },
        source: 'ai',
        correlationId: 'cand_123',
        createdAt: Date.now()
      }
    };

    // Register candidate in registry
    manager.registerCandidate(candidate);

    // Operator approves the suggestion strictly by ID
    const approval = manager.approveCandidate(candidate.id);
    expect(approval.success).toBe(true);
    expect(approval.command).toBeDefined();
    expect(approval.command!.source).toBe('operator');
    expect(candidate.status).toBe('approved');

    // Passing the approved command through the authority manager
    const decision = manager.authorizeCommand(approval.command!);
    expect(decision.allowed).toBe(true);
  });

  it('refuses candidate approval when manual lock is engaged', () => {
    manager.setFreeShowConnected(true);
    manager.setManualLock(true);

    const candidate: SuggestionCandidate = {
      id: 'cand_456',
      type: 'song',
      title: 'Amazing Grace',
      contentPreview: 'Amazing grace how sweet the sound',
      confidence: 0.95,
      evidence: 'Singing: "Amazing grace how sweet the sound"',
      detectedAt: Date.now(),
      status: 'pending',
      actionPayload: {
        action: 'start_show',
        data: { name: 'Amazing Grace' },
        source: 'ai',
        correlationId: 'cand_456',
        createdAt: Date.now()
      }
    };

    manager.registerCandidate(candidate);
    const approval = manager.approveCandidate(candidate.id);
    expect(approval.success).toBe(false);
    expect(approval.command).toBeUndefined();
    expect(approval.reason).toContain('Manual Safety Lock');
  });

  it('notifies listeners reactively on state transitions', () => {
    let notifiedState: any = null;
    const unsubscribe = manager.subscribe((state) => {
      notifiedState = state;
    });

    expect(notifiedState.manualLockActive).toBe(false);

    manager.setManualLock(true);
    expect(notifiedState.manualLockActive).toBe(true);

    manager.setOperatorMode('manual');
    expect(notifiedState.operatorMode).toBe('manual');

    unsubscribe();
    manager.setManualLock(false);
    // Should not update after unsubscribe
    expect(notifiedState.manualLockActive).toBe(true);
  });
});
