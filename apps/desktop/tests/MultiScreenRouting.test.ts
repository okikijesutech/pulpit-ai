import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePresentationStore } from '../src/renderer/stores/presentationStore.js';
import { useUIStore } from '../src/renderer/stores/uiStore.js';
import { useAuthorityStore } from '../src/renderer/stores/authorityStore.js';
import { DEFAULT_STAGE_PRESETS } from '@pulpit-ai/shared-types';

describe('Phase 7: Multi-Screen Stage Confidence & Output Routing Matrix', () => {
  beforeEach(() => {
    // Reset Zustand stores
    usePresentationStore.setState({
      activeMonitorTarget: 'main',
      stagePresets: DEFAULT_STAGE_PRESETS,
      stagePrivateMessage: null
    });

    useUIStore.setState({
      isStageDisplayModalOpen: false
    });
  });

  it('initializes with 3 default stage display presets', () => {
    const { stagePresets, activeMonitorTarget } = usePresentationStore.getState();
    expect(activeMonitorTarget).toBe('main');
    expect(stagePresets).toHaveLength(3);

    const mainPreset = stagePresets.find((p) => p.target === 'main');
    const foldbackPreset = stagePresets.find((p) => p.target === 'foldback');
    const streamPreset = stagePresets.find((p) => p.target === 'stream');

    expect(mainPreset).toBeDefined();
    expect(mainPreset?.name).toContain('Auditorium Main');

    expect(foldbackPreset).toBeDefined();
    expect(foldbackPreset?.showClock).toBe(true);
    expect(foldbackPreset?.showNextSlide).toBe(true);
    expect(foldbackPreset?.showLiturgyCue).toBe(true);

    expect(streamPreset).toBeDefined();
    expect(streamPreset?.target).toBe('stream');
  });

  it('switches active monitor target between main, foldback, and stream', () => {
    const { setActiveMonitorTarget } = usePresentationStore.getState();

    setActiveMonitorTarget('foldback');
    expect(usePresentationStore.getState().activeMonitorTarget).toBe('foldback');

    setActiveMonitorTarget('stream');
    expect(usePresentationStore.getState().activeMonitorTarget).toBe('stream');

    setActiveMonitorTarget('main');
    expect(usePresentationStore.getState().activeMonitorTarget).toBe('main');
  });

  it('updates stage preset elements dynamically (clock, next slide, liturgy cue)', () => {
    const { updateStagePreset } = usePresentationStore.getState();

    updateStagePreset('preset_foldback', {
      showClock: false,
      showNextSlide: false
    });

    const updated = usePresentationStore
      .getState()
      .stagePresets.find((p) => p.id === 'preset_foldback');

    expect(updated?.showClock).toBe(false);
    expect(updated?.showNextSlide).toBe(false);
    expect(updated?.showLiturgyCue).toBe(true); // unchanged
  });

  it('manages private stage prompt messaging and sends IPC commands via AuthorityManager', async () => {
    const dispatchMock = vi.fn().mockResolvedValue({ status: 'dispatched' });
    useAuthorityStore.setState({
      dispatchCommand: dispatchMock
    });

    const { sendStageMessage, clearStageMessage } = usePresentationStore.getState();

    // 1. Send private prompt
    await sendStageMessage('Pastor, 2 minutes left to altar call');
    expect(usePresentationStore.getState().stagePrivateMessage).toBe('Pastor, 2 minutes left to altar call');
    expect(dispatchMock).toHaveBeenCalledWith('set_stage_message', {
      message: 'Pastor, 2 minutes left to altar call'
    });

    // 2. Clear private prompt
    await clearStageMessage();
    expect(usePresentationStore.getState().stagePrivateMessage).toBeNull();
    expect(dispatchMock).toHaveBeenCalledWith('clear_stage_message');
  });

  it('manages StageDisplayModal visibility in UI store', () => {
    const { openStageDisplayModal, closeStageDisplayModal, toggleStageDisplayModal } =
      useUIStore.getState();

    expect(useUIStore.getState().isStageDisplayModalOpen).toBe(false);

    openStageDisplayModal();
    expect(useUIStore.getState().isStageDisplayModalOpen).toBe(true);

    closeStageDisplayModal();
    expect(useUIStore.getState().isStageDisplayModalOpen).toBe(false);

    toggleStageDisplayModal();
    expect(useUIStore.getState().isStageDisplayModalOpen).toBe(true);

    toggleStageDisplayModal();
    expect(useUIStore.getState().isStageDisplayModalOpen).toBe(false);
  });
});
