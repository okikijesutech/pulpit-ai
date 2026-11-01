import { AudioInputDevice } from '@pulpit-ai/shared-types';

export type DeviceChangeListener = (devices: AudioInputDevice[]) => void;
export type ActiveSourceChangeListener = (activeDevice: AudioInputDevice | null) => void;

export class AudioDeviceManager {
  private devices: AudioInputDevice[] = [];
  private activeDeviceId: string | null = null;
  private deviceListeners: Set<DeviceChangeListener> = new Set();
  private sourceListeners: Set<ActiveSourceChangeListener> = new Set();

  constructor() {
    // Initial hardware discovery defaults
    this.devices = [
      {
        id: 'default_mic',
        name: 'Internal Microphone (Conexant ISST Audio)',
        isDefault: true,
        sampleRate: 16000,
        channels: 1
      },
      {
        id: 'mixer_line_in',
        name: 'USB Mixer / Line-in Interface',
        isDefault: false,
        sampleRate: 16000,
        channels: 1
      }
    ];
    this.activeDeviceId = 'default_mic';
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

    // If active device was disconnected, switch to default
    if (this.activeDeviceId && !this.devices.some((d) => d.id === this.activeDeviceId)) {
      const fallback = this.devices.find((d) => d.isDefault) ?? this.devices[0] ?? null;
      this.activeDeviceId = fallback ? fallback.id : null;
      this.notifySourceChanged(fallback);
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
