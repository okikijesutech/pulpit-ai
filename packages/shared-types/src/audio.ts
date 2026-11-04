/**
 * Audio acquisition and device contracts.
 */

export interface AudioInputDevice {
  id: string;
  name: string;
  isDefault: boolean;
  sampleRate?: number;
  channels?: number;
}

export type AudioStreamState = 'active' | 'silent' | 'muted' | 'disconnected';

export interface AudioLevelMetrics {
  rmsLevel: number; // 0.0 (silence) to 1.0 (full scale)
  decibels: number; // -Infinity to 0 dBFS
  isClipping: boolean;
  isSilent: boolean;
  state: AudioStreamState;
}

export interface AudioCaptureState {
  isCapturing: boolean;
  activeDeviceId: string | null;
  inputLevel: number; // 0.0 to 1.0 (normalized RMS)
  isClipping: boolean;
  isSilent: boolean;
  state?: AudioStreamState;
  lastBufferAt: number;
}
