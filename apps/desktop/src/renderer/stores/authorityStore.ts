import { create } from 'zustand';
import {
  AllowlistedAction,
  AuthorityState,
  FreeShowStateSnapshot,
  OperatorMode
} from '@pulpit-ai/shared-types';

interface AuthorityStoreState {
  authorityState: AuthorityState;
  freeShowSnapshot: FreeShowStateSnapshot;

  setAuthorityState: (state: AuthorityState | ((prev: AuthorityState) => AuthorityState)) => void;
  setFreeShowSnapshot: (snapshot: FreeShowStateSnapshot | ((prev: FreeShowStateSnapshot) => FreeShowStateSnapshot)) => void;

  toggleManualLock: () => Promise<void>;
  setOperatorMode: (mode: OperatorMode) => Promise<void>;
  connectFreeShow: (port?: number) => Promise<boolean>;
  disconnectFreeShow: () => Promise<void>;
  dispatchCommand: (action: AllowlistedAction, data?: any) => Promise<{ success: boolean; reason?: string }>;
}

export const useAuthorityStore = create<AuthorityStoreState>((set, get) => ({
  authorityState: {
    operatorMode: 'suggestions',
    listeningEnabled: true,
    suggestionsEnabled: true,
    projectionPermission: false,
    manualLockActive: false,
    freeShowConnected: false,
    lastOperatorActionAt: null,
    activeSourceId: null
  },
  freeShowSnapshot: {
    connected: false,
    status: 'disconnected',
    lastHeartbeat: 0
  },

  setAuthorityState: (update) =>
    set((s) => ({
      authorityState: typeof update === 'function' ? update(s.authorityState) : update
    })),

  setFreeShowSnapshot: (update) =>
    set((s) => ({
      freeShowSnapshot: typeof update === 'function' ? update(s.freeShowSnapshot) : update
    })),

  toggleManualLock: async () => {
    if (typeof window !== 'undefined' && window.pulpitAPI) {
      const nextLock = !get().authorityState.manualLockActive;
      const res = await window.pulpitAPI.setManualLock(
        nextLock,
        nextLock ? 'Operator engaged Manual Safety Lock' : 'Operator released lock'
      );
      if (res.success) {
        set((s) => ({
          authorityState: { ...s.authorityState, manualLockActive: nextLock }
        }));
      }
    }
  },

  setOperatorMode: async (mode: OperatorMode) => {
    if (typeof window !== 'undefined' && window.pulpitAPI) {
      await window.pulpitAPI.setOperatorMode(mode);
    }
  },

  connectFreeShow: async (port = 5510) => {
    if (typeof window !== 'undefined' && window.pulpitAPI) {
      return await window.pulpitAPI.connectFreeShow(port);
    }
    return false;
  },

  disconnectFreeShow: async () => {
    if (typeof window !== 'undefined' && window.pulpitAPI) {
      await window.pulpitAPI.disconnectFreeShow();
    }
  },

  dispatchCommand: async (action: AllowlistedAction, data?: any) => {
    if (typeof window !== 'undefined' && window.pulpitAPI) {
      const res = await window.pulpitAPI.dispatchOperatorCommand(action, data);
      if (!res.success && res.reason && typeof alert !== 'undefined') {
        alert(`Command rejected: ${res.reason}`);
      }
      return res;
    }
    return { success: true };
  }
}));
