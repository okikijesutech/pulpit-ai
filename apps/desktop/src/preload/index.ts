import { contextBridge, ipcRenderer } from 'electron';
import {
  AllowlistedAction,
  AuditEvent,
  AuthorityState,
  FreeShowStateSnapshot,
  OperatorMode,
  SuggestionCandidate
} from '@pulpit-ai/shared-types';

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
  onAuthorityStateChange: (callback: (state: AuthorityState) => void) => () => void;
  onFreeShowStateChange: (callback: (snapshot: FreeShowStateSnapshot) => void) => () => void;
  onAuditEvent: (callback: (event: AuditEvent) => void) => () => void;
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
  }
};

contextBridge.exposeInMainWorld('pulpitAPI', api);
