import { describe, it, expect, vi } from 'vitest';
import { ALLOWLISTED_FREESHOW_ACTIONS } from '@pulpit-ai/shared-types';
import { AuthorityManager } from '@pulpit-ai/authority-manager';

describe('Quick Announcements & Lower-Third Alert Ticker (PR Phase 3)', () => {
  it('includes show_announcement, start_overlay, and clear_overlays in ALLOWLISTED_FREESHOW_ACTIONS', () => {
    expect(ALLOWLISTED_FREESHOW_ACTIONS).toContain('show_announcement');
    expect(ALLOWLISTED_FREESHOW_ACTIONS).toContain('start_overlay');
    expect(ALLOWLISTED_FREESHOW_ACTIONS).toContain('clear_overlays');
  });

  it('authorizes show_announcement when dispatched by operator and records immutable audit event', () => {
    const authority = new AuthorityManager();
    authority.setFreeShowConnected(true);

    const announcementCommand = {
      action: 'show_announcement' as const,
      data: {
        text: '🚗 PARKING ALERT: Silver Toyota Corolla (LAG-412-XA) — Blocking driveway entrance.',
        style: 'amber',
        duration: 30
      },
      source: 'operator' as const,
      correlationId: `ann_test_${Date.now()}`,
      createdAt: Date.now()
    };

    const decision = authority.authorizeCommand(announcementCommand);
    expect(decision.allowed).toBe(true);

    const events = authority.getAuditLogger().getEvents();
    const commandEvent = events.find((e) => e.action === 'command_authorized');
    expect(commandEvent).toBeDefined();
    expect(commandEvent?.actor).toBe('operator');
  });

  it('authorizes clear_overlays to remove active lower third from sanctuary screen', () => {
    const authority = new AuthorityManager();
    authority.setFreeShowConnected(true);

    const clearCommand = {
      action: 'clear_overlays' as const,
      source: 'operator' as const,
      correlationId: `clear_test_${Date.now()}`,
      createdAt: Date.now()
    };

    const decision = authority.authorizeCommand(clearCommand);
    expect(decision.allowed).toBe(true);
  });

  it('formats vehicle parking alert templates with license plate and model', () => {
    const formatParking = (plate: string, model: string, reason: string): string => {
      const p = plate.trim().toUpperCase() || 'UNKNOWN';
      const m = model.trim() || 'Vehicle';
      const r = reason.trim() || 'Please move immediately';
      return `🚗 PARKING ALERT: ${m} (${p}) — ${r}.`;
    };

    const formatted = formatParking('LAG-412-XA', 'Silver Toyota Corolla', 'Blocking driveway entrance');
    expect(formatted).toBe('🚗 PARKING ALERT: Silver Toyota Corolla (LAG-412-XA) — Blocking driveway entrance.');
  });

  it('formats nursery child/baby call templates', () => {
    const formatNursery = (tag: string, location: string): string => {
      const t = tag.trim() || '#42';
      const loc = location.trim() || "Children's Department";
      return `👶 NURSERY CALL: Parent of Child with Tag ${t}, please report to the ${loc}.`;
    };

    const formatted = formatNursery('Tag #108', "Children's Church");
    expect(formatted).toBe("👶 NURSERY CALL: Parent of Child with Tag Tag #108, please report to the Children's Church.");
  });

  it('formats tithes, offering & church banking templates', () => {
    const formatGiving = (bank: string, account: string, name: string, ussd?: string): string => {
      const b = bank.trim();
      const a = account.trim();
      const n = name.trim();
      const u = ussd?.trim() ? ` | USSD: ${ussd.trim()}` : '';
      return `💳 TITHES & OFFERING: ${b} | Acc: ${a} | Name: ${n}${u}`;
    };

    const formatted = formatGiving('Zenith Bank', '1012345678', 'RCCG Sanctuary of Praise', '*966*000*123#');
    expect(formatted).toBe('💳 TITHES & OFFERING: Zenith Bank | Acc: 1012345678 | Name: RCCG Sanctuary of Praise | USSD: *966*000*123#');
  });
});
