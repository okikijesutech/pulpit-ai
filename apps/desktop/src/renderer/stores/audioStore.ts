import { create } from 'zustand';
import { AudioInputDevice } from '@pulpit-ai/shared-types';
import { AudioLevelMetrics, AudioActivityMetrics } from '../../preload/index.js';
import { physicalMicService } from '../services/MicrophoneAudioService.js';

interface AudioStoreState {
  audioDevices: AudioInputDevice[];
  activeDeviceId: string;
  micGainDb: number;
  isMicMuted: boolean;
  micError: string | null;
  audioLevel: AudioLevelMetrics;
  audioActivity: AudioActivityMetrics | undefined;

  setAudioDevices: (devices: AudioInputDevice[]) => void;
  setActiveDeviceId: (id: string) => void;
  setMicGainDb: (db: number) => void;
  setIsMicMuted: (muted: boolean) => void;
  setMicError: (error: string | null) => void;
  setAudioLevel: (metrics: AudioLevelMetrics) => void;
  setAudioActivity: (activity: AudioActivityMetrics | undefined) => void;

  // Domain Actions
  selectAudioDevice: (deviceId: string) => Promise<void>;
  updateGainDb: (db: number) => Promise<void>;
  toggleMicMute: () => Promise<void>;
  reconnectMic: () => Promise<void>;
}

export const useAudioStore = create<AudioStoreState>((set) => ({
  audioDevices: [],
  activeDeviceId: 'default_mic',
  micGainDb: physicalMicService.getGainDb(),
  isMicMuted: false,
  micError: null,
  audioLevel: {
    rmsLevel: 0,
    decibels: -100,
    isClipping: false,
    isSilent: true
  },
  audioActivity: undefined,

  setAudioDevices: (devices) => set({ audioDevices: devices }),
  setActiveDeviceId: (id) => set({ activeDeviceId: id }),
  setMicGainDb: (db) => set({ micGainDb: db }),
  setIsMicMuted: (muted) => set({ isMicMuted: muted }),
  setMicError: (error) => set({ micError: error }),
  setAudioLevel: (metrics) => set({ audioLevel: metrics }),
  setAudioActivity: (activity) => set({ audioActivity: activity }),

  selectAudioDevice: async (deviceId: string) => {
    set({ activeDeviceId: deviceId });
    await physicalMicService.switchDevice(deviceId);
    if (typeof window !== 'undefined' && window.pulpitAPI) {
      await window.pulpitAPI.selectAudioDevice(deviceId);
    }
  },

  updateGainDb: async (db: number) => {
    set({ micGainDb: db });
    await physicalMicService.setGainDb(db);
  },

  toggleMicMute: async () => {
    await physicalMicService.toggleMute();
  },

  reconnectMic: async () => {
    try {
      await physicalMicService.start();
      set({ micError: null });
    } catch (err: any) {
      set({ micError: err?.message || 'Failed to reconnect microphone' });
    }
  }
}));
