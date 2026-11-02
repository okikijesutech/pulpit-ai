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
    it('retrieves metadata for default quantized model', () => {
      const manager = new ModelManager();
      const info = manager.getModelInfo('base.en-q5_1');

      expect(info).not.toBeNull();
      expect(info!.sizeBytes).toBeLessThan(60 * 1024 * 1024); // Under 60MB
      expect(info!.recommendedRamMb).toBeLessThanOrEqual(250);
    });

    it('enforces disk space safety checks', async () => {
      // Configure manager requiring 100 GB free space (which this 11 GB laptop does not have)
      const strictManager = new ModelManager(100 * 1024 * 1024 * 1024);
      const check = await strictManager.checkDiskSpace('C:\\', 57 * 1024 * 1024);

      // Should safely reject
      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('Insufficient disk space');
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
  });
});
