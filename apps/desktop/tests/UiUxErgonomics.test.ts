import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useUIStore } from '../src/renderer/stores/uiStore.js';
import { useAuthorityStore } from '../src/renderer/stores/authorityStore.js';

const RENDERER_DIR = join(__dirname, '../src/renderer');

describe('UI/UX Ergonomics & Live Sanctuary Booth Safety', () => {
  beforeEach(() => {
    useUIStore.getState().closeAllModals();
    useUIStore.getState().clearToast();
  });

  it('uiStore.closeAllModals atomically closes every modal and audio popover', () => {
    const ui = useUIStore.getState();
    ui.openBibleExplorer();
    ui.openSlideMatrix();
    ui.openStanzaMatrix();
    ui.openAnnouncementModal();
    ui.openServiceOrder();
    ui.openStageDisplayModal();
    ui.openMediaModal();
    ui.openTimerModal();
    ui.setAudioPopoverOpen(true);

    expect(useUIStore.getState().isBibleExplorerOpen).toBe(true);
    expect(useUIStore.getState().isTimerModalOpen).toBe(true);
    expect(useUIStore.getState().isAudioPopoverOpen).toBe(true);

    useUIStore.getState().closeAllModals();

    const after = useUIStore.getState();
    expect(after.isBibleExplorerOpen).toBe(false);
    expect(after.isSlideMatrixOpen).toBe(false);
    expect(after.isStanzaMatrixOpen).toBe(false);
    expect(after.isAnnouncementModalOpen).toBe(false);
    expect(after.isServiceOrderOpen).toBe(false);
    expect(after.isStageDisplayModalOpen).toBe(false);
    expect(after.isMediaModalOpen).toBe(false);
    expect(after.isTimerModalOpen).toBe(false);
    expect(after.isAudioPopoverOpen).toBe(false);
  });

  it('authorityStore routes rejected commands to non-blocking uiStore toast instead of window.alert', async () => {
    const alertSpy = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    (globalThis as any).window = {
      pulpitAPI: {
        dispatchOperatorCommand: vi.fn(async () => ({
          success: false,
          reason: 'FreeShow is currently disconnected.'
        }))
      }
    };
    (globalThis as any).alert = alertSpy;

    try {
      const res = await useAuthorityStore.getState().dispatchCommand('next_slide');
      expect(res.success).toBe(false);
      expect(alertSpy).not.toHaveBeenCalled();
      expect(useUIStore.getState().toastMessage).toContain('FreeShow is currently disconnected.');
      expect(useUIStore.getState().toastType).toBe('warning');
    } finally {
      warnSpy.mockRestore();
      delete (globalThis as any).window;
      delete (globalThis as any).alert;
    }
  });

  it('useGlobalHotkeys guards modal state so Escape closes modals instead of blacking out live output', () => {
    const content = readFileSync(join(RENDERER_DIR, 'hooks/useGlobalHotkeys.ts'), 'utf8');
    expect(content).toContain('isAnyModalOpen');
    expect(content).toContain('ui.closeAllModals()');
    const modalGuardIdx = content.indexOf('if (isAnyModalOpen)');
    const clearAllIdx = content.indexOf("dispatchCommand('clear_all')");
    expect(modalGuardIdx).toBeGreaterThan(-1);
    expect(clearAllIdx).toBeGreaterThan(modalGuardIdx);
  });

  it('human operator manual modals remain usable while Manual Safety Lock blocks AI', () => {
    const modalFiles = [
      'components/BibleExplorerModal.tsx',
      'components/SlideMatrixModal.tsx',
      'components/SongStanzaMatrixModal.tsx',
      'components/QuickAnnouncementModal.tsx',
      'components/SermonScripturePinboard.tsx'
    ];

    for (const rel of modalFiles) {
      const content = readFileSync(join(RENDERER_DIR, rel), 'utf8');
      expect(content, `${rel} should not disable operator controls via isLocked`).not.toMatch(
        /disabled=\{[^}]*\bisLocked\b/
      );
    }
  });

  it('decouples 60Hz audioLevel telemetry from Header.tsx into AudioVuMeter leaf and avoids heavy backdrop-filter', () => {
    const headerContent = readFileSync(join(RENDERER_DIR, 'components/Header.tsx'), 'utf8');
    expect(headerContent).toContain('<AudioVuMeter');
    expect(headerContent).not.toContain('useAudioStore((s) => s.audioLevel)');

    const cssContent = readFileSync(join(RENDERER_DIR, 'index.css'), 'utf8');
    expect(cssContent).not.toMatch(/backdrop-filter\s*:/i);
  });
});
