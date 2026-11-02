import { describe, it, expect } from 'vitest';
import { SpeechSegmenter, VirtualAudioSource, SpeechSegment } from '../src/index.js';

describe('SpeechSegmenter', () => {
  const synth = new VirtualAudioSource(16000);

  it('does not emit segments during continuous silence', () => {
    const segmenter = new SpeechSegmenter({ sampleRate: 16000 });
    const emitted: SpeechSegment[] = [];
    segmenter.onSegment((seg) => emitted.push(seg));

    // Feed 2 seconds of silence in 30ms frames
    const frameSize = 480;
    for (let i = 0; i < 66; i++) {
      segmenter.pushFrame(new Int16Array(frameSize));
    }

    expect(emitted.length).toBe(0);
  });

  it('accumulates speech and emits segment after silence hangover', () => {
    const segmenter = new SpeechSegmenter({
      sampleRate: 16000,
      minSegmentSeconds: 0.5,
      silenceHangoverFrames: 10
    });
    const emitted: SpeechSegment[] = [];
    segmenter.onSegment((seg) => emitted.push(seg));

    // Feed 1 second of speech (approx 33 frames of 30ms)
    for (let i = 0; i < 33; i++) {
      segmenter.pushFrame(synth.generateSyntheticSpeechFrame(0.03));
    }

    expect(emitted.length).toBe(0); // Still speaking

    // Feed 10 frames of silence to trigger hangover cut
    for (let i = 0; i < 10; i++) {
      segmenter.pushFrame(new Int16Array(480));
    }

    expect(emitted.length).toBe(1);
    expect(emitted[0].durationSeconds).toBeGreaterThanOrEqual(1.0);
    expect(emitted[0].sourceId).toBe('default_source');
  });

  it('resets and prevents fragment joining across audio device switch', () => {
    const segmenter = new SpeechSegmenter({ sampleRate: 16000, minSegmentSeconds: 0.5 });
    const emitted: SpeechSegment[] = [];
    segmenter.onSegment((seg) => emitted.push(seg));

    // Feed 0.5s of speech on device A
    segmenter.setSourceId('device_mic_A');
    for (let i = 0; i < 16; i++) {
      segmenter.pushFrame(synth.generateSyntheticSpeechFrame(0.03));
    }

    // Switch device to device B
    segmenter.setSourceId('device_mixer_B');

    // Feed speech on device B followed by silence
    for (let i = 0; i < 30; i++) {
      segmenter.pushFrame(synth.generateSyntheticSpeechFrame(0.03));
    }
    for (let i = 0; i < 15; i++) {
      segmenter.pushFrame(new Int16Array(480));
    }

    expect(emitted.length).toBe(1);
    // Crucial check: The emitted segment is strictly tagged with device_mixer_B and did NOT merge device A
    expect(emitted[0].sourceId).toBe('device_mixer_B');
  });
});
