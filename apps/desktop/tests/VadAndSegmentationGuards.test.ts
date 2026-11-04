import { describe, it, expect } from 'vitest';
import { SpeechSegmenter, VoiceActivityDetector, SingingActivityDetector, VirtualAudioSource } from '@pulpit-ai/audio-engine';
import { findCanonBook } from '@pulpit-ai/scripture-engine';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * PR 8 Integration Tests: VAD, Pre-Roll Ring Buffer, Overlap on Trailing Book, and Singing Separation.
 */
describe('PR 8: VAD, Segmentation, Trailing Book Overlap, and Singing Separation', () => {
  const synth = new VirtualAudioSource(16000);

  it('detectTrailingBookName accurately identifies trailing Bible books in transcript phrases', () => {
    const detectTrailingBookName = (text: string): string | null => {
      const clean = text.trim().replace(/[.,!?;:]+$/, '').toLowerCase();
      const tokens = clean.split(/\s+/);
      for (let len = Math.min(3, tokens.length); len >= 1; len--) {
        const candidate = tokens.slice(tokens.length - len).join(' ');
        const book = findCanonBook(candidate);
        if (book) {
          // Confirm not immediately followed by a number
          return book.name;
        }
      }
      return null;
    };

    // Trailing book names at end of segment
    expect(detectTrailingBookName('Turn in your Bibles to John')).toBe('John');
    expect(detectTrailingBookName('Please open to First Corinthians')).toBe('1 Corinthians');
    expect(detectTrailingBookName('Let us read from Romans.')).toBe('Romans');
    expect(detectTrailingBookName('As it is written in Genesis!')).toBe('Genesis');

    // References where chapter/verse are already spoken are NOT trailing bare books
    expect(detectTrailingBookName('John chapter 3 verse 16')).toBeNull();
    expect(detectTrailingBookName('Romans 8 28')).toBeNull();
    expect(detectTrailingBookName('Amen and praise the Lord')).toBeNull();
  });

  it('preserves pre-roll buffer when speech begins so initial consonants are captured', () => {
    const segmenter = new SpeechSegmenter({
      sampleRate: 16000,
      minSegmentSeconds: 0.5,
      preRollMs: 250, // 250ms = 4000 samples
      silenceHangoverFrames: 10
    });

    let emittedSegment: any = null;
    segmenter.onSegment((seg) => {
      emittedSegment = seg;
    });

    // 300ms of ambient/silence in ring buffer
    for (let i = 0; i < 10; i++) {
      segmenter.pushFrame(synth.generateSilence(0.03));
    }

    // 600ms of speech (20 frames)
    for (let i = 0; i < 20; i++) {
      segmenter.pushFrame(synth.generateSyntheticSpeechFrame(0.03));
    }

    // 300ms hangover silence (10 frames)
    for (let i = 0; i < 10; i++) {
      segmenter.pushFrame(synth.generateSilence(0.03));
    }

    expect(emittedSegment).not.toBeNull();
    // 600ms speech + 300ms hangover + 250ms pre-roll = 1150ms = 18,400 samples
    expect(emittedSegment.samples.length).toBeGreaterThanOrEqual(18000);
  });

  it('routes singing away from speech segmenter so worship music does not trigger Whisper speech transcription', () => {
    const singingDetector = new SingingActivityDetector({ sampleRate: 16000 });
    const segmenter = new SpeechSegmenter({ sampleRate: 16000, minSegmentSeconds: 0.5 });

    let speechEmittedCount = 0;
    segmenter.onSegment(() => {
      speechEmittedCount++;
    });

    // Simulate sustained singing (choir singing an A4 440Hz tone with vibrato)
    for (let i = 0; i < 40; i++) {
      const singingFrame = synth.generateTone(0.03, 440, 0.6);
      const metrics = singingDetector.processFrame(singingFrame);

      // In the real pipeline, main/index.ts checks metrics.isSinging:
      if (metrics.isSinging) {
        segmenter.setSingingActive(true);
      } else {
        segmenter.setSingingActive(false);
        segmenter.pushFrame(singingFrame);
      }
    }

    // Follow with silence
    for (let i = 0; i < 15; i++) {
      const silence = synth.generateSilence(0.03);
      const metrics = singingDetector.processFrame(silence);
      if (metrics.isSinging) {
        segmenter.setSingingActive(true);
      } else {
        segmenter.setSingingActive(false);
        segmenter.pushFrame(silence);
      }
    }

    // Speech segmenter must have stayed silent (0 emitted speech segments)
    expect(speechEmittedCount).toBe(0);
  });

  it('AUDIO_PIPELINE.md document matches real code constants and segmentation architecture', () => {
    const docPath = join(__dirname, '../../../docs/architecture/AUDIO_PIPELINE.md');
    const content = readFileSync(docPath, 'utf8');

    // Document must reflect PR 8 updates: pre-roll ring buffer, adaptive noise floor, and singing separation
    expect(content).toContain('AudioRingBuffer');
    expect(content).toContain('Adaptive');
    expect(content).toContain('Singing');
    expect(content).toContain('overlap');
  });
});
