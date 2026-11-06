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

  it('flushes in-progress speech immediately when flush() is invoked', () => {
    const segmenter = new SpeechSegmenter({ sampleRate: 16000, minSegmentSeconds: 0.5 });
    const emitted: SpeechSegment[] = [];
    segmenter.onSegment((seg) => emitted.push(seg));

    // Feed 0.8s of speech (27 frames @ 30ms = ~810ms > minSamples)
    for (let i = 0; i < 27; i++) {
      segmenter.pushFrame(synth.generateSyntheticSpeechFrame(0.03));
    }

    expect(emitted.length).toBe(0); // Still active utterance

    // Explicit flush
    const flushed = segmenter.flush();
    expect(flushed).not.toBeNull();
    expect(emitted.length).toBe(1);
    expect(emitted[0].durationSeconds).toBeGreaterThanOrEqual(0.7);

    // After flush, buffer is empty
    expect(segmenter.flush()).toBeNull();
  });

  it('switching sources flushes in-progress segmenter buffer cleanly', () => {
    const segmenter = new SpeechSegmenter({ sampleRate: 16000, minSegmentSeconds: 0.5 });
    const emitted: SpeechSegment[] = [];
    segmenter.onSegment((seg) => emitted.push(seg));

    // Feed 0.8s of speech on device A
    segmenter.setSourceId('device_A');
    for (let i = 0; i < 27; i++) {
      segmenter.pushFrame(synth.generateSyntheticSpeechFrame(0.03));
    }

    // Switch to device B - should flush device A speech rather than leaving it dangling or corrupting
    const flushed = segmenter.setSourceId('device_B');
    expect(flushed).not.toBeNull();
    expect(flushed?.sourceId).toBe('device_A');
    expect(emitted.length).toBe(1);
    expect(emitted[0].sourceId).toBe('device_A');
  });

  describe('PR 8: VAD, Ring Buffer Pre-Roll, Boundary Overlap & Singing Separation', () => {
    it('prepends 200-300 ms pre-roll audio from AudioRingBuffer to preserve initial speech phonemes', () => {
      const segmenter = new SpeechSegmenter({
        sampleRate: 16000,
        minSegmentSeconds: 0.5,
        preRollMs: 250, // 250ms pre-roll
        silenceHangoverFrames: 10
      });
      const emitted: SpeechSegment[] = [];
      segmenter.onSegment((seg) => emitted.push(seg));

      // Feed 10 frames of background silence (300ms) to fill pre-roll buffer
      for (let i = 0; i < 10; i++) {
        segmenter.pushFrame(synth.generateSilence(0.03));
      }

      // Feed 18 frames of speech (540ms)
      for (let i = 0; i < 18; i++) {
        segmenter.pushFrame(synth.generateSyntheticSpeechFrame(0.03));
      }

      // Feed 10 frames of silence to trigger segment emission (300ms hangover)
      for (let i = 0; i < 10; i++) {
        segmenter.pushFrame(synth.generateSilence(0.03));
      }

      expect(emitted.length).toBe(1);
      // Total samples must include pre-roll (250ms = 4000 samples) + speech + hangover
      // 540ms speech + 300ms hangover = 840ms = 13,440 samples
      // With 250ms pre-roll (4000 samples), total >= 17,440 samples (approx 1.09s)
      expect(emitted[0].samples.length).toBeGreaterThanOrEqual(16000);
      expect(emitted[0].durationSeconds).toBeGreaterThanOrEqual(1.0);
    });

    it('overlaps trailing audio into the next segment when requested', () => {
      const segmenter = new SpeechSegmenter({
        sampleRate: 16000,
        minSegmentSeconds: 0.5,
        silenceHangoverFrames: 10,
        trailingOverlapMs: 1000 // 1.0s overlap
      });
      const emitted: SpeechSegment[] = [];
      segmenter.onSegment((seg) => emitted.push(seg));

      // Utterance 1: Preacher says "Turn in your Bibles to the book of John" (~1.2s speech)
      for (let i = 0; i < 40; i++) {
        segmenter.pushFrame(synth.generateSyntheticSpeechFrame(0.03));
      }
      for (let i = 0; i < 10; i++) {
        segmenter.pushFrame(synth.generateSilence(0.03));
      }
      expect(emitted.length).toBe(1);

      // Trailing book name detected near end of Utterance 1 -> Request overlap for next segment
      segmenter.requestOverlap(1.0);
      expect(segmenter.hasPendingOverlap()).toBe(true);

      // Utterance 2: Preacher follows with "Chapter three verse sixteen" (~0.9s speech)
      for (let i = 0; i < 30; i++) {
        segmenter.pushFrame(synth.generateSyntheticSpeechFrame(0.03));
      }
      for (let i = 0; i < 10; i++) {
        segmenter.pushFrame(synth.generateSilence(0.03));
      }
      expect(emitted.length).toBe(2);

      // Utterance 2 should include the 1.0s trailing audio from Utterance 1 prepended to it
      // 0.9s speech (14,400) + 0.3s hangover (4,800) + 1.0s overlap (16,000) = ~35,200 samples (> 2.0s)
      expect(emitted[1].durationSeconds).toBeGreaterThanOrEqual(2.0);
      // Pending overlap is consumed
      expect(segmenter.hasPendingOverlap()).toBe(false);
    });

    it('extends hangover when extendHangover() is invoked', () => {
      const segmenter = new SpeechSegmenter({
        sampleRate: 16000,
        minSegmentSeconds: 0.5,
        silenceHangoverFrames: 10 // Normal hangover = 10 frames = 300ms
      });
      const emitted: SpeechSegment[] = [];
      segmenter.onSegment((seg) => emitted.push(seg));

      // Feed speech
      for (let i = 0; i < 30; i++) {
        segmenter.pushFrame(synth.generateSyntheticSpeechFrame(0.03));
      }

      // Extend hangover by 15 frames (extra 450ms, total 25 frames)
      segmenter.extendHangover(15);

      // Feed 12 frames of silence: with base hangover (10) it would have cut, but with extension it stays open!
      for (let i = 0; i < 12; i++) {
        segmenter.pushFrame(synth.generateSilence(0.03));
      }
      expect(emitted.length).toBe(0); // Still open!

      // Feed remaining 15 frames of silence to exceed total extended hangover (27 > 25)
      for (let i = 0; i < 15; i++) {
        segmenter.pushFrame(synth.generateSilence(0.03));
      }
      expect(emitted.length).toBe(1);
    });

    it('sends singing away from the speech path and suppresses speech segment emission', () => {
      const segmenter = new SpeechSegmenter({
        sampleRate: 16000,
        minSegmentSeconds: 0.5,
        silenceHangoverFrames: 10
      });
      const emitted: SpeechSegment[] = [];
      segmenter.onSegment((seg) => emitted.push(seg));

      // Feed 50 frames of loud singing frames with isSinging = true
      for (let i = 0; i < 50; i++) {
        const singingFrame = synth.generateTone(0.03, 261.63, 0.7); // Middle C sustained note
        segmenter.pushFrame(singingFrame, true);
      }

      // Follow with silence
      for (let i = 0; i < 15; i++) {
        segmenter.pushFrame(synth.generateSilence(0.03), false);
      }

      // No speech segments should be emitted for singing audio
      expect(emitted.length).toBe(0);
    });

    it('cleanly flushes in-progress speech when singing begins mid-stream', () => {
      const segmenter = new SpeechSegmenter({
        sampleRate: 16000,
        minSegmentSeconds: 0.5,
        silenceHangoverFrames: 10
      });
      const emitted: SpeechSegment[] = [];
      segmenter.onSegment((seg) => emitted.push(seg));

      // Preacher speaks for 1 second (33 frames)
      for (let i = 0; i < 33; i++) {
        segmenter.pushFrame(synth.generateSyntheticSpeechFrame(0.03), false);
      }
      expect(emitted.length).toBe(0); // In progress

      // Choir starts singing: transition to singing
      segmenter.setSingingActive(true);
      expect(emitted.length).toBe(1); // In-progress speech flushed cleanly
      expect(emitted[0].durationSeconds).toBeGreaterThanOrEqual(0.8);

      // Further singing frames are discarded by speech segmenter
      for (let i = 0; i < 30; i++) {
        segmenter.pushFrame(synth.generateTone(0.03, 330, 0.6), true);
      }
      expect(emitted.length).toBe(1); // No new speech segments
    });

    it('discards segments whose overall RMS acoustic energy is below 0.005 to suppress ambient fan hum', () => {
      const segmenter = new SpeechSegmenter({
        sampleRate: 16000,
        minSegmentSeconds: 0.5,
        silenceHangoverFrames: 5,
        minSegmentRms: 0.005
      });
      const emitted: SpeechSegment[] = [];
      segmenter.onSegment((seg) => emitted.push(seg));

      // Feed frames of very low noise (RMS ~0.002)
      for (let i = 0; i < 30; i++) {
        segmenter.pushFrame(synth.generateNoise(0.03, 0.003));
      }

      const flushed = segmenter.flush();
      expect(flushed).toBeNull();
      expect(emitted.length).toBe(0);
    });
  });
});
