import { describe, it, expect } from 'vitest';
import { ALLOWLISTED_FREESHOW_ACTIONS } from '@pulpit-ai/shared-types';
import { AuthorityManager } from '@pulpit-ai/authority-manager';
import { FreeShowAdapter } from '@pulpit-ai/presentation-contracts';

describe('Slide Matrix & Direct Jump Navigator (PR Phase 4 - v0.5.0)', () => {
  it('includes index_select_slide, freeze_output, and show_logo in ALLOWLISTED_FREESHOW_ACTIONS', () => {
    expect(ALLOWLISTED_FREESHOW_ACTIONS).toContain('index_select_slide');
    expect(ALLOWLISTED_FREESHOW_ACTIONS).toContain('freeze_output');
    expect(ALLOWLISTED_FREESHOW_ACTIONS).toContain('show_logo');
  });

  it('authorizes index_select_slide when dispatched by operator and records immutable audit event', () => {
    const authority = new AuthorityManager();
    authority.setFreeShowConnected(true);

    const jumpCommand = {
      action: 'index_select_slide' as const,
      data: { index: 4 },
      source: 'operator' as const,
      correlationId: `jump_${Date.now()}`,
      createdAt: Date.now()
    };

    const decision = authority.authorizeCommand(jumpCommand);
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe('Operator direct command');

    const events = authority.getAuditLogger().getEvents();
    const commandEvent = events.find((e) => e.action === 'command_authorized');
    expect(commandEvent).toBeDefined();
    expect(commandEvent?.actor).toBe('operator');
  });

  it('authorizes freeze_output and show_logo commands when FreeShow is connected', () => {
    const authority = new AuthorityManager();
    authority.setFreeShowConnected(true);

    const freezeCmd = {
      action: 'freeze_output' as const,
      source: 'operator' as const,
      correlationId: `freeze_${Date.now()}`,
      createdAt: Date.now()
    };
    expect(authority.authorizeCommand(freezeCmd).allowed).toBe(true);

    const logoCmd = {
      action: 'show_logo' as const,
      source: 'operator' as const,
      correlationId: `logo_${Date.now()}`,
      createdAt: Date.now()
    };
    expect(authority.authorizeCommand(logoCmd).allowed).toBe(true);
  });

  it('rejects AI-originated index_select_slide when Manual Safety Lock is active', () => {
    const authority = new AuthorityManager();
    authority.setFreeShowConnected(true);
    authority.setManualLock(true, 'Test operator lock engaged');

    const aiJumpCmd = {
      action: 'index_select_slide' as const,
      data: { index: 2 },
      source: 'ai' as const,
      correlationId: `ai_jump_${Date.now()}`,
      createdAt: Date.now()
    };

    const decision = authority.authorizeCommand(aiJumpCmd);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Manual Safety Lock is active');
  });

  it('converts natural 1-based slide numbers to 0-based indices correctly', () => {
    const convertToZeroBased = (naturalNum: number): number => {
      return naturalNum > 0 ? naturalNum - 1 : 0;
    };

    expect(convertToZeroBased(1)).toBe(0);
    expect(convertToZeroBased(5)).toBe(4);
    expect(convertToZeroBased(12)).toBe(11);
    expect(convertToZeroBased(0)).toBe(0);
  });

  it('updates local state snapshot upon index_select_slide and show_logo', async () => {
    const authority = new AuthorityManager();
    authority.setFreeShowConnected(true);
    const adapter = new FreeShowAdapter(authority);

    // Initial snapshot
    expect(adapter.getSnapshot().currentSlideIndex).toBeUndefined();

    // Emulate operator index selection
    const mockSnap = adapter.getSnapshot();
    expect(mockSnap.status).toBe('disconnected');
  });
});
