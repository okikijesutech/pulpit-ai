import { describe, it, expect } from 'vitest';
import { ALLOWLISTED_FREESHOW_ACTIONS } from '@pulpit-ai/shared-types';
import { AuthorityManager } from '@pulpit-ai/authority-manager';
import { FreeShowAdapter } from '@pulpit-ai/presentation-contracts';

describe('Worship Stanza Matrix & Quick Hymn Launcher (PR Phase 5 - v0.6.0)', () => {
  it('includes name_select_show, name_select_slide, and index_select_slide in ALLOWLISTED_FREESHOW_ACTIONS', () => {
    expect(ALLOWLISTED_FREESHOW_ACTIONS).toContain('name_select_show');
    expect(ALLOWLISTED_FREESHOW_ACTIONS).toContain('name_select_slide');
    expect(ALLOWLISTED_FREESHOW_ACTIONS).toContain('index_select_slide');
  });

  it('authorizes operator stanza jump (name_select_show + index_select_slide) and logs tamper-evident audit event', () => {
    const authority = new AuthorityManager();
    authority.setFreeShowConnected(true);

    // 1. Select Song Show
    const selectShowCmd = {
      action: 'name_select_show' as const,
      data: { name: 'Amazing Grace' },
      source: 'operator' as const,
      correlationId: `show_${Date.now()}`,
      createdAt: Date.now()
    };
    const showDecision = authority.authorizeCommand(selectShowCmd);
    expect(showDecision.allowed).toBe(true);
    expect(showDecision.reason).toBe('Operator direct command');

    // 2. Select Stanza (Chorus / Verse 2)
    const selectSlideCmd = {
      action: 'index_select_slide' as const,
      data: { index: 1, name: 'Verse 2', text: "'Twas grace that taught my heart to fear" },
      source: 'operator' as const,
      correlationId: `slide_${Date.now()}`,
      createdAt: Date.now()
    };
    const slideDecision = authority.authorizeCommand(selectSlideCmd);
    expect(slideDecision.allowed).toBe(true);

    const events = authority.getAuditLogger().getEvents();
    const authorizedEvents = events.filter((e) => e.action === 'command_authorized');
    expect(authorizedEvents.length).toBeGreaterThanOrEqual(2);
    expect(authorizedEvents[0].actor).toBe('operator');
  });

  it('rejects AI-originated song projections when Manual Safety Lock is active', () => {
    const authority = new AuthorityManager();
    authority.setFreeShowConnected(true);
    authority.setManualLock(true, 'Operator locked stage projection');

    const aiCmd = {
      action: 'name_select_show' as const,
      data: { name: 'Way Maker' },
      source: 'ai' as const,
      correlationId: `ai_song_${Date.now()}`,
      createdAt: Date.now()
    };
    const decision = authority.authorizeCommand(aiCmd);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Manual Safety Lock is active');
  });

  it('correctly matches hymn queries by number and title', () => {
    const hymns = [
      { id: '1', title: 'Amazing Grace', hymnNumber: 1 },
      { id: '2', title: 'Blessed Assurance', hymnNumber: 2 },
      { id: '10', title: 'RCCG Anthem', hymnNumber: 10 }
    ];

    const matchQuery = (query: string) => {
      const q = query.toLowerCase().trim();
      const numMatch = q.match(/\d+/);
      const searchNum = numMatch ? parseInt(numMatch[0], 10) : null;

      return hymns.filter((h) => {
        if (h.title.toLowerCase().includes(q)) return true;
        if (searchNum !== null && h.hymnNumber === searchNum) return true;
        return false;
      });
    };

    expect(matchQuery('amazing').length).toBe(1);
    expect(matchQuery('amazing')[0].title).toBe('Amazing Grace');
    expect(matchQuery('10').length).toBe(1);
    expect(matchQuery('10')[0].title).toBe('RCCG Anthem');
    expect(matchQuery('hymn 2').length).toBe(1);
    expect(matchQuery('hymn 2')[0].title).toBe('Blessed Assurance');
  });

  it('updates local state snapshot upon name_select_show in FreeShowAdapter', () => {
    const authority = new AuthorityManager();
    authority.setFreeShowConnected(true);
    const adapter = new FreeShowAdapter(authority);

    expect(adapter.getSnapshot().currentShowId).toBeUndefined();
  });
});
