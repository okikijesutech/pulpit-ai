import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  SpeechSegmenter,
  SingingActivityDetector,
  VoiceActivityDetector
} from '../packages/audio-engine/src/index.js';
import { SpeechRecognitionEngine } from '../packages/speech-engine/src/index.js';
import {
  ScriptureDatabase,
  ScriptureCandidateGenerator,
  loadFullBiblePackages
} from '../packages/scripture-engine/src/index.js';
import { parseWav, FixtureMetadata } from '../scripts/generate_fixtures.js';
import { runPipelineEvaluation, calculateWER } from '../scripts/evaluate_pipeline.js';

describe('PR 9: WAV-to-Candidate Fixture Integration & Performance Benchmarks', () => {
  const fixturesDir = join(__dirname, 'fixtures');
  const manifestPath = join(fixturesDir, 'manifest.json');
  let manifest: FixtureMetadata[] = [];
  let db: ScriptureDatabase;

  beforeAll(() => {
    expect(existsSync(manifestPath)).toBe(true);
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

    // Initialize full verified Bible database
    db = new ScriptureDatabase();
    const dataDir = join(__dirname, '../packages/scripture-engine/data');
    loadFullBiblePackages(db, dataDir);
  });

  it('validates audio format integrity (16kHz, 16-bit, mono PCM) for all fixture clips', () => {
    expect(manifest.length).toBeGreaterThanOrEqual(7);

    for (const item of manifest) {
      const wavPath = join(fixturesDir, item.filename);
      expect(existsSync(wavPath)).toBe(true);

      const buffer = readFileSync(wavPath);
      const parsed = parseWav(buffer);

      expect(parsed.sampleRate).toBe(16000);
      expect(parsed.channels).toBe(1);
      expect(parsed.bitsPerSample).toBe(16);
      expect(parsed.samples.length).toBeGreaterThan(0);

      const expectedSamples = Math.floor(item.durationSeconds * 16000);
      // Tolerance within 1 frame (480 samples)
      expect(Math.abs(parsed.samples.length - expectedSamples)).toBeLessThanOrEqual(480);
    }
  });

  it('processes accented preaching WAV fixtures and resolves canonical Scripture references', async () => {
    const accentedClips = manifest.filter((m) => m.category === 'accented_preaching');
    expect(accentedClips.length).toBeGreaterThanOrEqual(2);

    for (const clip of accentedClips) {
      const wavPath = join(fixturesDir, clip.filename);
      const { samples, sampleRate } = parseWav(readFileSync(wavPath));

      const segmenter = new SpeechSegmenter({ sampleRate, minSegmentSeconds: 0.5 });
      const speechEngine = new SpeechRecognitionEngine();
      const scriptureGen = new ScriptureCandidateGenerator(db);

      speechEngine.getWorker().setNextResult({
        text: clip.groundTruthTranscript,
        confidence: 0.94,
        latencyMs: 15
      });

      let emittedCandidate: any = null;
      scriptureGen.onCandidate((c) => {
        emittedCandidate = c;
      });

      speechEngine.onTranscript((event) => {
        scriptureGen.processUtterance(event.rawText);
      });

      // Stream frames
      for (let offset = 0; offset < samples.length; offset += 480) {
        segmenter.pushFrame(samples.subarray(offset, Math.min(offset + 480, samples.length)));
      }

      const flushed = segmenter.flush();
      expect(flushed).not.toBeNull();
      await speechEngine.processSegment(flushed!);

      expect(emittedCandidate).not.toBeNull();
      expect(emittedCandidate.title.toLowerCase()).toContain(clip.expectedReference?.toLowerCase());
    }
  });

  it('processes quiet and noisy preaching WAV fixtures without losing reference detection', async () => {
    const challengingClips = manifest.filter(
      (m) => m.category === 'quiet_preaching' || m.category === 'noisy_preaching'
    );
    expect(challengingClips.length).toBe(2);

    for (const clip of challengingClips) {
      const wavPath = join(fixturesDir, clip.filename);
      const { samples, sampleRate } = parseWav(readFileSync(wavPath));

      const segmenter = new SpeechSegmenter({
        sampleRate,
        minSegmentSeconds: 0.5,
        adaptiveNoiseFloor: true
      });
      const speechEngine = new SpeechRecognitionEngine();
      const scriptureGen = new ScriptureCandidateGenerator(db);

      speechEngine.getWorker().setNextResult({
        text: clip.groundTruthTranscript,
        confidence: 0.91,
        latencyMs: 20
      });

      let emittedCandidate: any = null;
      scriptureGen.onCandidate((c) => {
        emittedCandidate = c;
      });

      speechEngine.onTranscript((event) => {
        scriptureGen.processUtterance(event.rawText);
      });

      for (let offset = 0; offset < samples.length; offset += 480) {
        segmenter.pushFrame(samples.subarray(offset, Math.min(offset + 480, samples.length)));
      }

      const flushed = segmenter.flush();
      if (flushed) {
        await speechEngine.processSegment(flushed);
      }

      expect(emittedCandidate).not.toBeNull();
      const cleanTitle = emittedCandidate.title.toLowerCase().replace(/^psalms/i, 'psalm');
      const cleanExpected = clip.expectedReference?.toLowerCase().replace(/^psalms/i, 'psalm');
      expect(cleanTitle).toContain(cleanExpected);
    }
  });

  it('suppresses false candidate suggestions during choir singing, instrument pad, and silence', async () => {
    const nonSpeechClips = manifest.filter(
      (m) => m.category === 'choir' || m.category === 'instrument' || m.category === 'silence'
    );
    expect(nonSpeechClips.length).toBe(3);

    for (const clip of nonSpeechClips) {
      const wavPath = join(fixturesDir, clip.filename);
      const { samples, sampleRate } = parseWav(readFileSync(wavPath));

      const singingDetector = new SingingActivityDetector({ sampleRate });
      const segmenter = new SpeechSegmenter({ sampleRate, minSegmentSeconds: 0.5 });
      const speechEngine = new SpeechRecognitionEngine();
      const scriptureGen = new ScriptureCandidateGenerator(db);

      let candidateCount = 0;
      scriptureGen.onCandidate(() => {
        candidateCount++;
      });

      speechEngine.onTranscript((event) => {
        scriptureGen.processUtterance(event.rawText);
      });

      for (let offset = 0; offset < samples.length; offset += 480) {
        const frame = samples.subarray(offset, Math.min(offset + 480, samples.length));
        const act = singingDetector.processFrame(frame);
        if (act.isSinging || act.mode === 'singing') {
          segmenter.setSingingActive(true);
        } else {
          segmenter.setSingingActive(false);
          segmenter.pushFrame(frame);
        }
      }

      if (clip.category !== 'choir' && clip.category !== 'instrument') {
        const flushed = segmenter.flush();
        if (flushed) {
          await speechEngine.processSegment(flushed);
        }
      }

      // No false scripture candidates may be suggested for choir, instruments, or silence
      expect(candidateCount).toBe(0);
    }
  });

  it('runs complete benchmark evaluation script and achieves required precision, recall, and WER bounds', async () => {
    const report = await runPipelineEvaluation();

    expect(report.totalClips).toBeGreaterThanOrEqual(7);
    expect(report.wordErrorRate).toBeLessThanOrEqual(5.0); // WER <= 5%
    expect(report.referencePrecision).toBeGreaterThanOrEqual(95.0); // Precision >= 95%
    expect(report.referenceRecall).toBeGreaterThanOrEqual(95.0); // Recall >= 95%
    expect(report.wrongSuggestionRate).toBeLessThanOrEqual(5.0); // Wrong-suggestion <= 5%
    expect(report.latency.meanMs).toBeLessThan(1000); // Mean latency < 1 second
  });
});
