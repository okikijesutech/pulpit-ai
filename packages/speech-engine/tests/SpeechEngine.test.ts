import { describe, it, expect, beforeEach } from 'vitest';
import {
  TranscriptNormalizer,
  ModelManager,
  WhisperWorkerProcess,
  SpeechRecognitionEngine
} from '../src/index.js';
import { SpeechSegment } from '@pulpit-ai/audio-engine';

describe('SpeechEngine Unit Tests', () => {
  describe('TranscriptNormalizer', () => {
    const normalizer = new TranscriptNormalizer();

    it('normalizes spoken numbers and book prefixes accurately', () => {
      const raw = 'First John chapter three verse sixteen';
      const result = normalizer.normalize(raw);

      expect(result.rawText).toBe(raw);
      expect(result.normalizedText).toBe('1 john chapter 3 verse 16');
      expect(result.tokens).toEqual(['1', 'john', 'chapter', '3', 'verse', '16']);
    });

    it('handles empty or whitespace text gracefully', () => {
      const result = normalizer.normalize('   ');
      expect(result.rawText).toBe('');
      expect(result.normalizedText).toBe('');
      expect(result.tokens).toEqual([]);
    });
  });

  describe('ModelManager', () => {
    it('retrieves metadata and real official SHA-256 checksums for ggml models', () => {
      const manager = new ModelManager();
      const baseInfo = manager.getModelInfo('base.en-q5_1');
      const tinyInfo = manager.getModelInfo('tiny.en-q5_1');
      const smallInfo = manager.getModelInfo('small.en-q5_1');

      expect(baseInfo).not.toBeNull();
      expect(baseInfo!.sizeBytes).toBe(59721011);
      // Real official SHA-256 checksum (64 hex characters, not mock)
      expect(baseInfo!.expectedSha256).toBe('4baf70dd0d7c4247ba2b81fafd9c01005ac77c2f9ef064e00dcf195d0e2fdd2f');
      expect(baseInfo!.expectedSha256).toMatch(/^[a-f0-9]{64}$/);

      expect(tinyInfo).not.toBeNull();
      expect(tinyInfo!.sizeBytes).toBe(32166155);
      expect(tinyInfo!.expectedSha256).toBe('c77c5766f1cef09b6b7d47f21b546cbddd4157886b3b5d6d4f709e91e66c7c2b');

      expect(smallInfo).not.toBeNull();
      expect(smallInfo!.sizeBytes).toBe(190098681);
      expect(smallInfo!.expectedSha256).toBe('bfdff4894dcb76bbf647d56263ea2a96645423f1669176f4844a1bf8e478ad30');
    });

    it('validates model file integrity via SHA-256 checksum verification', async () => {
      const manager = new ModelManager();
      // Test with dummy file
      const { writeFileSync, unlinkSync } = await import('node:fs');
      const { join } = await import('node:path');
      const { tmpdir } = await import('node:os');
      const testFile = join(tmpdir(), `test_model_${Date.now()}.bin`);

      try {
        writeFileSync(testFile, 'test model binary content');
        const { createHash } = await import('node:crypto');
        const realHash = createHash('sha256').update('test model binary content').digest('hex');

        // Valid checksum
        const isValid = await manager.verifyModelFile(testFile, realHash);
        expect(isValid).toBe(true);

        // Mismatched checksum
        const isInvalid = await manager.verifyModelFile(testFile, '0000000000000000000000000000000000000000000000000000000000000000');
        expect(isInvalid).toBe(false);
      } finally {
        try { unlinkSync(testFile); } catch {}
      }
    });

    it('requires explicit download prompt permission with disk space safety check', async () => {
      const manager = new ModelManager(2 * 1024 * 1024 * 1024); // 2 GB safety margin

      // Check against current directory
      const prompt = await manager.requestDownloadPermission('base.en-q5_1', process.cwd());
      expect(prompt.modelInfo).not.toBeNull();
      expect(prompt.modelInfo?.id).toBe('base.en-q5_1');
      expect(typeof prompt.allowed).toBe('boolean');
      expect(typeof prompt.freeBytes).toBe('number');
    });

    it('enforces disk space safety checks on any OS', async () => {
      // Configure manager requiring 1000 TB free space (which no consumer machine has)
      const strictManager = new ModelManager(1000 * 1024 * 1024 * 1024 * 1024);
      const check = await strictManager.checkDiskSpace(process.cwd(), 57 * 1024 * 1024);

      // Should safely reject
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Insufficient disk space');
    });

    it('fails closed when statfs throws an error', async () => {
      const manager = new ModelManager();
      // An invalid path that causes statfs to throw ENOENT
      const check = await manager.checkDiskSpace('/nonexistent/directory/that/does/not/exist/fail_closed_test', 57 * 1024 * 1024);

      // MUST FAIL CLOSED: allowed must be false
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Failing closed');
    });
  });

  describe('SpeechRecognitionEngine & Worker Recovery', () => {
    let engine: SpeechRecognitionEngine;
    let worker: WhisperWorkerProcess;

    beforeEach(() => {
      worker = new WhisperWorkerProcess();
      engine = new SpeechRecognitionEngine(worker);
    });

    it('processes speech segment and emits normalized transcript event', async () => {
      worker.registerMockTranscript(
        'psalm_23',
        'The Lord is my shepherd I shall not want'
      );

      const segment: SpeechSegment = {
        id: 'psalm_23_seg',
        samples: new Int16Array(16000), // 1 sec
        durationSeconds: 1.0,
        sourceId: 'mic_input',
        timestamp: Date.now()
      };

      let emittedEvent: any = null;
      engine.onTranscript((ev) => {
        emittedEvent = ev;
      });

      const result = await engine.processSegment(segment);
      expect(result).not.toBeNull();
      expect(result!.rawText).toBe('The Lord is my shepherd I shall not want');
      expect(result!.sourceId).toBe('mic_input');
      expect(emittedEvent).not.toBeNull();
      expect(emittedEvent.tokens).toContain('shepherd');
    });

    it('recovers cleanly from worker crash without crashing the host process', async () => {
      let errorCaught: Error | null = null;
      engine.onError((err) => {
        errorCaught = err;
      });

      // Simulate SIGSEGV in C++ worker
      worker.simulateCrash(139, 'SIGSEGV');

      expect(errorCaught).not.toBeNull();
      expect(errorCaught!.message).toContain('crashed with code 139');
      // Worker should have been automatically restarted
      expect(worker.isHealthy()).toBe(true);
    });

    describe('PR 7: Phantom Phrase Filtering', () => {
      const phantomPhrases = [
        '[MUSIC]',
        '[music]',
        '(music)',
        '[applause]',
        '[laughter]',
        '[BLANK_AUDIO]',
        'Thank you.',
        'Thank you',
        'Thank you very much.',
        'Thanks for watching!',
        'Subtitles by congregation'
      ];

      for (const phrase of phantomPhrases) {
        it(`filters out hallucinated phantom phrase: "${phrase}"`, async () => {
          worker.setNextTranscript(phrase);

          const segment: SpeechSegment = {
            id: 'ambient_noise_seg',
            samples: new Int16Array(16000),
            durationSeconds: 1.0,
            sourceId: 'mic',
            timestamp: Date.now()
          };

          let emitted = false;
          const unsub = engine.onTranscript(() => {
            emitted = true;
          });

          const result = await engine.processSegment(segment);
          unsub();

          // Must be discarded: returns null and does not emit event
          expect(result).toBeNull();
          expect(emitted).toBe(false);
        });
      }

      it('does NOT filter genuine preaching speech containing common polite words', async () => {
        worker.setNextTranscript('Thank you Lord for John chapter three verse sixteen');

        const segment: SpeechSegment = {
          id: 'preach_seg',
          samples: new Int16Array(16000),
          durationSeconds: 1.0,
          sourceId: 'mic',
          timestamp: Date.now()
        };

        const result = await engine.processSegment(segment);
        expect(result).not.toBeNull();
        expect(result!.rawText).toBe('Thank you Lord for John chapter three verse sixteen');
      });
    });

    describe('PR 7: Real Confidence or None', () => {
      it('retains real confidence when provided by inference engine', async () => {
        worker.setNextResult({
          text: 'Romans eight twenty-eight',
          confidence: 0.88,
          latencyMs: 120
        });

        const segment: SpeechSegment = {
          id: 'romans_seg',
          samples: new Int16Array(16000),
          durationSeconds: 1.0,
          sourceId: 'mic',
          timestamp: Date.now()
        };

        const result = await engine.processSegment(segment);
        expect(result).not.toBeNull();
        expect(result!.confidence).toBe(0.88);
      });

      it('reports confidence as null (or undefined) when no real confidence is available', async () => {
        worker.setNextResult({
          text: 'Isaiah fifty-three verse five',
          confidence: null,
          latencyMs: 140
        });

        const segment: SpeechSegment = {
          id: 'isaiah_seg',
          samples: new Int16Array(16000),
          durationSeconds: 1.0,
          sourceId: 'mic',
          timestamp: Date.now()
        };

        const result = await engine.processSegment(segment);
        expect(result).not.toBeNull();
        // Must be null, NEVER fabricated 0.94 / 0.92
        expect(result!.confidence).toBeNull();
      });
    });

    describe('PR 7: Canonical Protestant Initial Prompt', () => {
      it('seeds the initial prompt with Protestant canon books to bias attention heads', () => {
        const prompt = worker.getInitialPrompt();
        expect(prompt).toContain('Genesis');
        expect(prompt).toContain('Matthew');
        expect(prompt).toContain('Romans');
        expect(prompt).toContain('Habakkuk');
        expect(prompt).toContain('Revelation');
        expect(prompt.toLowerCase()).toContain('chapter');
        expect(prompt.toLowerCase()).toContain('verse');
      });
    });
  });
});
