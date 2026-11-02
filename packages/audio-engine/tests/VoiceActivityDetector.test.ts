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
});
