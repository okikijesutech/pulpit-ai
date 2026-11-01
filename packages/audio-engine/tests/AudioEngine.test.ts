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

  describe('AudioLevelMeter', () => {
    const meter = new AudioLevelMeter();
    const synth = new VirtualAudioSource(16000);

    it('detects silence correctly', () => {
      const silence = synth.generateSilence(0.5); // 0.5s of silence
      const metrics = meter.analyze(silence);

      expect(metrics.isSilent).toBe(true);
      expect(metrics.isClipping).toBe(false);
      expect(metrics.rmsLevel).toBe(0);
      expect(metrics.decibels).toBe(-100);
    });

    it('analyzes standard tone signal level accurately', () => {
      const tone = synth.generateTone(0.5, 440, 0.5); // 50% amplitude sine
      const metrics = meter.analyze(tone);

      expect(metrics.isSilent).toBe(false);
      expect(metrics.isClipping).toBe(false);
      // Theoretical RMS of sine with amplitude A is A / sqrt(2) ≈ 0.5 / 1.414 ≈ 0.353
      expect(metrics.rmsLevel).toBeGreaterThan(0.33);
      expect(metrics.rmsLevel).toBeLessThan(0.37);
      expect(metrics.decibels).toBeGreaterThan(-10);
      expect(metrics.decibels).toBeLessThan(-8);
    });

    it('detects digital clipping on saturated audio frames', () => {
      const clipped = synth.generateClippedSignal(0.1);
      const metrics = meter.analyze(clipped);

      expect(metrics.isClipping).toBe(true);
      expect(metrics.isSilent).toBe(false);
    });
  });

  describe('AudioDeviceManager', () => {
    let deviceManager: AudioDeviceManager;

    beforeEach(() => {
      deviceManager = new AudioDeviceManager();
    });

    it('lists available devices and has default selected', () => {
      const devices = deviceManager.getDevices();
      expect(devices.length).toBeGreaterThan(0);
      expect(deviceManager.getActiveDevice()).not.toBeNull();
      expect(deviceManager.getActiveDevice()?.id).toBe('default_mic');
    });

    it('switches active source cleanly and notifies listeners', () => {
      let notifiedDevice: any = null;
      const unsub = deviceManager.onActiveSourceChanged((active) => {
        notifiedDevice = active;
      });

      const switched = deviceManager.selectActiveDevice('mixer_line_in');
      expect(switched.id).toBe('mixer_line_in');
      expect(notifiedDevice?.id).toBe('mixer_line_in');
      expect(deviceManager.getActiveDevice()?.id).toBe('mixer_line_in');

      unsub();
    });

    it('throws error when selecting non-existent device ID', () => {
      expect(() => deviceManager.selectActiveDevice('non_existent_device')).toThrow();
    });
  });
});
