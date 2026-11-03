import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TranscriptNormalizer } from '@pulpit-ai/speech-engine';
import {
  ScriptureDatabase,
  ScriptureCandidateGenerator,
  WEB_PACKAGE,
  KJV_PACKAGE
} from '@pulpit-ai/scripture-engine';

describe('Spoken Number Pipeline (PR 1)', () => {
  let db: ScriptureDatabase;
  let generator: ScriptureCandidateGenerator;
  let normalizer: TranscriptNormalizer;

  beforeEach(() => {
    db = new ScriptureDatabase(':memory:');
    db.loadPackage(WEB_PACKAGE);
    db.loadPackage(KJV_PACKAGE);
    generator = new ScriptureCandidateGenerator(db, {
      activeTranslation: 'WEB',
      cooldownMs: 0
    });
    normalizer = new TranscriptNormalizer();
  });

  afterEach(() => {
    db.close();
  });

  describe('End-to-End Raw Transcript to Candidate', () => {
    const testCases = [
      { raw: 'Psalm twenty-three', expectedTitle: 'Psalms 23' },
      { raw: 'Romans eight twenty-eight', expectedTitle: 'Romans 8:28' },
      { raw: 'Isaiah fifty-three verse five', expectedTitle: 'Isaiah 53:5' },
      { raw: 'Psalm one hundred and nineteen verse eleven', expectedTitle: 'Psalms 119:11' },
      { raw: 'Psalm 23', expectedTitle: 'Psalms 23' },
      { raw: 'Romans 8:28', expectedTitle: 'Romans 8:28' },
      { raw: 'Isaiah 53:5', expectedTitle: 'Isaiah 53:5' },
      { raw: 'Psalm 119:11', expectedTitle: 'Psalms 119:11' }
    ];

    for (const { raw, expectedTitle } of testCases) {
      it(`resolves "${raw}" to ${expectedTitle}`, () => {
        // Run real normalizer for display and tokens
        const normResult = normalizer.normalize(raw);
        expect(normResult.rawText).toBe(raw);
        expect(normResult.tokens.length).toBeGreaterThan(0);

        // Feed rawText into the scripture generator (as required by PR 1)
        const candidate = generator.processTranscript(normResult.rawText);
        expect(candidate).not.toBeNull();
        expect(candidate?.title).toContain(expectedTitle);
      });
    }
  });

  describe('TranscriptNormalizer compound handling', () => {
    it('normalizes compound tens and ones without producing separated numbers', () => {
      const res = normalizer.normalize('Psalm twenty-three');
      expect(res.normalizedText).toBe('psalm 23');
      expect(res.tokens).toEqual(['psalm', '23']);
    });

    it('normalizes hundreds compounds without producing separated numbers', () => {
      const res = normalizer.normalize('Psalm one hundred and nineteen verse eleven');
      expect(res.normalizedText).toBe('psalm 119 verse 11');
      expect(res.tokens).toEqual(['psalm', '119', 'verse', '11']);
    });
  });

  describe('Regression: Routing normalizedText into parser causes corruption', () => {
    it('demonstrates that routing naive one-by-one normalized text ("psalm 20 3") corrupts reference to Psalm 20:3 instead of Psalm 23', () => {
      const naiveOneByOne = 'psalm 20 3';
      const corrupted = generator.processTranscript(naiveOneByOne);
      // Because numbers were split one-by-one into 20 and 3, it parses chapter 20, verse 3!
      expect(corrupted).not.toBeNull();
      expect(corrupted?.title).toContain('Psalms 20:3');
      expect(corrupted?.title).not.toContain('Psalms 23');
    });

    it('fails if someone routes normalizedText instead of rawText in the desktop event pipeline', () => {
      // Simulate Whisper transcript event
      const event = {
        rawText: 'Psalm twenty-three',
        // Suppose a naive or legacy normalizer generated one-by-one numbers
        normalizedText: 'psalm 20 3'
      };

      // Correct PR 1 pipeline routes event.rawText:
      const correctCandidate = generator.processTranscript(event.rawText);
      expect(correctCandidate).not.toBeNull();
      expect(correctCandidate?.title).toContain('Psalms 23');

      // If someone mistakenly routes event.normalizedText back into the parser:
      const badCandidate = generator.processTranscript(event.normalizedText);
      // It produces Psalm 20:3 instead of Psalm 23!
      expect(badCandidate?.title).not.toContain('Psalms 23');
      expect(badCandidate?.title).toContain('Psalms 20:3');
    });
  });
});
