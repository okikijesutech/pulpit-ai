import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  findMatchingCanonBooks,
  getEasyWorshipCompletion,
  applyEasyWorshipSpaceStep,
  parseBatchScriptureReferences
} from '../src/renderer/utils/quickScriptureParser.js';
import {
  usePresentationStore,
  formatTimerMMSS,
  computeSecondsUntilClockTime
} from '../src/renderer/stores/presentationStore.js';
import { useUIStore } from '../src/renderer/stores/uiStore.js';
import { useAuthorityStore } from '../src/renderer/stores/authorityStore.js';

describe('v0.9.0 Live Operator Desk Features', () => {
  beforeEach(() => {
    usePresentationStore.setState({
      pinnedScriptures: [],
      mediaAssets: [],
      churchLogoId: null,
      activeMediaAsset: null,
      countdownTimer: {
        label: 'Service Starts In',
        mode: 'duration',
        totalSeconds: 300,
        remainingSeconds: 300,
        targetTimeStr: '09:00',
        isRunning: false,
        isProjected: false
      }
    });
    useUIStore.setState({
      isMediaModalOpen: false,
      isTimerModalOpen: false
    });
  });

  describe('1. EasyWorship Progressive Bible Search', () => {
    it('matches canonical books from partial prefixes and numbered book abbreviations', () => {
      expect(findMatchingCanonBooks('rom')[0]?.name).toBe('Romans');
      expect(findMatchingCanonBooks('1 th')[0]?.name).toBe('1 Thessalonians');
      expect(findMatchingCanonBooks('1cor')[0]?.name).toBe('1 Corinthians');
      expect(findMatchingCanonBooks('ps')[0]?.name).toBe('Psalms');
    });

    it('steps smoothly Book -> Chapter -> Verse on Spacebar just like EasyWorship', () => {
      // Lone numeral should let user type the space naturally (e.g., "1 " -> "1 cor")
      expect(applyEasyWorshipSpaceStep('1')).toBeNull();

      // Partial book name + Space -> locks canonical book name with trailing space
      expect(applyEasyWorshipSpaceStep('rom')).toBe('Romans ');
      expect(applyEasyWorshipSpaceStep('1 th')).toBe('1 Thessalonians ');

      // Locked book + valid chapter + Space -> appends colon for verse
      expect(applyEasyWorshipSpaceStep('Romans 8')).toBe('Romans 8:');
      expect(applyEasyWorshipSpaceStep('1 Thessalonians 1')).toBe('1 Thessalonians 1:');

      // Out-of-bounds chapter does not insert colon
      expect(applyEasyWorshipSpaceStep('Romans 99')).toBeNull();
    });

    it('provides inline ghost text and tracks book -> chapter -> verse stages', () => {
      const bookStage = getEasyWorshipCompletion('Rom');
      expect(bookStage.stage).toBe('book');
      expect(bookStage.matchedBook?.name).toBe('Romans');
      expect(bookStage.ghostText).toBe('ans');

      const chapterStage = getEasyWorshipCompletion('Romans ');
      expect(chapterStage.stage).toBe('chapter');
      expect(chapterStage.matchedBook?.name).toBe('Romans');

      const verseStage = getEasyWorshipCompletion('Romans 8:');
      expect(verseStage.stage).toBe('verse');
    });
  });

  describe('2. Pre-Service Pastoral Scripture Presets', () => {
    it('parses comma, semicolon, and newline separated passages and deduplicates them', () => {
      const parsed = parseBatchScriptureReferences(
        'Romans 8:28, Psalm 23:1-6\nJohn 3:16; rom 8 28; invalid text 99:99'
      );
      expect(parsed.map((p) => p.referenceString)).toEqual([
        'Romans 8:28',
        'Psalms 23:1-6',
        'John 3:16'
      ]);
    });

    it('loads batch pastor presets into Pastoral Memory with isPreset flag', async () => {
      const count = await usePresentationStore
        .getState()
        .loadPresetScriptures('John 3:16, Romans 8:28\n1 Cor 13:4-7');
      expect(count).toBe(3);

      const pins = usePresentationStore.getState().pinnedScriptures;
      expect(pins).toHaveLength(3);
      expect(pins.every((p) => p.isPreset === true)).toBe(true);
      expect(pins.map((p) => p.reference)).toEqual([
        'John 3:16',
        'Romans 8:28',
        '1 Corinthians 13:4-7'
      ]);
    });
  });

  describe('3. Media, Church Logo & Flyers Library', () => {
    it('imports media assets, sets default church logo, and dispatches allowlisted FreeShow commands', async () => {
      const dispatchMock = vi.fn().mockResolvedValue({ success: true });
      useAuthorityStore.setState({ dispatchCommand: dispatchMock });

      const { addMediaAsset, projectMediaAsset, projectChurchLogo, clearActiveMedia, removeMediaAsset } =
        usePresentationStore.getState();

      const logo = addMediaAsset({
        name: 'Grace Chapel Crest',
        category: 'logo',
        dataUrl: 'data:image/png;base64,AAA'
      });

      const flyer = addMediaAsset({
        name: 'Youth Conference Flyer',
        category: 'flyer',
        dataUrl: 'data:image/jpeg;base64,BBB'
      });

      expect(usePresentationStore.getState().mediaAssets).toHaveLength(2);
      expect(usePresentationStore.getState().churchLogoId).toBe(logo.id);

      await projectMediaAsset(flyer);
      expect(usePresentationStore.getState().activeMediaAsset?.id).toBe(flyer.id);
      expect(dispatchMock).toHaveBeenCalledWith('show_media', expect.objectContaining({ name: 'Youth Conference Flyer' }));

      await projectChurchLogo();
      expect(usePresentationStore.getState().activeMediaAsset?.id).toBe(logo.id);
      expect(dispatchMock).toHaveBeenCalledWith('show_logo', expect.objectContaining({ name: 'Grace Chapel Crest' }));

      await clearActiveMedia();
      expect(usePresentationStore.getState().activeMediaAsset).toBeNull();
      expect(dispatchMock).toHaveBeenCalledWith('clear_background');

      removeMediaAsset(logo.id);
      expect(usePresentationStore.getState().churchLogoId).toBeNull();
    });
  });

  describe('4. Service Countdown Timer & UI Modals', () => {
    it('formats MM:SS and HH:MM:SS cleanly and calculates clock target durations', () => {
      expect(formatTimerMMSS(300)).toBe('05:00');
      expect(formatTimerMMSS(65)).toBe('01:05');
      expect(formatTimerMMSS(3661)).toBe('01:01:01');

      const now = new Date('2026-11-17T08:50:00');
      expect(computeSecondsUntilClockTime('09:00', now)).toBe(600);
    });

    it('configures, ticks, projects, and stops countdown timer via AuthorityManager', async () => {
      const dispatchMock = vi.fn().mockResolvedValue({ success: true });
      useAuthorityStore.setState({ dispatchCommand: dispatchMock });

      const store = usePresentationStore.getState();
      store.configureTimer({ label: 'Sunday Service Starts In', mode: 'duration', totalSeconds: 120 });
      expect(usePresentationStore.getState().countdownTimer.remainingSeconds).toBe(120);

      await store.projectTimerToScreen();
      expect(usePresentationStore.getState().countdownTimer.isRunning).toBe(true);
      expect(usePresentationStore.getState().countdownTimer.isProjected).toBe(true);
      expect(dispatchMock).toHaveBeenCalledWith(
        'start_timer',
        expect.objectContaining({ label: 'Sunday Service Starts In', durationSeconds: 120 })
      );

      usePresentationStore.getState().tickTimer();
      expect(usePresentationStore.getState().countdownTimer.remainingSeconds).toBe(119);

      await usePresentationStore.getState().stopProjectedTimer();
      expect(usePresentationStore.getState().countdownTimer.isRunning).toBe(false);
      expect(usePresentationStore.getState().countdownTimer.isProjected).toBe(false);
      expect(dispatchMock).toHaveBeenCalledWith('stop_timer');
    });

    it('toggles Media and Timer modals in UI store', () => {
      const ui = useUIStore.getState();
      ui.toggleMediaModal();
      expect(useUIStore.getState().isMediaModalOpen).toBe(true);
      ui.closeMediaModal();
      expect(useUIStore.getState().isMediaModalOpen).toBe(false);

      ui.toggleTimerModal();
      expect(useUIStore.getState().isTimerModalOpen).toBe(true);
      ui.closeTimerModal();
      expect(useUIStore.getState().isTimerModalOpen).toBe(false);
    });
  });
});
