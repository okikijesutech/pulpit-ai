import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ScriptureDatabase,
  loadFullBiblePackages,
  ScriptureCandidateGenerator,
  ScriptureReferenceParser
} from '../src/index.js';

describe('ScriptureParserGuards (PR 5: Parser Guards & Rolling Window)', () => {
  let db: ScriptureDatabase;
  let generator: ScriptureCandidateGenerator;

  beforeEach(() => {
    db = new ScriptureDatabase(':memory:');
    loadFullBiblePackages(db);
    generator = new ScriptureCandidateGenerator(db, {
      activeTranslation: 'WEB',
      cooldownMs: 10000 // 10s cooldown
    });
  });

  afterEach(() => {
    db.close();
  });

  describe('Guard 1: Cues for Bare Numbers', () => {
    it('"mark 10 times" and "job 2 weeks ago" produce no candidate', () => {
      const candMark = generator.processTranscript('I told you to mark 10 times already.');
      expect(candMark).toBeNull();

      const candJob = generator.processTranscript('I finished that job 2 weeks ago.');
      expect(candJob).toBeNull();
    });

    it('cue-less bare matches receive lower confidence and needsReview flag in parser', () => {
      // Cue-less bare two-number match
      const result = ScriptureReferenceParser.parse('Romans 8 28');
      expect(result.hasReference).toBe(true);
      expect(result.confidence).toBeLessThan(0.85);
      expect(result.needsReview).toBe(true);

      // Cue-less single number with non-scriptural unit
      const resultTimes = ScriptureReferenceParser.parse('mark 10 times');
      expect(resultTimes.hasReference).toBe(false);

      const resultWeeks = ScriptureReferenceParser.parse('job 2 weeks ago');
      expect(resultWeeks.hasReference).toBe(false);
    });

    it('accepts bare numbers when accompanied by an explicit cue', () => {
      // Colon cue
      const colonRes = generator.processTranscript('Look at John 3:16');
      expect(colonRes).not.toBeNull();
      expect(colonRes?.title).toContain('John 3:16');

      // "chapter" and "verse" cue
      const chRes = generator.processTranscript('Let us read Romans chapter 8 verse 28');
      expect(chRes).not.toBeNull();
      expect(chRes?.title).toContain('Romans 8:28');

      // "turn to" cue
      const turnRes = generator.processTranscript('Turn to Isaiah 53 5 please');
      expect(turnRes).not.toBeNull();
      expect(turnRes?.title).toContain('Isaiah 53:5');

      // "open to" cue
      const openRes = generator.processTranscript('Open to Psalms 23 1');
      expect(openRes).not.toBeNull();
      expect(openRes?.title).toContain('Psalms 23:1');
    });
  });

  describe('Guard 2: Whole-Chapter Results', () => {
    it('labels whole-chapter results as "whole chapter, no verse given" and does not silently default to verse 1', () => {
      const result = ScriptureReferenceParser.parse('Please turn to John chapter 3');
      expect(result.hasReference).toBe(true);
      expect(result.isWholeChapter).toBe(true);
      expect(result.reference?.label).toBe('whole chapter, no verse given');
      expect(result.reference?.verseEnd).toBe(36); // John 3 has 36 verses, not just verse 1

      const candidate = generator.processTranscript('Please open your Bible to John chapter 3');
      expect(candidate).not.toBeNull();
      expect(candidate?.title).toContain('whole chapter, no verse given');
      expect(candidate?.title).not.toBe('John 3:1 (WEB)');
      expect(candidate?.actionPayload.data?.verse).not.toBe(1);
    });

    it('keeps complete Psalm behavior for Psalms: Psalm 23 covers entire psalm', () => {
      const result = ScriptureReferenceParser.parse('Turn to Psalm 23');
      expect(result.hasReference).toBe(true);
      expect(result.reference?.book).toBe('Psalms');
      expect(result.reference?.chapter).toBe(23);
      expect(result.reference?.verseStart).toBe(1);
      expect(result.reference?.verseEnd).toBe(6);
    });
  });

  describe('Guard 3: Return All References Found in a Segment', () => {
    it('returns all references found in a single transcript segment', () => {
      const text = 'Please open to John 3:16 and also turn to Romans 8:28.';
      const allResults = ScriptureReferenceParser.parseAll(text);

      expect(allResults.length).toBe(2);
      expect(allResults[0].reference?.book).toBe('John');
      expect(allResults[0].reference?.chapter).toBe(3);
      expect(allResults[0].reference?.verseStart).toBe(16);

      expect(allResults[1].reference?.book).toBe('Romans');
      expect(allResults[1].reference?.chapter).toBe(8);
      expect(allResults[1].reference?.verseStart).toBe(28);

      const allCandidates = generator.processTranscriptAll(text);
      expect(allCandidates.length).toBe(2);
      expect(allCandidates[0].title).toContain('John 3:16');
      expect(allCandidates[1].title).toContain('Romans 8:28');
    });
  });

  describe('Guard 4: Rolling Window & Cooldown Guards', () => {
    it('"John chapter 3" then "verse 16" produces one final candidate', () => {
      const candidateListener = vi.fn();
      generator.onCandidate(candidateListener);

      // Utterance 1: "John chapter 3"
      generator.processUtterance('Please open your Bibles to John chapter 3');

      // Utterance 2: "verse 16"
      generator.processUtterance('verse 16');

      // The final active suggestion must be John 3:16
      const activeCandidates = generator.getActiveCandidates();
      expect(activeCandidates.length).toBe(1);
      expect(activeCandidates[0].title).toContain('John 3:16');
      expect(activeCandidates[0].actionPayload.data?.verse).toBe(16);
    });

    it('an old reference is not repeated after 10 seconds when subsequent speech adds no book or number', () => {
      const candidateListener = vi.fn();
      generator.onCandidate(candidateListener);

      const t0 = 1000000;
      // Utterance with explicit reference at t0
      generator.processUtterance('John 3:16', t0);
      expect(candidateListener).toHaveBeenCalledTimes(1);
      expect(candidateListener.mock.calls[0][0].title).toContain('John 3:16');

      // Advance clock past 10-second cooldown (e.g. 11 seconds later)
      const t1 = t0 + 11000;

      // Utterance adds no book and no number (conversational preaching phrases)
      generator.processUtterance('Amen church, hallelujah praise the Lord!', t1);

      // Must NOT re-parse rolling window, must NOT repeat John 3:16!
      expect(candidateListener).toHaveBeenCalledTimes(1);

      // Another non-book non-number utterance
      generator.processUtterance('Can I get a witness this morning?', t1 + 2000);
      expect(candidateListener).toHaveBeenCalledTimes(1);
    });
  });
});
