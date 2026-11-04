import { describe, it, expect } from 'vitest';
import { VoiceActivityDetector, VirtualAudioSource } from '../src/index.js';

describe('VoiceActivityDetector (VAD)', () => {
  const vad = new VoiceActivityDetector({ sampleRate: 16000 });
  const synth = new VirtualAudioSource(16000);

  it('classifies silence as non-speech', () => {
    const silenceFrame = synth.generateSilence(0.03); // 30ms
    const result = vad.processFrame(silenceFrame);

    expect(result.isSpeech).toBe(false);
    expect(result.energy).toBe(0);
    expect(result.zeroCrossingRate).toBe(0);
  });

  it('classifies modulated synthetic speech waveform as active speech', () => {
    const speechFrame = synth.generateSyntheticSpeechFrame(0.03); // 30ms
    const result = vad.processFrame(speechFrame);

    expect(result.isSpeech).toBe(true);
    expect(result.energy).toBeGreaterThan(0.015);
    expect(result.zeroCrossingRate).toBeGreaterThan(5);
  });

  it('rejects low-frequency DC offset or rumble as speech due to low ZCR', () => {
    // 2Hz extreme low rumble (below min zero crossings)
    const rumble = synth.generateTone(0.03, 2, 0.5);
    const result = vad.processFrame(rumble);

    expect(result.isSpeech).toBe(false);
  });

  describe('PR 8: Adaptive Noise Floor VAD', () => {
    it('adapts noise floor upward when ambient background noise rises and rejects ambient noise as non-speech', () => {
      const adaptiveVad = new VoiceActivityDetector({
        sampleRate: 16000,
        adaptiveNoiseFloor: true,
        initialNoiseFloor: 0.002,
        energyThreshold: 0.0035,
        snrMarginMultiplier: 1.8
      });

      const initialThreshold = adaptiveVad.getCurrentThreshold();
      expect(adaptiveVad.getNoiseFloor()).toBe(0.002);

      // Feed 30 frames of ambient room noise (RMS ~0.006)
      for (let i = 0; i < 30; i++) {
        const noiseFrame = synth.generateNoise(0.03, 0.006);
        adaptiveVad.processFrame(noiseFrame);
      }

      // The noise floor should have adapted upward
      expect(adaptiveVad.getNoiseFloor()).toBeGreaterThan(0.002);
      // Dynamic threshold should be elevated above the initial threshold
      expect(adaptiveVad.getCurrentThreshold()).toBeGreaterThan(initialThreshold);

      // A continuous noise frame of that same level should now be rejected as non-speech
      const testNoiseFrame = synth.generateNoise(0.03, 0.006);
      const noiseResult = adaptiveVad.processFrame(testNoiseFrame);
      expect(noiseResult.isSpeech).toBe(false);
    });

    it('successfully detects speech above an elevated ambient noise floor', () => {
      const adaptiveVad = new VoiceActivityDetector({
        sampleRate: 16000,
        adaptiveNoiseFloor: true,
        initialNoiseFloor: 0.002,
        energyThreshold: 0.0035,
        snrMarginMultiplier: 1.8
      });

      // Elevate noise floor with ambient background noise
      for (let i = 0; i < 25; i++) {
        adaptiveVad.processFrame(synth.generateNoise(0.03, 0.005));
      }

      // Loud preaching speech (energy well above elevated threshold)
      const speechFrame = synth.generateSyntheticSpeechFrame(0.03);
      const result = adaptiveVad.processFrame(speechFrame);

      expect(result.isSpeech).toBe(true);
      expect(result.energy).toBeGreaterThan(adaptiveVad.getCurrentThreshold());
    });

    it('adapts noise floor downward when ambient sound subsides to silence', () => {
      const adaptiveVad = new VoiceActivityDetector({
        sampleRate: 16000,
        adaptiveNoiseFloor: true,
        initialNoiseFloor: 0.015, // Starts high
        minNoiseFloor: 0.001
      });

      expect(adaptiveVad.getNoiseFloor()).toBe(0.015);

      // Feed silence frames
      for (let i = 0; i < 40; i++) {
        adaptiveVad.processFrame(synth.generateSilence(0.03));
      }

      expect(adaptiveVad.getNoiseFloor()).toBeLessThan(0.008);
      expect(adaptiveVad.getNoiseFloor()).toBeGreaterThanOrEqual(0.001);
    });

    it('clamps noise floor within min and max boundaries', () => {
      const adaptiveVad = new VoiceActivityDetector({
        sampleRate: 16000,
        adaptiveNoiseFloor: true,
        minNoiseFloor: 0.001,
        maxNoiseFloor: 0.03
      });

      // Continuous silence must not push floor below min
      for (let i = 0; i < 100; i++) {
        adaptiveVad.processFrame(synth.generateSilence(0.03));
      }
      expect(adaptiveVad.getNoiseFloor()).toBeGreaterThanOrEqual(0.001);

      // Extreme ambient noise must not push floor above max
      for (let i = 0; i < 100; i++) {
        adaptiveVad.processFrame(synth.generateNoise(0.03, 0.08));
      }
      expect(adaptiveVad.getNoiseFloor()).toBeLessThanOrEqual(0.03);
    });
  });
});
