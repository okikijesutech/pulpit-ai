import { create } from 'zustand';
import {
  AuditEvent,
  SuggestionCandidate,
  DisplayTarget,
  StageDisplayPreset,
  DEFAULT_STAGE_PRESETS
} from '@pulpit-ai/shared-types';
import { RecognizedTranscriptEvent } from '../../preload/index.js';
import { PinnedScripture } from '../components/SermonScripturePinboard.js';
import { LiturgyCueItem, DEFAULT_SUNDAY_LITURGY } from '../components/ServiceOrderModal.js';
import { ActiveAnnouncement, AnnouncementStyle } from '../components/QuickAnnouncementModal.js';
import { parseBatchScriptureReferences } from '../utils/quickScriptureParser.js';
import { useAuthorityStore } from './authorityStore.js';

export type MediaCategory = 'logo' | 'flyer' | 'background';

export interface MediaAsset {
  id: string;
  name: string;
  category: MediaCategory;
  dataUrl: string;
  filePath?: string;
  createdAt: number;
}

export interface CountdownTimerState {
  label: string;
  mode: 'duration' | 'target_time';
  totalSeconds: number;
  remainingSeconds: number;
  targetTimeStr: string;
  isRunning: boolean;
  isProjected: boolean;
}

const PRESETS_STORAGE_KEY = 'pulpit_pastoral_presets_v1';
const MEDIA_STORAGE_KEY = 'pulpit_media_assets_v1';
const LOGO_ID_STORAGE_KEY = 'pulpit_church_logo_id_v1';

function loadStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveStoredJson(key: string, value: unknown): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore localStorage quota exceeded errors gracefully
  }
}

export function formatTimerMMSS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function computeSecondsUntilClockTime(targetHHMM: string, now: Date = new Date()): number {
  const match = targetHHMM.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 300;
  const targetH = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const targetM = Math.min(59, Math.max(0, parseInt(match[2], 10)));

  const target = new Date(now);
  target.setHours(targetH, targetM, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return Math.max(1, Math.round((target.getTime() - now.getTime()) / 1000));
}

interface PresentationStoreState {
  candidates: SuggestionCandidate[];
  pinnedScriptures: PinnedScripture[];
  transcripts: RecognizedTranscriptEvent[];
  auditEvents: AuditEvent[];
  activeTranslation: string;
  activeAnnouncement: ActiveAnnouncement | null;
  serviceCues: LiturgyCueItem[];
  activeCueIndex: number;

  // Phase 7 Multi-Screen Confidence Presets
  activeMonitorTarget: DisplayTarget;
  stagePresets: StageDisplayPreset[];
  stagePrivateMessage: string | null;

  // Media, Church Logo & Flyer Graphics
  mediaAssets: MediaAsset[];
  churchLogoId: string | null;
  activeMediaAsset: MediaAsset | null;

  // Service Countdown Timer
  countdownTimer: CountdownTimerState;

  setCandidates: (candidates: SuggestionCandidate[] | ((prev: SuggestionCandidate[]) => SuggestionCandidate[])) => void;
  addCandidate: (candidate: SuggestionCandidate) => void;
  dismissCandidate: (id: string) => void;
  approveCandidate: (candidate: SuggestionCandidate) => Promise<boolean>;

  setPinnedScriptures: (pins: PinnedScripture[] | ((prev: PinnedScripture[]) => PinnedScripture[])) => void;
  pinScripture: (reference: string, textSnippet?: string, isPreset?: boolean) => void;
  loadPresetScriptures: (rawBatchText: string) => Promise<number>;
  directProjectScripture: (reference: string, fullText?: string) => Promise<void>;
  clearPinnedScriptures: () => void;
  removePinnedScripture: (id: string) => void;

  addTranscript: (event: RecognizedTranscriptEvent) => void;
  setTranscripts: (events: RecognizedTranscriptEvent[]) => void;
  clearTranscripts: () => void;

  setAuditEvents: (events: AuditEvent[]) => void;
  addAuditEvent: (event: AuditEvent) => void;
  refreshAuditEvents: () => Promise<void>;

  setActiveTranslation: (translation: string) => void;

  setActiveAnnouncement: (announcement: ActiveAnnouncement | null) => void;
  broadcastAnnouncement: (text: string, durationSeconds: number, style: AnnouncementStyle) => Promise<void>;
  clearOverlay: () => Promise<void>;

  // Service Order Liturgy Run-Sheet Actions
  selectServiceCue: (index: number) => Promise<void>;
  advanceServiceCue: () => Promise<void>;
  resetServiceOrder: () => void;
  updateServiceCue: (index: number, updated: Partial<LiturgyCueItem>) => void;
  addServiceCue: (cue: Omit<LiturgyCueItem, 'id' | 'orderIndex' | 'status'>) => void;
  removeServiceCue: (index: number) => void;
  moveServiceCue: (fromIndex: number, toIndex: number) => void;
  setServiceCues: (cues: LiturgyCueItem[]) => void;

  // Multi-Screen Stage Confidence Actions
  setActiveMonitorTarget: (target: DisplayTarget) => void;
  setStagePrivateMessage: (msg: string | null) => void;
  sendStageMessage: (msg: string) => Promise<void>;
  clearStageMessage: () => Promise<void>;
  updateStagePreset: (id: string, updated: Partial<StageDisplayPreset>) => void;

  // Media & Graphics Actions
  addMediaAsset: (asset: Omit<MediaAsset, 'id' | 'createdAt'>) => MediaAsset;
  removeMediaAsset: (id: string) => void;
  setChurchLogo: (id: string | null) => void;
  projectMediaAsset: (asset: MediaAsset) => Promise<void>;
  projectChurchLogo: () => Promise<void>;
  clearActiveMedia: () => Promise<void>;

  // Countdown Timer Actions
  configureTimer: (config: Partial<Pick<CountdownTimerState, 'label' | 'mode' | 'totalSeconds' | 'targetTimeStr'>>) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  tickTimer: () => void;
  projectTimerToScreen: () => Promise<void>;
  stopProjectedTimer: () => Promise<void>;
}

const DEFAULT_TIMER_STATE: CountdownTimerState = {
  label: 'Service Starts In',
  mode: 'duration',
  totalSeconds: 300,
  remainingSeconds: 300,
  targetTimeStr: '09:00',
  isRunning: false,
  isProjected: false
};

export const usePresentationStore = create<PresentationStoreState>((set, get) => ({
  candidates: [],
  pinnedScriptures: loadStoredJson<PinnedScripture[]>(PRESETS_STORAGE_KEY, []),
  transcripts: [],
  auditEvents: [],
  activeTranslation: 'WEB',
  activeAnnouncement: null,
  serviceCues: DEFAULT_SUNDAY_LITURGY,
  activeCueIndex: 0,

  activeMonitorTarget: 'main',
  stagePresets: DEFAULT_STAGE_PRESETS,
  stagePrivateMessage: null,

  mediaAssets: loadStoredJson<MediaAsset[]>(MEDIA_STORAGE_KEY, []),
  churchLogoId: loadStoredJson<string | null>(LOGO_ID_STORAGE_KEY, null),
  activeMediaAsset: null,

  countdownTimer: { ...DEFAULT_TIMER_STATE },

  setCandidates: (update) =>
    set((s) => ({
      candidates: typeof update === 'function' ? update(s.candidates) : update
    })),

  addCandidate: (candidate) =>
    set((s) => ({
      candidates: [
        candidate,
        ...s.candidates.filter(
          (c) => (!candidate.supersedesId || c.id !== candidate.supersedesId) && c.title !== candidate.title
        )
      ]
    })),

  dismissCandidate: (id) =>
    set((s) => ({
      candidates: s.candidates.filter((c) => c.id !== id)
    })),

  approveCandidate: async (candidate) => {
    const { manualLockActive } = useAuthorityStore.getState().authorityState;
    if (manualLockActive || typeof window === 'undefined' || !window.pulpitAPI) return false;

    const result = await window.pulpitAPI.approveCandidate(candidate.id);
    if (result.success) {
      set((s) => ({
        candidates: s.candidates.filter((c) => c.id !== candidate.id),
        activeMediaAsset: null
      }));

      if (candidate.type === 'scripture') {
        const refMatch = candidate.title.replace(/\s*\([A-Z]+\)$/i, '').trim();
        get().pinScripture(refMatch, candidate.contentPreview);
      }

      await get().refreshAuditEvents();
      return true;
    }
    return false;
  },

  setPinnedScriptures: (update) =>
    set((s) => {
      const next = typeof update === 'function' ? update(s.pinnedScriptures) : update;
      saveStoredJson(PRESETS_STORAGE_KEY, next);
      return { pinnedScriptures: next };
    }),

  pinScripture: (reference, textSnippet = '', isPreset = false) => {
    const translation = get().activeTranslation;
    const existing = get().pinnedScriptures.find((p) => p.reference === reference);
    const newPin: PinnedScripture = {
      id: existing?.id || `pin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      reference,
      translation,
      textSnippet: textSnippet || existing?.textSnippet || '',
      timestamp: Date.now(),
      isPreset: isPreset || existing?.isPreset
    };
    set((s) => {
      const next = [newPin, ...s.pinnedScriptures.filter((p) => p.reference !== reference)];
      saveStoredJson(PRESETS_STORAGE_KEY, next);
      return { pinnedScriptures: next };
    });
  },

  loadPresetScriptures: async (rawBatchText) => {
    const parsed = parseBatchScriptureReferences(rawBatchText);
    if (parsed.length === 0) return 0;

    const translation = get().activeTranslation;
    const newPins: PinnedScripture[] = [];

    for (const item of parsed) {
      let snippet = '';
      if (
        typeof window !== 'undefined' &&
        window.pulpitAPI &&
        item.bookName &&
        item.chapter &&
        item.verseStart
      ) {
        try {
          const res: any = await window.pulpitAPI.lookupPassage({
            translation,
            book: item.bookName,
            chapter: item.chapter,
            verseStart: item.verseStart,
            verseEnd: item.verseEnd
          });
          if (res?.found) {
            snippet = res.formattedText || res.fullText || '';
          }
        } catch {
          // Keep empty snippet if lookup fails
        }
      }

      newPins.push({
        id: `preset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        reference: item.referenceString!,
        translation,
        textSnippet: snippet,
        timestamp: Date.now(),
        isPreset: true
      });
    }

    set((s) => {
      const incomingRefs = new Set(newPins.map((p) => p.reference));
      const preserved = s.pinnedScriptures.filter((p) => !incomingRefs.has(p.reference));
      const next = [...newPins, ...preserved];
      saveStoredJson(PRESETS_STORAGE_KEY, next);
      return { pinnedScriptures: next };
    });

    return newPins.length;
  },

  directProjectScripture: async (reference, fullText) => {
    const translation = get().activeTranslation;
    set({ activeMediaAsset: null });
    await useAuthorityStore.getState().dispatchCommand('start_scripture', {
      reference,
      text: fullText,
      translation
    });
    get().pinScripture(reference, fullText);
    await get().refreshAuditEvents();
  },

  clearPinnedScriptures: () => {
    saveStoredJson(PRESETS_STORAGE_KEY, []);
    set({ pinnedScriptures: [] });
  },

  removePinnedScripture: (id) =>
    set((s) => {
      const next = s.pinnedScriptures.filter((p) => p.id !== id);
      saveStoredJson(PRESETS_STORAGE_KEY, next);
      return { pinnedScriptures: next };
    }),

  addTranscript: (event) =>
    set((s) => ({
      transcripts: [event, ...s.transcripts].slice(0, 50)
    })),

  setTranscripts: (events) => set({ transcripts: events.slice(0, 50) }),
  clearTranscripts: () => set({ transcripts: [] }),

  setAuditEvents: (events) => set({ auditEvents: events.slice(0, 50) }),
  addAuditEvent: (event) =>
    set((s) => ({
      auditEvents: [event, ...s.auditEvents].slice(0, 50)
    })),

  refreshAuditEvents: async () => {
    if (typeof window !== 'undefined' && window.pulpitAPI) {
      const events = await window.pulpitAPI.getAuditEvents();
      set({ auditEvents: events.slice(0, 50) });
    }
  },

  setActiveTranslation: (translation) => set({ activeTranslation: translation }),

  setActiveAnnouncement: (announcement) => set({ activeAnnouncement: announcement }),

  broadcastAnnouncement: async (text, durationSeconds, style) => {
    const announcement: ActiveAnnouncement = {
      id: `ann_${Date.now()}`,
      category: 'custom',
      text,
      durationSeconds,
      remainingSeconds: durationSeconds,
      style,
      startedAt: Date.now()
    };
    set({ activeAnnouncement: announcement });
    await useAuthorityStore.getState().dispatchCommand('show_announcement', {
      text,
      style,
      duration: durationSeconds
    });
    await get().refreshAuditEvents();
  },

  clearOverlay: async () => {
    set({ activeAnnouncement: null });
    await useAuthorityStore.getState().dispatchCommand('clear_overlays');
    await get().refreshAuditEvents();
  },

  selectServiceCue: async (index) => {
    const cues = get().serviceCues;
    const target = cues[index];
    if (!target) return;

    set({
      activeCueIndex: index,
      serviceCues: cues.map((c, i) => ({
        ...c,
        status: i === index ? 'active' : i < index ? 'completed' : 'pending'
      }))
    });

    if (target.showName) {
      await useAuthorityStore.getState().dispatchCommand('name_select_show', { name: target.showName });
    } else if (target.scriptureReference) {
      await useAuthorityStore.getState().dispatchCommand('start_scripture', { reference: target.scriptureReference });
    }
  },

  advanceServiceCue: async () => {
    const { activeCueIndex, serviceCues } = get();
    if (activeCueIndex < serviceCues.length - 1) {
      await get().selectServiceCue(activeCueIndex + 1);
    }
  },

  resetServiceOrder: () =>
    set({
      activeCueIndex: 0,
      serviceCues: DEFAULT_SUNDAY_LITURGY
    }),

  updateServiceCue: (index, updated) =>
    set((s) => ({
      serviceCues: s.serviceCues.map((c, i) => (i === index ? { ...c, ...updated } : c))
    })),

  addServiceCue: (cue) =>
    set((s) => {
      const newCue: LiturgyCueItem = {
        ...cue,
        id: `cue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        orderIndex: s.serviceCues.length,
        status: 'pending'
      };
      return { serviceCues: [...s.serviceCues, newCue] };
    }),

  removeServiceCue: (index) =>
    set((s) => {
      const updated = s.serviceCues.filter((_, i) => i !== index).map((c, i) => ({ ...c, orderIndex: i }));
      const nextIndex = Math.min(s.activeCueIndex, Math.max(0, updated.length - 1));
      return { serviceCues: updated, activeCueIndex: nextIndex };
    }),

  moveServiceCue: (fromIndex, toIndex) =>
    set((s) => {
      if (toIndex < 0 || toIndex >= s.serviceCues.length) return {};
      const items = [...s.serviceCues];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return { serviceCues: items.map((c, i) => ({ ...c, orderIndex: i })) };
    }),

  setServiceCues: (cues) => set({ serviceCues: cues }),

  // Multi-Screen Actions
  setActiveMonitorTarget: (target) => set({ activeMonitorTarget: target }),
  setStagePrivateMessage: (msg) => set({ stagePrivateMessage: msg }),

  sendStageMessage: async (msg) => {
    set({ stagePrivateMessage: msg });
    await useAuthorityStore.getState().dispatchCommand('set_stage_message', { message: msg });
    await get().refreshAuditEvents();
  },

  clearStageMessage: async () => {
    set({ stagePrivateMessage: null });
    await useAuthorityStore.getState().dispatchCommand('clear_stage_message');
    await get().refreshAuditEvents();
  },

  updateStagePreset: (id, updated) =>
    set((s) => ({
      stagePresets: s.stagePresets.map((p) => (p.id === id ? { ...p, ...updated } : p))
    })),

  // Media, Church Logo & Flyers Actions
  addMediaAsset: (asset) => {
    const newAsset: MediaAsset = {
      ...asset,
      id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now()
    };
    set((s) => {
      const nextAssets = [newAsset, ...s.mediaAssets];
      saveStoredJson(MEDIA_STORAGE_KEY, nextAssets);
      const nextLogoId = asset.category === 'logo' && !s.churchLogoId ? newAsset.id : s.churchLogoId;
      if (nextLogoId !== s.churchLogoId) {
        saveStoredJson(LOGO_ID_STORAGE_KEY, nextLogoId);
      }
      return { mediaAssets: nextAssets, churchLogoId: nextLogoId };
    });
    return newAsset;
  },

  removeMediaAsset: (id) =>
    set((s) => {
      const nextAssets = s.mediaAssets.filter((a) => a.id !== id);
      const nextLogoId = s.churchLogoId === id ? null : s.churchLogoId;
      const nextActive = s.activeMediaAsset?.id === id ? null : s.activeMediaAsset;
      saveStoredJson(MEDIA_STORAGE_KEY, nextAssets);
      saveStoredJson(LOGO_ID_STORAGE_KEY, nextLogoId);
      return {
        mediaAssets: nextAssets,
        churchLogoId: nextLogoId,
        activeMediaAsset: nextActive
      };
    }),

  setChurchLogo: (id) => {
    saveStoredJson(LOGO_ID_STORAGE_KEY, id);
    set({ churchLogoId: id });
  },

  projectMediaAsset: async (asset) => {
    set({ activeMediaAsset: asset });
    const action = asset.category === 'logo' ? 'show_logo' : 'show_media';
    await useAuthorityStore.getState().dispatchCommand(action, {
      id: asset.id,
      name: asset.name,
      category: asset.category,
      filePath: asset.filePath
    });
    await get().refreshAuditEvents();
  },

  projectChurchLogo: async () => {
    const { mediaAssets, churchLogoId } = get();
    const logoAsset = mediaAssets.find((a) => a.id === churchLogoId) || mediaAssets.find((a) => a.category === 'logo') || null;
    set({ activeMediaAsset: logoAsset });
    await useAuthorityStore.getState().dispatchCommand('show_logo', {
      id: logoAsset?.id,
      name: logoAsset?.name || 'Church Logo',
      filePath: logoAsset?.filePath
    });
    await get().refreshAuditEvents();
  },

  clearActiveMedia: async () => {
    set({ activeMediaAsset: null });
    await useAuthorityStore.getState().dispatchCommand('clear_background');
    await get().refreshAuditEvents();
  },

  // Service Countdown Timer Actions
  configureTimer: (config) =>
    set((s) => {
      const nextMode = config.mode ?? s.countdownTimer.mode;
      const nextTargetStr = config.targetTimeStr ?? s.countdownTimer.targetTimeStr;
      const nextTotal =
        nextMode === 'target_time'
          ? computeSecondsUntilClockTime(nextTargetStr)
          : Math.max(1, config.totalSeconds ?? s.countdownTimer.totalSeconds);

      return {
        countdownTimer: {
          ...s.countdownTimer,
          ...config,
          mode: nextMode,
          targetTimeStr: nextTargetStr,
          totalSeconds: nextTotal,
          remainingSeconds: nextTotal,
          isRunning: false
        }
      };
    }),

  startTimer: () =>
    set((s) => {
      const remaining =
        s.countdownTimer.mode === 'target_time'
          ? computeSecondsUntilClockTime(s.countdownTimer.targetTimeStr)
          : s.countdownTimer.remainingSeconds > 0
            ? s.countdownTimer.remainingSeconds
            : s.countdownTimer.totalSeconds;
      return {
        countdownTimer: {
          ...s.countdownTimer,
          remainingSeconds: remaining,
          isRunning: true
        }
      };
    }),

  pauseTimer: () =>
    set((s) => ({
      countdownTimer: {
        ...s.countdownTimer,
        isRunning: false
      }
    })),

  resetTimer: () =>
    set((s) => {
      const nextTotal =
        s.countdownTimer.mode === 'target_time'
          ? computeSecondsUntilClockTime(s.countdownTimer.targetTimeStr)
          : s.countdownTimer.totalSeconds;
      return {
        countdownTimer: {
          ...s.countdownTimer,
          totalSeconds: nextTotal,
          remainingSeconds: nextTotal,
          isRunning: false
        }
      };
    }),

  tickTimer: () =>
    set((s) => {
      if (!s.countdownTimer.isRunning) return {};
      if (s.countdownTimer.remainingSeconds <= 1) {
        return {
          countdownTimer: {
            ...s.countdownTimer,
            remainingSeconds: 0,
            isRunning: false
          }
        };
      }
      return {
        countdownTimer: {
          ...s.countdownTimer,
          remainingSeconds: s.countdownTimer.remainingSeconds - 1
        }
      };
    }),

  projectTimerToScreen: async () => {
    const state = get().countdownTimer;
    const remaining =
      state.mode === 'target_time'
        ? computeSecondsUntilClockTime(state.targetTimeStr)
        : state.remainingSeconds > 0
          ? state.remainingSeconds
          : state.totalSeconds;

    set({
      countdownTimer: {
        ...state,
        remainingSeconds: remaining,
        isRunning: true,
        isProjected: true
      }
    });

    await useAuthorityStore.getState().dispatchCommand('start_timer', {
      label: state.label,
      durationSeconds: remaining,
      formatted: formatTimerMMSS(remaining)
    });
    await get().refreshAuditEvents();
  },

  stopProjectedTimer: async () => {
    set((s) => ({
      countdownTimer: {
        ...s.countdownTimer,
        isRunning: false,
        isProjected: false
      }
    }));

    await useAuthorityStore.getState().dispatchCommand('stop_timer');
    await get().refreshAuditEvents();
  }
}));
