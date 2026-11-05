import { AudioInputDevice } from '@pulpit-ai/shared-types';

/**
 * Real-time Physical Microphone Audio Ingestion Service (PR 6: Clean Real Audio Capture).
 * Captures clean, unadulterated microphone audio with browser DSP disabled
 * (echoCancellation: false, noiseSuppression: false, autoGainControl: false),
 * uses an AudioWorkletNode off the main thread, monitors device disconnects
 * via track.onended and devicechange, and streams 16kHz PCM chunks.
 */

export interface MicrophoneStatus {
  isStreaming: boolean;
  deviceName: string;
  isListeningSpeech: boolean;
  isMuted?: boolean;
  lastTranscript?: string;
  error?: string;
}

export type MicrophoneStatusListener = (status: MicrophoneStatus) => void;

const WORKLET_PROCESSOR_CODE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 1024;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];

    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.bufferIndex++] = channel[i];
      if (this.bufferIndex >= this.bufferSize) {
        const chunk = this.buffer.slice(0, this.bufferSize);
        this.port.postMessage(chunk.buffer, [chunk.buffer]);
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
`;

export class MicrophoneAudioService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private activeDeviceId: string = 'default';
  private isRunning = false;
  private isMuted = false;
  private deviceChangeHandler?: () => void;
  private statusListeners: Set<MicrophoneStatusListener> = new Set();
  private status: MicrophoneStatus = {
    isStreaming: false,
    deviceName: 'Default Microphone',
    isListeningSpeech: false,
    isMuted: false
  };

  public async setMuted(muted: boolean): Promise<boolean> {
    this.isMuted = muted;
    if (muted) {
      // 1. Fully release hardware tracks so Windows OS turns off the microphone indicator
      this.stopCaptureNodes();
      this.isRunning = false;
      this.notify({
        isStreaming: false,
        isListeningSpeech: false,
        isMuted: true
      });
      // 2. Inform main process so segmenter resets and audio meters show muted
      if (typeof window !== 'undefined' && (window as any).pulpitAPI?.reportAudioState) {
        (window as any).pulpitAPI.reportAudioState('muted');
      }
    } else {
      await this.startCapture();
    }
    return this.isMuted;
  }

  public toggleMuted(): boolean {
    const next = !this.isMuted;
    this.setMuted(next).catch((err) => {
      console.warn('[MicrophoneAudioService] setMuted error:', err);
    });
    return next;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getActiveDeviceId(): string {
    return this.activeDeviceId;
  }

  public subscribeStatus(listener: MicrophoneStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  private notify(update: Partial<MicrophoneStatus>): void {
    this.status = { ...this.status, ...update };
    for (const listener of this.statusListeners) {
      try {
        listener(this.status);
      } catch (err) {
        console.error('Error in mic status listener:', err);
      }
    }
  }

  /**
   * Enumerates available physical audio input devices via navigator.mediaDevices.enumerateDevices().
   */
  public async enumerateDevices(): Promise<AudioInputDevice[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, index) => ({
          id: d.deviceId || (index === 0 ? 'default' : `device_${index}`),
          name: d.label || (index === 0 ? 'Default Microphone' : `Microphone ${index + 1}`),
          isDefault: d.deviceId === 'default' || index === 0,
          sampleRate: 16000,
          channels: 1
        }));
    } catch (err) {
      console.warn('[MicrophoneAudioService] Device enumeration failed:', err);
      return [];
    }
  }

  /**
   * Switches the active audio capture device.
   * Restarts live capture with the new device and tells the main process to flush the segmenter.
   */
  public async switchDevice(deviceId: string): Promise<boolean> {
    if (this.activeDeviceId === deviceId && this.isRunning) {
      return true;
    }

    this.activeDeviceId = deviceId;

    // Notify main process to update active source and flush segmenter buffer
    if (typeof window !== 'undefined' && (window as any).pulpitAPI?.selectAudioDevice) {
      try {
        await (window as any).pulpitAPI.selectAudioDevice(deviceId);
      } catch (err) {
        console.warn('[MicrophoneAudioService] Failed to notify selectAudioDevice:', err);
      }
    }

    if (this.isRunning) {
      this.stopCaptureNodes();
      return await this.startCapture();
    }

    return true;
  }

  public async start(): Promise<boolean> {
    if (this.isRunning) return true;
    return await this.startCapture();
  }

  private async startCapture(): Promise<boolean> {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('navigator.mediaDevices.getUserMedia is not supported');
      }

      // Constraints: Disable all browser DSP so raw preaching speech is not corrupted
      const audioConstraints: MediaTrackConstraints = {
        deviceId:
          this.activeDeviceId && this.activeDeviceId !== 'default'
            ? { exact: this.activeDeviceId }
            : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
        sampleRate: 16000
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });

      this.mediaStream = stream;
      const track = stream.getAudioTracks()[0];
      const deviceName = track ? track.label || 'Audio Input Device' : 'Default Microphone';

      // React within 1 second if hardware is unplugged / track terminates
      if (track) {
        track.onended = () => {
          this.handleDeviceDisconnected('Microphone stream disconnected (hardware unplugged)');
        };
        track.addEventListener('ended', () => {
          this.handleDeviceDisconnected('Microphone stream disconnected (hardware unplugged)');
        });
      }

      // Listen for hardware plug/unplug events
      this.setupDeviceChangeListener();

      // Initialize 16kHz AudioContext
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 16000 });
      this.audioContext = ctx;

      const source = ctx.createMediaStreamSource(stream);
      this.sourceNode = source;

      // AudioWorklet initialization
      if (ctx.audioWorklet && typeof (window as any).AudioWorkletNode !== 'undefined') {
        const blob = new Blob([WORKLET_PROCESSOR_CODE], { type: 'application/javascript' });
        const workletUrl = URL.createObjectURL(blob);
        try {
          await ctx.audioWorklet.addModule(workletUrl);
        } finally {
          URL.revokeObjectURL(workletUrl);
        }

        const workletNode = new (window as any).AudioWorkletNode(ctx, 'pcm-capture-processor');
        this.workletNode = workletNode;

        workletNode.port.onmessage = (e: MessageEvent) => {
          if (!this.isRunning) return;
          const float32 = new Float32Array(e.data);
          this.processAndStreamSamples(float32, ctx.sampleRate);
        };

        source.connect(workletNode);
      } else {
        console.warn('[MicrophoneAudioService] AudioWorkletNode not available in environment');
      }

      this.isRunning = true;
      this.isMuted = false;
      this.notify({
        isStreaming: true,
        deviceName,
        isListeningSpeech: true,
        isMuted: false,
        error: undefined
      });

      return true;
    } catch (err: any) {
      console.warn('Microphone access denied or error:', err);
      this.handleDeviceDisconnected(err.message || 'Microphone access denied');
      return false;
    }
  }

  private processAndStreamSamples(float32: Float32Array, sourceRate: number): void {
    if (this.isMuted || !this.isRunning) {
      return;
    }

    let samples16k: Float32Array;
    if (sourceRate === 16000) {
      samples16k = float32;
    } else {
      const ratio = sourceRate / 16000;
      const targetLength = Math.round(float32.length / ratio);
      samples16k = new Float32Array(targetLength);
      for (let i = 0; i < targetLength; i++) {
        const srcPos = i * ratio;
        const idx0 = Math.floor(srcPos);
        const idx1 = Math.min(idx0 + 1, float32.length - 1);
        const frac = srcPos - idx0;
        samples16k[i] = float32[idx0] * (1 - frac) + float32[idx1] * frac;
      }
    }

    // Convert Float32Array [-1.0, 1.0] to 16-bit PCM Int16Array [-32768, 32767]
    const pcm16 = new Int16Array(samples16k.length);
    if (!this.isMuted) {
      for (let i = 0; i < samples16k.length; i++) {
        const s = Math.max(-1, Math.min(1, samples16k[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
    }

    if (typeof window !== 'undefined' && (window as any).pulpitAPI?.streamAudioChunk) {
      (window as any).pulpitAPI.streamAudioChunk(pcm16.buffer, this.isMuted);
    }
  }

  private handleDeviceDisconnected(reason: string): void {
    this.stopCaptureNodes();
    this.isRunning = false;

    this.notify({
      isStreaming: false,
      isListeningSpeech: false,
      error: reason
    });

    if (typeof window !== 'undefined' && (window as any).pulpitAPI?.reportAudioState) {
      (window as any).pulpitAPI.reportAudioState('disconnected');
    }
  }

  private setupDeviceChangeListener(): void {
    if (this.deviceChangeHandler || typeof navigator === 'undefined' || !navigator.mediaDevices?.addEventListener) {
      return;
    }

    this.deviceChangeHandler = async () => {
      try {
        const available = await this.enumerateDevices();
        const stillConnected = available.some(
          (d) => d.id === this.activeDeviceId || this.activeDeviceId === 'default'
        );
        if (!stillConnected && this.isRunning) {
          this.handleDeviceDisconnected('Selected audio input device disconnected');
        }
      } catch (err) {
        console.warn('[MicrophoneAudioService] Device change check failed:', err);
      }
    };

    navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeHandler);
  }

  private stopCaptureNodes(): void {
    if (this.workletNode) {
      try {
        this.workletNode.disconnect();
      } catch {}
      this.workletNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => {
        t.enabled = false;
        try {
          t.stop();
        } catch {}
      });
      this.mediaStream = null;
    }
  }

  public stop(): void {
    this.stopCaptureNodes();
    this.isRunning = false;

    if (this.deviceChangeHandler && typeof navigator !== 'undefined' && navigator.mediaDevices?.removeEventListener) {
      navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeHandler);
      this.deviceChangeHandler = undefined;
    }

    this.notify({
      isStreaming: false,
      isListeningSpeech: false
    });
  }
}

export const physicalMicService = new MicrophoneAudioService();
