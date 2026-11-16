import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_SUNDAY_LITURGY,
  LiturgyCueItem
} from '../src/renderer/components/ServiceOrderModal.js';
import { usePresentationStore } from '../src/renderer/stores/presentationStore.js';
import { useAuthorityStore } from '../src/renderer/stores/authorityStore.js';
import { useUIStore } from '../src/renderer/stores/uiStore.js';
import { useAudioStore } from '../src/renderer/stores/audioStore.js';

describe('Service Order Liturgy Run-Sheet & Zustand State Integration', () => {
  beforeEach(() => {
    // Reset all stores to clean state before each test
    usePresentationStore.getState().resetServiceOrder();
    useUIStore.setState({
      isBibleExplorerOpen: false,
      isSlideMatrixOpen: false,
      isStanzaMatrixOpen: false,
      isAnnouncementModalOpen: false,
      isServiceOrderOpen: false,
      isAudioPopoverOpen: false
    });
  });

  it('initializes default Sunday liturgy with exactly 8 structured cues in sequence', () => {
    expect(DEFAULT_SUNDAY_LITURGY).toHaveLength(8);
    expect(DEFAULT_SUNDAY_LITURGY[0].title).toBe('Pre-Service Welcome & Countdown');
    expect(DEFAULT_SUNDAY_LITURGY[0].category).toBe('loop');
    expect(DEFAULT_SUNDAY_LITURGY[0].showName).toBe('Pre-Service Loop');
    expect(DEFAULT_SUNDAY_LITURGY[0].status).toBe('active');

    expect(DEFAULT_SUNDAY_LITURGY[1].title).toBe('Call to Worship & Scripture Reading');
    expect(DEFAULT_SUNDAY_LITURGY[1].category).toBe('prayer');
    expect(DEFAULT_SUNDAY_LITURGY[1].scriptureReference).toBe('Psalm 100:1-5');

    expect(DEFAULT_SUNDAY_LITURGY[7].title).toBe('Closing Hymn & Benediction Dismissal');
    expect(DEFAULT_SUNDAY_LITURGY[7].category).toBe('dismissal');
  });

  it('selects a service cue with showName and dispatches name_select_show', async () => {
    const dispatchSpy = vi.fn().mockResolvedValue({ success: true });
    useAuthorityStore.setState({ dispatchCommand: dispatchSpy });

    await usePresentationStore.getState().selectServiceCue(0);

    const { serviceCues, activeCueIndex } = usePresentationStore.getState();
    expect(activeCueIndex).toBe(0);
    expect(serviceCues[0].status).toBe('active');
    expect(dispatchSpy).toHaveBeenCalledWith('name_select_show', { name: 'Pre-Service Loop' });
  });

  it('selects a service cue with scriptureReference and dispatches start_scripture', async () => {
    const dispatchSpy = vi.fn().mockResolvedValue({ success: true });
    useAuthorityStore.setState({ dispatchCommand: dispatchSpy });

    await usePresentationStore.getState().selectServiceCue(1);

    const { serviceCues, activeCueIndex } = usePresentationStore.getState();
    expect(activeCueIndex).toBe(1);
    expect(serviceCues[0].status).toBe('completed');
    expect(serviceCues[1].status).toBe('active');
    expect(serviceCues[2].status).toBe('pending');
    expect(dispatchSpy).toHaveBeenCalledWith('start_scripture', { reference: 'Psalm 100:1-5' });
  });

  it('advances service cues sequentially and respects upper boundary', async () => {
    const dispatchSpy = vi.fn().mockResolvedValue({ success: true });
    useAuthorityStore.setState({ dispatchCommand: dispatchSpy });

    // Move to index 6
    for (let i = 0; i < 6; i++) {
      await usePresentationStore.getState().advanceServiceCue();
    }
    expect(usePresentationStore.getState().activeCueIndex).toBe(6);

    // Advance to last cue (index 7)
    await usePresentationStore.getState().advanceServiceCue();
    expect(usePresentationStore.getState().activeCueIndex).toBe(7);

    // Attempting to advance beyond index 7 should stay at index 7
    await usePresentationStore.getState().advanceServiceCue();
    expect(usePresentationStore.getState().activeCueIndex).toBe(7);
  });

  it('resets liturgy run-sheet back to initial state', async () => {
    await usePresentationStore.getState().selectServiceCue(4);
    expect(usePresentationStore.getState().activeCueIndex).toBe(4);

    usePresentationStore.getState().resetServiceOrder();
    const { activeCueIndex, serviceCues } = usePresentationStore.getState();
    expect(activeCueIndex).toBe(0);
    expect(serviceCues[0].status).toBe('active');
    expect(serviceCues[1].status).toBe('pending');
  });

  it('toggles UI modals via useUIStore with zero prop drilling', () => {
    const ui = useUIStore.getState();
    expect(ui.isBibleExplorerOpen).toBe(false);

    ui.openBibleExplorer();
    expect(useUIStore.getState().isBibleExplorerOpen).toBe(true);

    ui.closeBibleExplorer();
    expect(useUIStore.getState().isBibleExplorerOpen).toBe(false);

    ui.toggleServiceOrder();
    expect(useUIStore.getState().isServiceOrderOpen).toBe(true);

    ui.toggleServiceOrder();
    expect(useUIStore.getState().isServiceOrderOpen).toBe(false);
  });

  it('manages audio store metrics and gain levels atomically', () => {
    const audio = useAudioStore.getState();
    expect(audio.micGainDb).toBe(0);

    useAudioStore.getState().setMicGainDb(12);
    expect(useAudioStore.getState().micGainDb).toBe(12);

    useAudioStore.getState().setAudioLevel({
      rmsLevel: 0.25,
      decibels: -14.2,
      isClipping: false,
      isSilent: false
    });
    expect(useAudioStore.getState().audioLevel.decibels).toBe(-14.2);
  });
});
