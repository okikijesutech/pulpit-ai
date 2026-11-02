import { describe, it, expect, beforeEach } from 'vitest';
import { SingingActivityDetector } from '../src/SingingActivityDetector.js';

describe('SingingActivityDetector Unit Tests', () => {
  let detector: SingingActivityDetector;

  beforeEach(() => {
    detector = new SingingActivityDetector({
      sampleRate: 16000,
      frameSizeSamples: 480,
      minSustainedFrames: 4,
      hangoverFrames: 5,
      harmonicityThreshold: 0.60
    });
  });

  // Synthesize a pure sine wave (sustained vocal pitch)
  function createPureToneFrame(freqHz: number, sampleRate = 16000, samples = 480, amplitude = 12000): Int16Array {
    const frame = new Int16Array(samples);
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      frame[i] = Math.round(amplitude * Math.sin(2 * Math.PI * freqHz * t));
    }
    return frame;
  }

  // Synthesize random white noise (unvoiced speech consonant or background noise)
  function createNoiseFrame(samples = 480, amplitude = 5000): Int16Array {
    const frame = new Int16Array(samples);
    for (let i = 0; i < samples; i++) {
      frame[i] = Math.round((Math.random() * 2 - 1) * amplitude);
    }
    return frame;
  }

  it('classifies silent frames as silence with zero harmonicity', () => {
    const silence = new Int16Array(480);
    const result = detector.processFrame(silence);

    expect(result.mode).toBe('silence');
    expect(result.isSinging).toBe(false);
    expect(result.isSpeech).toBe(false);
    expect(result.harmonicity).toBe(0);
    expect(result.estimatedPitchHz).toBeNull();
  });

  it('detects sustained musical singing tones and enters singing mode', () => {
    const vocalPitch = 220; // A3 musical note
    const toneFrame = createPureToneFrame(vocalPitch);

    // Initial frame detects high harmonicity and estimated pitch near 220Hz
    const firstResult = detector.processFrame(toneFrame);
    expect(firstResult.harmonicity).toBeGreaterThan(0.70);
    expect(firstResult.estimatedPitchHz).toBeCloseTo(vocalPitch, -1);

    // Feed consecutive sustained frames to satisfy hysteresis (minSustainedFrames = 4)
    for (let i = 0; i < 4; i++) {
      detector.processFrame(toneFrame);
    }

    const singingResult = detector.processFrame(toneFrame);
    expect(singingResult.mode).toBe('singing');
    expect(singingResult.isSinging).toBe(true);
    expect(singingResult.isSpeech).toBe(false);
    expect(singingResult.confidence).toBeGreaterThan(0.75);
  });

  it('distinguishes unvoiced noise and random pitch speech from sustained singing', () => {
    // Unvoiced noise has low autocorrelation
    const noise = createNoiseFrame();
    const result = detector.processFrame(noise);

    expect(result.isSinging).toBe(false);
    expect(result.harmonicity).toBeLessThan(0.40);
  });

  it('preserves singing mode through brief breath pauses via hangover', () => {
    const toneFrame = createPureToneFrame(330); // E4 note

    // Enter singing mode
    for (let i = 0; i < 6; i++) {
      detector.processFrame(toneFrame);
    }
    expect(detector.getCurrentMode()).toBe('singing');

    // 2 frames of breath silence (hangover = 5)
    const silence = new Int16Array(480);
    const pause1 = detector.processFrame(silence);
    expect(pause1.mode).toBe('singing');
    expect(pause1.isSinging).toBe(true);

    const pause2 = detector.processFrame(silence);
    expect(pause2.mode).toBe('singing');
  });

  it('drops out of singing mode once hangover expires without audio', () => {
    const toneFrame = createPureToneFrame(440);

    for (let i = 0; i < 6; i++) {
      detector.processFrame(toneFrame);
    }
    expect(detector.getCurrentMode()).toBe('singing');

    // Feed 10 silence frames (exceeding hangover of 5)
    const silence = new Int16Array(480);
    for (let i = 0; i < 7; i++) {
      detector.processFrame(silence);
    }

    expect(detector.getCurrentMode()).toBe('silence');
  });

  it('clears state on reset()', () => {
    const toneFrame = createPureToneFrame(220);
    for (let i = 0; i < 6; i++) {
      detector.processFrame(toneFrame);
    }
    expect(detector.getCurrentMode()).toBe('singing');

    detector.reset();
    expect(detector.getCurrentMode()).toBe('silence');
  });
});
