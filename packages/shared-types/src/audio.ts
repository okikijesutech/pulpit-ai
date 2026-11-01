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

export interface AudioCaptureState {
  isCapturing: boolean;
  activeDeviceId: string | null;
  inputLevel: number; // 0.0 to 1.0 (normalized RMS)
  isClipping: boolean;
  isSilent: boolean;
  lastBufferAt: number;
}
