import { describe, it, expect, beforeEach } from 'vitest';
import { AuthorityManager } from '@pulpit-ai/authority-manager';
import { NativePresentationEngine } from '../src/NativePresentationEngine.js';
import { PresentationCommand } from '@pulpit-ai/shared-types';

describe('NativePresentationEngine Autonomous Projection', () => {
  let authorityManager: AuthorityManager;
  let engine: NativePresentationEngine;
  let lastEmittedSlide: any = null;
  let lastEmittedCleared = false;

  beforeEach(() => {
    authorityManager = new AuthorityManager();
    lastEmittedSlide = null;
    lastEmittedCleared = false;

    engine = new NativePresentationEngine(authorityManager, {
      onSlideChanged: (slide, isCleared) => {
        lastEmittedSlide = slide;
        lastEmittedCleared = isCleared;
      }
    });
  });

  it('initializes disconnected and transitions to native_active upon connect()', async () => {
    expect(engine.getStatus()).toBe('disconnected');
    expect(engine.getSnapshot().connected).toBe(false);

    const connected = await engine.connect();
    expect(connected).toBe(true);
    expect(engine.getStatus()).toBe('native_active');
    expect(engine.getSnapshot().connected).toBe(true);
    expect(authorityManager.getState().freeShowConnected).toBe(true);
  });

  it('renders start_scripture command natively with anti-halation metadata and single-slide format', async () => {
    await engine.connect();

    const cmd: PresentationCommand = {
      action: 'start_scripture',
      source: 'operator',
      data: {
        reference: 'Romans 8:28',
        text: 'And we know that all things work together for good to them that love God.',
        translation: 'WEB'
      },
      correlationId: 'test_romans_828',
      createdAt: Date.now()
    };

    const res = await engine.dispatchCommand(cmd);
    expect(res.success).toBe(true);
    expect(res.status).toBe('confirmed');

    const snap = engine.getSnapshot();
    expect(snap.currentSlideText).toContain('all things work together for good');
    expect(snap.isOutputCleared).toBe(false);
    expect(snap.activeSlide?.category).toBe('scripture');
    expect(snap.activeSlide?.headerTitle).toBe('Romans 8:28');
    expect(snap.activeSlide?.citationSubtext).toBe('Romans 8:28 (WEB)');

    expect(lastEmittedSlide).not.toBeNull();
    expect(lastEmittedSlide?.primaryBody).toContain('all things work together for good');
    expect(lastEmittedCleared).toBe(false);
  });

  it('handles blackout clear_all and restore_output correctly', async () => {
    await engine.connect();

    // Project verse first
    await engine.dispatchCommand({
      action: 'start_scripture',
      source: 'operator',
      data: { reference: 'John 3:16', text: 'For God so loved the world...' },
      correlationId: 'c1',
      createdAt: Date.now()
    });

    expect(engine.getSnapshot().isOutputCleared).toBe(false);

    // Blackout
    await engine.dispatchCommand({
      action: 'clear_all',
      source: 'operator',
      correlationId: 'c2',
      createdAt: Date.now()
    });

    expect(engine.getSnapshot().isOutputCleared).toBe(true);
    expect(engine.getSnapshot().currentSlideText).toBe('');
    expect(lastEmittedCleared).toBe(true);

    // Restore
    await engine.dispatchCommand({
      action: 'restore_output',
      source: 'operator',
      correlationId: 'c3',
      createdAt: Date.now()
    });

    expect(engine.getSnapshot().isOutputCleared).toBe(false);
    expect(engine.getSnapshot().currentSlideText).toContain('For God so loved the world');
    expect(lastEmittedCleared).toBe(false);
  });

  it('blocks AI commands when Manual Safety Lock is engaged', async () => {
    await engine.connect();
    authorityManager.setManualLock(true);

    const aiCmd: PresentationCommand = {
      action: 'start_scripture',
      source: 'ai',
      data: { reference: 'Psalm 23:1', text: 'The Lord is my shepherd;' },
      correlationId: 'ai_psalm23',
      createdAt: Date.now()
    };

    const res = await engine.dispatchCommand(aiCmd);
    expect(res.success).toBe(false);
    expect(res.status).toBe('rejected');
    expect(res.reason).toContain('Manual Safety Lock');
  });

  it('projects church logo splash screen cleanly on show_logo', async () => {
    await engine.connect();

    const res = await engine.dispatchCommand({
      action: 'show_logo',
      source: 'operator',
      correlationId: 'cmd_logo',
      createdAt: Date.now()
    });

    expect(res.success).toBe(true);
    expect(engine.getSnapshot().activeSlide?.category).toBe('logo');
    expect(lastEmittedSlide?.category).toBe('logo');
  });
});
