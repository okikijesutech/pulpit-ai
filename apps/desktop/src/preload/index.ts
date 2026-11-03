import { contextBridge, ipcRenderer } from 'electron';
import {
  AllowlistedAction,
  AuditEvent,
  AudioInputDevice,
  AuthorityState,
  FreeShowStateSnapshot,
  OperatorMode,
  Song,
  SuggestionCandidate
} from '@pulpit-ai/shared-types';
import {
  ApprovalOptions,
  SongSearchResult,
  StagedImportSong,
  BackupArchive,
  RestoreResult
} from '@pulpit-ai/song-engine';

export interface AudioLevelMetrics {
  rmsLevel: number;
  decibels: number;
  isClipping: boolean;
  isSilent: boolean;
}

export interface AudioActivityMetrics {
  mode: 'silence' | 'speech' | 'singing';
  isSinging: boolean;
  isSpeech: boolean;
  harmonicity: number;
  estimatedPitchHz: number | null;
  pitchStability: number;
  confidence: number;
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
    candidateId: string
  ) => Promise<{ success: boolean; reason?: string }>;
  getAuditEvents: () => Promise<AuditEvent[]>;
  getAudioDevices: () => Promise<AudioInputDevice[]>;
  selectAudioDevice: (deviceId: string) => Promise<AudioInputDevice>;
  simulateSpeechInput: (phrase: string) => Promise<void>;
  simulateSingingInput: (lyrics: string) => Promise<void>;
  getTranslations: () => Promise<any[]>;
  setActiveTranslation: (translationId: string) => Promise<string>;
  lookupPassage: (params: {
    translation: string;
    book: string;
    chapter: number;
    verseStart: number;
    verseEnd?: number;
  }) => Promise<any>;

  // Song Library & Imports
  listSongs: () => Promise<Song[]>;
  searchSongs: (query: string) => Promise<SongSearchResult[]>;
  getSong: (id: string) => Promise<Song | null>;
  stageSongFile: (file: {
    name: string;
    base64: string;
  }) => Promise<{
    success: boolean;
    staged?: StagedImportSong[];
    errors?: string[];
    warnings?: string[];
    quarantined?: boolean;
  }>;
  stageSongText: (
    text: string,
    title?: string
  ) => Promise<{
    success: boolean;
    staged?: StagedImportSong;
    errors?: string[];
  }>;
  listStagedImports: () => Promise<StagedImportSong[]>;
  approveStagedImport: (
    stagedId: string,
    options: ApprovalOptions
  ) => Promise<{
    success: boolean;
    song?: Song;
    error?: string;
  }>;
  rejectStagedImport: (
    stagedId: string,
    reason: string
  ) => Promise<{ success: boolean }>;
  projectSongSection: (
    songTitle: string,
    sectionLabel: string,
    sectionIndex: number
  ) => Promise<{ success: boolean; reason?: string }>;

  // Live Physical Microphone & Speech Stream
  streamAudioChunk: (chunk: ArrayBuffer) => void;
  sendDirectTranscript: (text: string, isSinging?: boolean) => void;

  // Backup & Disaster Recovery
  createBackup: () => Promise<BackupArchive>;
  restoreBackup: (
    archive: BackupArchive,
    clearExisting?: boolean
  ) => Promise<RestoreResult>;

  onAuthorityStateChange: (callback: (state: AuthorityState) => void) => () => void;
  onFreeShowStateChange: (callback: (snapshot: FreeShowStateSnapshot) => void) => () => void;
  onAuditEvent: (callback: (event: AuditEvent) => void) => () => void;
  onAudioLevelChange: (callback: (metrics: AudioLevelMetrics) => void) => () => void;
  onAudioActivityMode: (callback: (metrics: AudioActivityMetrics) => void) => () => void;
  onTranscriptEvent: (callback: (event: RecognizedTranscriptEvent) => void) => () => void;
  onScriptureCandidate: (callback: (candidate: SuggestionCandidate) => void) => () => void;
  onSongCandidate: (callback: (candidate: SuggestionCandidate) => void) => () => void;
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
  approveCandidate: (candidateId: string) =>
    ipcRenderer.invoke('authority:approve-candidate', candidateId),
  getAuditEvents: () => ipcRenderer.invoke('audit:get-events'),
  getAudioDevices: () => ipcRenderer.invoke('audio:get-devices'),
  selectAudioDevice: (deviceId: string) => ipcRenderer.invoke('audio:select-device', deviceId),
  simulateSpeechInput: (phrase: string) => ipcRenderer.invoke('audio:simulate-speech', phrase),
  simulateSingingInput: (lyrics: string) => ipcRenderer.invoke('audio:simulate-singing', lyrics),
  getTranslations: () => ipcRenderer.invoke('scripture:get-translations'),
  setActiveTranslation: (translationId: string) =>
    ipcRenderer.invoke('scripture:set-translation', translationId),
  lookupPassage: (params) => ipcRenderer.invoke('scripture:lookup-passage', params),
  listSongs: () => ipcRenderer.invoke('songs:list'),
  searchSongs: (query: string) => ipcRenderer.invoke('songs:search', query),
  getSong: (id: string) => ipcRenderer.invoke('songs:get', id),
  stageSongFile: (file) => ipcRenderer.invoke('songs:stage-file', file),
  stageSongText: (text, title) => ipcRenderer.invoke('songs:stage-text', { text, title }),
  listStagedImports: () => ipcRenderer.invoke('songs:list-staged'),
  approveStagedImport: (stagedId, options) =>
    ipcRenderer.invoke('songs:approve-staged', { stagedId, options }),
  rejectStagedImport: (stagedId, reason) =>
    ipcRenderer.invoke('songs:reject-staged', { stagedId, reason }),
  projectSongSection: (songTitle, sectionLabel, sectionIndex) =>
    ipcRenderer.invoke('songs:project-section', { songTitle, sectionLabel, sectionIndex }),
  streamAudioChunk: (chunk: ArrayBuffer) => ipcRenderer.send('audio:stream-chunk', chunk),
  sendDirectTranscript: (text: string, isSinging?: boolean) =>
    ipcRenderer.send('speech:direct-transcript', { text, isSinging }),
  createBackup: () => ipcRenderer.invoke('backup:create'),
  restoreBackup: (archive, clearExisting) =>
    ipcRenderer.invoke('backup:restore', { archive, clearExisting }),

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

  onAudioActivityMode: (callback) => {
    const handler = (_event: any, metrics: AudioActivityMetrics) => callback(metrics);
    ipcRenderer.on('audio:activity-mode', handler);
    return () => ipcRenderer.removeListener('audio:activity-mode', handler);
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
  },

  onSongCandidate: (callback) => {
    const handler = (_event: any, candidate: SuggestionCandidate) => callback(candidate);
    ipcRenderer.on('song:candidate', handler);
    return () => ipcRenderer.removeListener('song:candidate', handler);
  }
};

contextBridge.exposeInMainWorld('pulpitAPI', api);

