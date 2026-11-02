import { contextBridge, ipcRenderer } from 'electron';
import {
  AllowlistedAction,
  AuditEvent,
  AudioInputDevice,
  AuthorityState,
  FreeShowStateSnapshot,
  OperatorMode,
  SuggestionCandidate
} from '@pulpit-ai/shared-types';

export interface AudioLevelMetrics {
  rmsLevel: number;
  decibels: number;
  isClipping: boolean;
  isSilent: boolean;
}

export interface RecognizedTranscriptEvent {
  id: string;
  segmentId: string;
  sourceId: string;
  timestamp: number;
  rawText: string;
  normalizedText: string;
  tokens: string[];
  confidence: number;
  latencyMs: number;
}

export interface PulpitAPI {
  getAuthorityState: () => Promise<AuthorityState>;
  setManualLock: (active: boolean) => Promise<void>;
  setOperatorMode: (mode: OperatorMode) => Promise<void>;
  connectFreeShow: (port?: number) => Promise<boolean>;
  disconnectFreeShow: () => Promise<void>;
  getFreeShowSnapshot: () => Promise<FreeShowStateSnapshot>;
  dispatchOperatorCommand: (
    action: AllowlistedAction,
    data?: any
  ) => Promise<{ success: boolean; reason?: string }>;
  approveCandidate: (
    candidate: SuggestionCandidate
  ) => Promise<{ success: boolean; reason?: string }>;
  getAuditEvents: () => Promise<AuditEvent[]>;
  getAudioDevices: () => Promise<AudioInputDevice[]>;
  selectAudioDevice: (deviceId: string) => Promise<AudioInputDevice>;
  simulateSpeechInput: (phrase: string) => Promise<void>;
  getTranslations: () => Promise<any[]>;
  setActiveTranslation: (translationId: string) => Promise<string>;
  lookupPassage: (params: {
    translation: string;
    book: string;
    chapter: number;
    verseStart: number;
    verseEnd?: number;
  }) => Promise<any>;

  onAuthorityStateChange: (callback: (state: AuthorityState) => void) => () => void;
  onFreeShowStateChange: (callback: (snapshot: FreeShowStateSnapshot) => void) => () => void;
  onAuditEvent: (callback: (event: AuditEvent) => void) => () => void;
  onAudioLevelChange: (callback: (metrics: AudioLevelMetrics) => void) => () => void;
  onTranscriptEvent: (callback: (event: RecognizedTranscriptEvent) => void) => () => void;
  onScriptureCandidate: (callback: (candidate: SuggestionCandidate) => void) => () => void;
}

const api: PulpitAPI = {
  getAuthorityState: () => ipcRenderer.invoke('authority:get-state'),
  setManualLock: (active: boolean) => ipcRenderer.invoke('authority:set-lock', active),
  setOperatorMode: (mode: OperatorMode) => ipcRenderer.invoke('authority:set-mode', mode),
  connectFreeShow: (port?: number) => ipcRenderer.invoke('freeshow:connect', port),
  disconnectFreeShow: () => ipcRenderer.invoke('freeshow:disconnect'),
  getFreeShowSnapshot: () => ipcRenderer.invoke('freeshow:get-snapshot'),
  dispatchOperatorCommand: (action: AllowlistedAction, data?: any) =>
    ipcRenderer.invoke('freeshow:dispatch-command', { action, data }),
  approveCandidate: (candidate: SuggestionCandidate) =>
    ipcRenderer.invoke('authority:approve-candidate', candidate),
  getAuditEvents: () => ipcRenderer.invoke('audit:get-events'),
  getAudioDevices: () => ipcRenderer.invoke('audio:get-devices'),
  selectAudioDevice: (deviceId: string) => ipcRenderer.invoke('audio:select-device', deviceId),
  simulateSpeechInput: (phrase: string) => ipcRenderer.invoke('audio:simulate-speech', phrase),
  getTranslations: () => ipcRenderer.invoke('scripture:get-translations'),
  setActiveTranslation: (translationId: string) =>
    ipcRenderer.invoke('scripture:set-translation', translationId),
  lookupPassage: (params) => ipcRenderer.invoke('scripture:lookup-passage', params),

  onAuthorityStateChange: (callback) => {
    const handler = (_event: any, state: AuthorityState) => callback(state);
    ipcRenderer.on('authority:state-changed', handler);
    return () => ipcRenderer.removeListener('authority:state-changed', handler);
  },

  onFreeShowStateChange: (callback) => {
    const handler = (_event: any, snapshot: FreeShowStateSnapshot) => callback(snapshot);
    ipcRenderer.on('freeshow:state-changed', handler);
    return () => ipcRenderer.removeListener('freeshow:state-changed', handler);
  },

  onAuditEvent: (callback) => {
    const handler = (_event: any, event: AuditEvent) => callback(event);
    ipcRenderer.on('audit:new-event', handler);
    return () => ipcRenderer.removeListener('audit:new-event', handler);
  },

  onAudioLevelChange: (callback) => {
    const handler = (_event: any, metrics: AudioLevelMetrics) => callback(metrics);
    ipcRenderer.on('audio:level-changed', handler);
    return () => ipcRenderer.removeListener('audio:level-changed', handler);
  },

  onTranscriptEvent: (callback) => {
    const handler = (_event: any, event: RecognizedTranscriptEvent) => callback(event);
    ipcRenderer.on('speech:transcript', handler);
    return () => ipcRenderer.removeListener('speech:transcript', handler);
  },

  onScriptureCandidate: (callback) => {
    const handler = (_event: any, candidate: SuggestionCandidate) => callback(candidate);
    ipcRenderer.on('scripture:candidate', handler);
    return () => ipcRenderer.removeListener('scripture:candidate', handler);
  }
};

contextBridge.exposeInMainWorld('pulpitAPI', api);

