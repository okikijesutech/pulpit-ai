import { describe, it, expect, beforeEach } from 'vitest';
import {
  AudioRingBuffer,
  AudioLevelMeter,
  AudioDeviceManager,
  VirtualAudioSource
} from '../src/index.js';

describe('AudioEngine Unit Tests', () => {
  describe('AudioRingBuffer', () => {
    it('writes and reads samples in FIFO order', () => {
      const buffer = new AudioRingBuffer(100);
      const input = new Int16Array([10, 20, 30, 40, 50]);

      buffer.write(input);
      expect(buffer.size()).toBe(5);

      const output = buffer.read(3);
      expect(output.length).toBe(3);
      expect(output[0]).toBe(10);
      expect(output[1]).toBe(20);
      expect(output[2]).toBe(30);
      expect(buffer.size()).toBe(2);

      const remaining = buffer.readAll();
      expect(remaining.length).toBe(2);
      expect(remaining[0]).toBe(40);
      expect(remaining[1]).toBe(50);
      expect(buffer.size()).toBe(0);
    });

    it('enforces strict bounded capacity and drops oldest samples when full', () => {
      const buffer = new AudioRingBuffer(5); // Small capacity for test
      buffer.write(new Int16Array([1, 2, 3, 4, 5]));
      expect(buffer.size()).toBe(5);

      // Write 2 more samples -> should overwrite samples 1 and 2
      buffer.write(new Int16Array([6, 7]));
      expect(buffer.size()).toBe(5);

      const result = buffer.readAll();
      expect(result.length).toBe(5);
      expect(result[0]).toBe(3);
      expect(result[1]).toBe(4);
      expect(result[2]).toBe(5);
      expect(result[3]).toBe(6);
      expect(result[4]).toBe(7);
    });

    it('flushes buffer completely upon request', () => {
      const buffer = new AudioRingBuffer(100);
      buffer.write(new Int16Array([100, 200, 300]));
      expect(buffer.size()).toBe(3);

      buffer.flush();
      expect(buffer.size()).toBe(0);
      expect(buffer.readAll().length).toBe(0);
    });
  });

  describe('AudioLevelMeter (PR 6: Real Level Metering & State Distinction)', () => {
    const meter = new AudioLevelMeter();
    const synth = new VirtualAudioSource(16000);

    it('detects silence correctly and reports state as silent', () => {
      const silence = synth.generateSilence(0.5); // 0.5s of silence
      const metrics = meter.analyze(silence);

      expect(metrics.isSilent).toBe(true);
      expect(metrics.isClipping).toBe(false);
      expect(metrics.rmsLevel).toBe(0);
      expect(metrics.decibels).toBe(-100);
      expect(metrics.state).toBe('silent');
    });

    it('analyzes standard tone signal level accurately and reports state as active', () => {
      const tone = synth.generateTone(0.5, 440, 0.5); // 50% amplitude sine
      const metrics = meter.analyze(tone);

      expect(metrics.isSilent).toBe(false);
      expect(metrics.isClipping).toBe(false);
      // Theoretical RMS of sine with amplitude A is A / sqrt(2) ≈ 0.5 / 1.414 ≈ 0.353
      expect(metrics.rmsLevel).toBeGreaterThan(0.33);
      expect(metrics.rmsLevel).toBeLessThan(0.37);
      expect(metrics.decibels).toBeGreaterThan(-10);
      expect(metrics.decibels).toBeLessThan(-8);
      expect(metrics.state).toBe('active');
    });

    it('detects digital clipping on saturated audio frames', () => {
      const clipped = synth.generateClippedSignal(0.1);
      const metrics = meter.analyze(clipped);

      expect(metrics.isClipping).toBe(true);
      expect(metrics.isSilent).toBe(false);
      expect(metrics.state).toBe('active');
    });

    it('reports state as muted when audio is explicitly muted', () => {
      const tone = synth.generateTone(0.5, 440, 0.5);
      const metrics = meter.analyze(tone, true); // isMuted = true

      expect(metrics.isSilent).toBe(true);
      expect(metrics.rmsLevel).toBe(0);
      expect(metrics.decibels).toBe(-100);
      expect(metrics.state).toBe('muted');
    });

    it('reports disconnected state correctly for missing/unplugged audio hardware', () => {
      const metrics = AudioLevelMeter.disconnectedMetrics();

      expect(metrics.isSilent).toBe(true);
      expect(metrics.rmsLevel).toBe(0);
      expect(metrics.decibels).toBe(-100);
      expect(metrics.state).toBe('disconnected');
    });
  });

  describe('AudioDeviceManager (PR 6: Dynamic Device Enumeration)', () => {
    it('has no hardcoded devices initially when created empty', () => {
      const emptyManager = new AudioDeviceManager();
      expect(emptyManager.getDevices()).toEqual([]);
      expect(emptyManager.getActiveDevice()).toBeNull();
    });

    it('enumerates real devices via navigator.mediaDevices.enumerateDevices()', async () => {
      const mockDevices: MediaDeviceInfo[] = [
        {
          deviceId: 'mic_hw_1',
          kind: 'audioinput',
          label: 'Shure SM58 USB Microphone',
          groupId: 'grp1',
          toJSON: () => ({})
        },
        {
          deviceId: 'webcam_video',
          kind: 'videoinput',
          label: 'Integrated Webcam',
          groupId: 'grp2',
          toJSON: () => ({})
        },
        {
          deviceId: 'speaker_out',
          kind: 'audiooutput',
          label: 'Realtek Speakers',
          groupId: 'grp3',
          toJSON: () => ({})
        },
        {
          deviceId: 'mixer_hw_2',
          kind: 'audioinput',
          label: 'Behringer X32 USB ASIO Audio',
          groupId: 'grp4',
          toJSON: () => ({})
        }
      ];

      // Provide mock enumerator
      const manager = new AudioDeviceManager({
        deviceEnumerator: async () => {
          return mockDevices
            .filter((d) => d.kind === 'audioinput')
            .map((d, idx) => ({
              id: d.deviceId,
              name: d.label,
              isDefault: idx === 0,
              sampleRate: 16000,
              channels: 1
            }));
        }
      });

      const devices = await manager.enumerateDevices();

      // Confirms filtering only audio inputs
      expect(devices.length).toBe(2);
      expect(devices[0].id).toBe('mic_hw_1');
      expect(devices[0].name).toBe('Shure SM58 USB Microphone');
      expect(devices[0].isDefault).toBe(true);
      expect(devices[1].id).toBe('mixer_hw_2');

      // Default device selected automatically
      expect(manager.getActiveDevice()?.id).toBe('mic_hw_1');
    });

    it('switches active source cleanly and notifies listeners', () => {
      const manager = new AudioDeviceManager({
        devices: [
          { id: 'mic_1', name: 'Mic 1', isDefault: true },
          { id: 'mic_2', name: 'Mic 2', isDefault: false }
        ]
      });

      let notifiedDevice: any = null;
      const unsub = manager.onActiveSourceChanged((active) => {
        notifiedDevice = active;
      });

      const switched = manager.selectActiveDevice('mic_2');
      expect(switched.id).toBe('mic_2');
      expect(notifiedDevice?.id).toBe('mic_2');
      expect(manager.getActiveDevice()?.id).toBe('mic_2');

      unsub();
    });

    it('handles device disconnection (unplugging) by falling back or marking null', () => {
      const manager = new AudioDeviceManager({
        devices: [
          { id: 'usb_mic_plugged', name: 'USB Mic', isDefault: false },
          { id: 'internal_mic', name: 'Internal Laptop Mic', isDefault: true }
        ]
      });

      manager.selectActiveDevice('usb_mic_plugged');
      expect(manager.getActiveDevice()?.id).toBe('usb_mic_plugged');

      let notifiedActive: any = undefined;
      manager.onActiveSourceChanged((dev) => {
        notifiedActive = dev;
      });

      // Simulate unplugging USB mic: only internal mic remains
      manager.updateAvailableDevices([
        { id: 'internal_mic', name: 'Internal Laptop Mic', isDefault: true }
      ]);

      expect(manager.getActiveDevice()?.id).toBe('internal_mic');
      expect(notifiedActive?.id).toBe('internal_mic');

      // Unplug all devices
      manager.updateAvailableDevices([]);
      expect(manager.getActiveDevice()).toBeNull();
      expect(notifiedActive).toBeNull();
    });

    it('throws error when selecting non-existent device ID', () => {
      const manager = new AudioDeviceManager({
        devices: [{ id: 'mic_1', name: 'Mic 1', isDefault: true }]
      });
      expect(() => manager.selectActiveDevice('non_existent_device')).toThrow();
    });
  });
});
