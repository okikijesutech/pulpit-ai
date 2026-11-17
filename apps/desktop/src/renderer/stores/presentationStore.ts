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
import { useAuthorityStore } from './authorityStore.js';

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

  setCandidates: (candidates: SuggestionCandidate[] | ((prev: SuggestionCandidate[]) => SuggestionCandidate[])) => void;
  addCandidate: (candidate: SuggestionCandidate) => void;
  dismissCandidate: (id: string) => void;
  approveCandidate: (candidate: SuggestionCandidate) => Promise<boolean>;

  setPinnedScriptures: (pins: PinnedScripture[] | ((prev: PinnedScripture[]) => PinnedScripture[])) => void;
  pinScripture: (reference: string, textSnippet?: string) => void;
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
}

export const usePresentationStore = create<PresentationStoreState>((set, get) => ({
  candidates: [],
  pinnedScriptures: [],
  transcripts: [],
  auditEvents: [],
  activeTranslation: 'WEB',
  activeAnnouncement: null,
  serviceCues: DEFAULT_SUNDAY_LITURGY,
  activeCueIndex: 0,

  activeMonitorTarget: 'main',
  stagePresets: DEFAULT_STAGE_PRESETS,
  stagePrivateMessage: null,

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
    if (typeof window === 'undefined' || !window.pulpitAPI) return false;
    const res = await window.pulpitAPI.approveCandidate(candidate.id);
    if (res.success) {
      set((s) => ({
        candidates: s.candidates.filter((c) => c.id !== candidate.id)
      }));

      if (candidate.type === 'scripture') {
        get().pinScripture(candidate.title, candidate.contentPreview);
      }
      await get().refreshAuditEvents();
      return true;
    } else {
      if (typeof alert !== 'undefined') {
        alert(`Approval rejected: ${res.reason}`);
      }
      return false;
    }
  },

  setPinnedScriptures: (update) =>
    set((s) => ({
      pinnedScriptures: typeof update === 'function' ? update(s.pinnedScriptures) : update
    })),

  pinScripture: (reference, textSnippet) => {
    const translation = get().activeTranslation;
    const newPin: PinnedScripture = {
      id: `pin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      reference,
      translation,
      textSnippet: textSnippet || reference,
      timestamp: Date.now()
    };
    set((s) => ({
      pinnedScriptures: [newPin, ...s.pinnedScriptures.filter((p) => p.reference !== reference)]
    }));
  },

  directProjectScripture: async (reference, fullText) => {
    const translation = get().activeTranslation;
    await useAuthorityStore.getState().dispatchCommand('start_scripture', {
      reference,
      text: fullText,
      translation
    });
    get().pinScripture(reference, fullText);
    await get().refreshAuditEvents();
  },

  clearPinnedScriptures: () => set({ pinnedScriptures: [] }),
  removePinnedScripture: (id) =>
    set((s) => ({
      pinnedScriptures: s.pinnedScriptures.filter((p) => p.id !== id)
    })),

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

  resetServiceOrder: () => {
    set({
      activeCueIndex: 0,
      serviceCues: DEFAULT_SUNDAY_LITURGY
    });
  },

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
    }))
}));
