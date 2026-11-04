import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MicrophoneAudioService } from '../src/renderer/services/MicrophoneAudioService.js';
import { AudioLevelMeter } from '@pulpit-ai/audio-engine';

describe('Real Audio Capture Pipeline (PR 6)', () => {
  let micService: MicrophoneAudioService;
  let mockTrack: any;
  let mockStream: any;
  let mockAudioContext: any;
  let mockWorkletNode: any;
  let mockGetUserMedia: any;
  let mockEnumerateDevices: any;
  let deviceChangeListeners: Set<() => void>;

  beforeEach(() => {
    deviceChangeListeners = new Set();
    micService = new MicrophoneAudioService();

    mockTrack = {
      label: 'USB Pulpit Microphone',
      kind: 'audio',
      enabled: true,
      stop: vi.fn(),
      onended: null,
      addEventListener: vi.fn((event: string, cb: () => void) => {
        if (event === 'ended') mockTrack.onended = cb;
      }),
      removeEventListener: vi.fn()
    };

    mockStream = {
      getAudioTracks: vi.fn(() => [mockTrack]),
      getTracks: vi.fn(() => [mockTrack])
    };

    mockWorkletNode = {
      port: {
        onmessage: null,
        postMessage: vi.fn()
      },
      connect: vi.fn(),
      disconnect: vi.fn()
    };

    mockAudioContext = {
      sampleRate: 16000,
      state: 'running',
      audioWorklet: {
        addModule: vi.fn().mockResolvedValue(undefined)
      },
      createMediaStreamSource: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn()
      })),
      close: vi.fn().mockResolvedValue(undefined)
    };

    mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
    mockEnumerateDevices = vi.fn().mockResolvedValue([
      { deviceId: 'default', kind: 'audioinput', label: 'Default Microphone' },
      { deviceId: 'usb_mic_01', kind: 'audioinput', label: 'USB Pulpit Microphone' },
      { deviceId: 'cam_video', kind: 'videoinput', label: 'Webcam' }
    ]);

    // Mock Blob and URL
    if (typeof (global as any).Blob === 'undefined') {
      (global as any).Blob = class {
        constructor(public parts: any[]) {}
      };
    }
    (global as any).URL.createObjectURL = vi.fn(() => 'blob:mock-worklet-url');
    (global as any).URL.revokeObjectURL = vi.fn();

    // Mock browser global environment
    (global as any).window = {
      AudioContext: vi.fn(() => mockAudioContext),
      AudioWorkletNode: vi.fn(() => mockWorkletNode),
      pulpitAPI: {
        streamAudioChunk: vi.fn(),
        selectAudioDevice: vi.fn().mockResolvedValue({ id: 'usb_mic_01' }),
        reportAudioState: vi.fn()
      }
    };

    Object.defineProperty(global, 'navigator', {
      value: {
        mediaDevices: {
          getUserMedia: mockGetUserMedia,
          enumerateDevices: mockEnumerateDevices,
          addEventListener: vi.fn((event: string, cb: () => void) => {
            if (event === 'devicechange') deviceChangeListeners.add(cb);
          }),
          removeEventListener: vi.fn((event: string, cb: () => void) => {
            if (event === 'devicechange') deviceChangeListeners.delete(cb);
          })
        }
      },
      configurable: true,
      writable: true
    });
  });

  afterEach(() => {
    micService.stop();
  });

  describe('Clean Speech Acoustic Acquisition (DSP Bypass)', () => {
    it('requests getUserMedia with echoCancellation, noiseSuppression, and autoGainControl set to FALSE', async () => {
      await micService.start();

      expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
      const passedConstraints = mockGetUserMedia.mock.calls[0][0];

      expect(passedConstraints.audio.echoCancellation).toBe(false);
      expect(passedConstraints.audio.noiseSuppression).toBe(false);
      expect(passedConstraints.audio.autoGainControl).toBe(false);
    });

    it('uses AudioWorkletNode instead of deprecated ScriptProcessorNode', async () => {
      await micService.start();

      expect(mockAudioContext.audioWorklet.addModule).toHaveBeenCalled();
      expect((global as any).window.AudioWorkletNode).toHaveBeenCalled();
    });
  });

  describe('Device Selection and Switch Handling', () => {
    it('passes selected deviceId to getUserMedia and restarts capture on switch', async () => {
      await micService.start();

      // Switch to specific USB mic
      await micService.switchDevice('usb_mic_01');

      expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
      const switchConstraints = mockGetUserMedia.mock.calls[1][0];
      expect(switchConstraints.audio.deviceId).toEqual({ exact: 'usb_mic_01' });

      // Informs main process to flush segmenter and update active source
      expect((global as any).window.pulpitAPI.selectAudioDevice).toHaveBeenCalledWith('usb_mic_01');
    });

    it('enumerates only audio input devices via navigator.mediaDevices.enumerateDevices()', async () => {
      const devices = await micService.enumerateDevices();

      expect(devices.length).toBe(2);
      expect(devices[0].id).toBe('default');
      expect(devices[1].id).toBe('usb_mic_01');
      // Webcam (videoinput) must be excluded
      expect(devices.some((d) => d.name === 'Webcam')).toBe(false);
    });
  });

  describe('Hardware Disconnect and "No Audio" States', () => {
    it('shows error state within 1 second when audio track ends (track.onended / unplug)', async () => {
      let statusError: string | undefined;
      micService.subscribeStatus((status) => {
        statusError = status.error;
      });

      await micService.start();
      expect(statusError).toBeUndefined();

      const startTime = Date.now();

      // Simulate physical cable unplug
      if (mockTrack.onended) {
        mockTrack.onended();
      }

      const elapsedMs = Date.now() - startTime;
      expect(elapsedMs).toBeLessThan(1000); // Must react within 1 second
      expect(statusError).toBeDefined();
      expect(statusError?.toLowerCase()).toContain('disconnect');
    });

    it('detects device unplugging via devicechange event within 1 second', async () => {
      let statusError: string | undefined;
      micService.subscribeStatus((status) => {
        statusError = status.error;
      });

      await micService.switchDevice('usb_mic_01');
      await micService.start();

      // Simulate device list changing: USB mic is unplugged, leaving only default
      mockEnumerateDevices.mockResolvedValue([
        { deviceId: 'default', kind: 'audioinput', label: 'Default Microphone' }
      ]);

      const startTime = Date.now();
      for (const listener of deviceChangeListeners) {
        await listener();
      }

      const elapsedMs = Date.now() - startTime;
      expect(elapsedMs).toBeLessThan(1000);
      expect(statusError).toBeDefined();
      expect(statusError?.toLowerCase()).toContain('disconnect');
    });

    it('distinguishes between muted, silent, active, and disconnected audio states', () => {
      const meter = new AudioLevelMeter();

      // 1. Muted state
      const mutedMetrics = meter.analyze(new Int16Array([1000, 2000]), true);
      expect(mutedMetrics.state).toBe('muted');

      // 2. Silent state
      const silentMetrics = meter.analyze(new Int16Array(480), false);
      expect(silentMetrics.state).toBe('silent');

      // 3. Active state
      const activeFrame = new Int16Array(480);
      for (let i = 0; i < 480; i++) activeFrame[i] = 12000;
      const activeMetrics = meter.analyze(activeFrame, false);
      expect(activeMetrics.state).toBe('active');

      // 4. Disconnected state
      const disconnectedMetrics = AudioLevelMeter.disconnectedMetrics();
      expect(disconnectedMetrics.state).toBe('disconnected');
    });
  });
});
