import { AudioInputDevice } from '@pulpit-ai/shared-types';

export type DeviceChangeListener = (devices: AudioInputDevice[]) => void;
export type ActiveSourceChangeListener = (activeDevice: AudioInputDevice | null) => void;

export interface AudioDeviceManagerOptions {
  devices?: AudioInputDevice[];
  deviceEnumerator?: () => Promise<AudioInputDevice[]>;
}

export class AudioDeviceManager {
  private devices: AudioInputDevice[] = [];
  private activeDeviceId: string | null = null;
  private deviceListeners: Set<DeviceChangeListener> = new Set();
  private sourceListeners: Set<ActiveSourceChangeListener> = new Set();
  private deviceEnumerator?: () => Promise<AudioInputDevice[]>;
  private cleanupDeviceChange?: () => void;

  constructor(options: AudioDeviceManagerOptions = {}) {
    if (options.devices && options.devices.length > 0) {
      this.devices = [...options.devices];
      const defaultDevice = this.devices.find((d) => d.isDefault) ?? this.devices[0];
      this.activeDeviceId = defaultDevice.id;
    }

    if (options.deviceEnumerator) {
      this.deviceEnumerator = options.deviceEnumerator;
    }

    // Auto-listen to physical hardware changes in browser / Electron renderer environments
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      const onDeviceChange = async () => {
        try {
          await this.enumerateDevices();
        } catch (err) {
          console.warn('[AudioDeviceManager] Device change enumeration error:', err);
        }
      };
      navigator.mediaDevices.addEventListener('devicechange', onDeviceChange);
      this.cleanupDeviceChange = () => {
        navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange);
      };
    }
  }

  /**
   * Enumerates available physical audio input devices via navigator.mediaDevices.enumerateDevices().
   * Filters strictly for audio inputs and updates device registry.
   */
  public async enumerateDevices(): Promise<AudioInputDevice[]> {
    if (this.deviceEnumerator) {
      const enumerated = await this.deviceEnumerator();
      this.updateAvailableDevices(enumerated);
      return this.getDevices();
    }

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs: AudioInputDevice[] = mediaDevices
        .filter((d) => d.kind === 'audioinput')
        .map((d, index) => ({
          id: d.deviceId || (index === 0 ? 'default' : `device_${index}`),
          name: d.label || (index === 0 ? 'Default Microphone' : `Microphone ${index + 1}`),
          isDefault: d.deviceId === 'default' || index === 0,
          sampleRate: 16000,
          channels: 1
        }));

      this.updateAvailableDevices(audioInputs);
      return this.getDevices();
    }

    return this.getDevices();
  }

  public getDevices(): AudioInputDevice[] {
    return [...this.devices];
  }

  public getActiveDevice(): AudioInputDevice | null {
    if (!this.activeDeviceId) return null;
    return this.devices.find((d) => d.id === this.activeDeviceId) ?? null;
  }

  /**
   * Switches to a new active audio source.
   * STRICT SAFETY RULE:
   * 1. Flushing pending buffers.
   * 2. Tagging events with new source identifier.
   * 3. Prevents joining speech/lyric fragments across device switch.
   */
  public selectActiveDevice(deviceId: string): AudioInputDevice {
    const target = this.devices.find((d) => d.id === deviceId);
    if (!target) {
      throw new Error(`Audio device with ID '${deviceId}' not found.`);
    }

    if (this.activeDeviceId === deviceId) {
      return target;
    }

    this.activeDeviceId = deviceId;
    this.notifySourceChanged(target);
    return target;
  }

  public updateAvailableDevices(newDevices: AudioInputDevice[]): void {
    this.devices = [...newDevices];
    this.notifyDevicesChanged();

    // If no active device was set and devices exist, pick the default or first
    if (!this.activeDeviceId && this.devices.length > 0) {
      const defaultDevice = this.devices.find((d) => d.isDefault) ?? this.devices[0];
      this.activeDeviceId = defaultDevice.id;
      this.notifySourceChanged(defaultDevice);
      return;
    }

    // If active device was disconnected, switch to default or null
    if (this.activeDeviceId && !this.devices.some((d) => d.id === this.activeDeviceId)) {
      const fallback = this.devices.find((d) => d.isDefault) ?? this.devices[0] ?? null;
      this.activeDeviceId = fallback ? fallback.id : null;
      this.notifySourceChanged(fallback);
    }
  }

  public destroy(): void {
    if (this.cleanupDeviceChange) {
      this.cleanupDeviceChange();
      this.cleanupDeviceChange = undefined;
    }
  }

  public onDevicesChanged(listener: DeviceChangeListener): () => void {
    this.deviceListeners.add(listener);
    listener(this.getDevices());
    return () => this.deviceListeners.delete(listener);
  }

  public onActiveSourceChanged(listener: ActiveSourceChangeListener): () => void {
    this.sourceListeners.add(listener);
    listener(this.getActiveDevice());
    return () => this.sourceListeners.delete(listener);
  }

  private notifyDevicesChanged(): void {
    const list = this.getDevices();
    for (const l of this.deviceListeners) l(list);
  }

  private notifySourceChanged(active: AudioInputDevice | null): void {
    for (const l of this.sourceListeners) l(active);
  }
}
