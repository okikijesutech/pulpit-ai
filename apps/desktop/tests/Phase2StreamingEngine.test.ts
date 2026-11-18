import { describe, it, expect, vi } from 'vitest';
import {
  generateLiturgicalHotwords,
  formatSherpaHotwordsFile,
  detectEarlyCanonBookCue,
  HOTWORD_SCORES,
  StreamingTokenSegmenter,
  SherpaStreamingEngine,
  SherpaRecognizerBackend,
  SileroVadBackend
} from '@pulpit-ai/speech-engine';
import {
  ScriptureReferenceParser,
  fuzzyMatchCanonBook
} from '@pulpit-ai/scripture-engine';

describe('Phase 2 (v1.2.0): Streaming Zipformer, Silero VAD v5, Calibrated Hotwords & Accent Phonology', () => {
  describe('1. Calibrated 3-Tier Aho-Corasick Hotwords', () => {
    it('assigns low tier (+1.2) to homonym books and high tier (+3.0) to distinct polysyllabic books', () => {
      const hotwords = generateLiturgicalHotwords();
      const byPhrase = new Map(hotwords.map((h) => [h.phrase.toLowerCase(), h]));

      // Low-tier homonym-prone short names must never receive high blanket boosts
      expect(byPhrase.get('job')?.score).toBe(HOTWORD_SCORES.LOW_BOOK);
      expect(byPhrase.get('mark')?.score).toBe(HOTWORD_SCORES.LOW_BOOK);
      expect(byPhrase.get('acts')?.score).toBe(HOTWORD_SCORES.LOW_BOOK);
      expect(byPhrase.get('numbers')?.score).toBe(HOTWORD_SCORES.LOW_BOOK);

      // High-tier distinct biblical proper nouns receive strong boosting
      expect(byPhrase.get('deuteronomy')?.score).toBe(HOTWORD_SCORES.HIGH_BOOK);
      expect(byPhrase.get('habakkuk')?.score).toBe(HOTWORD_SCORES.HIGH_BOOK);
      expect(byPhrase.get('philippians')?.score).toBe(HOTWORD_SCORES.HIGH_BOOK);
      expect(byPhrase.get('ecclesiastes')?.score).toBe(HOTWORD_SCORES.HIGH_BOOK);

      // Liturgical cues receive mid-tier boosting
      expect(byPhrase.get('chapter')?.tier).toBe('liturgical_cue');
      expect(byPhrase.get('verse')?.tier).toBe('liturgical_cue');
    });

    it('formats valid sherpa-onnx hotwords.txt syntax (`PHRASE :SCORE`)', () => {
      const text = formatSherpaHotwordsFile();
      expect(text).toContain('Deuteronomy :3.0');
      expect(text).toContain('Job :1.2');
      expect(text).toContain('chapter :1.8');
    });

    it('detects early canonical book cues in partial streaming windows', () => {
      expect(detectEarlyCanonBookCue('please open your bibles to deuteronomy')?.name).toBe('Deuteronomy');
      expect(detectEarlyCanonBookCue('read from first corinthians')?.name).toBe('1 Corinthians');
      expect(detectEarlyCanonBookCue('good morning church welcome')?.name).toBeUndefined();
    });
  });

  describe('2. StreamingTokenSegmenter (BPE/SentencePiece Reassembly & Endpoints)', () => {
    it('reassembles SentencePiece subwords, emits early book cues, and flushes on acoustic endpoint', () => {
      const segmenter = new StreamingTokenSegmenter({ maxWindowWords: 16, endpointSilenceMs: 800 });
      const earlyCues: string[] = [];
      const utterances: string[] = [];

      segmenter.onEarlyBookCue((ev) => earlyCues.push(ev.book.name));
      segmenter.onUtterance((ev) => utterances.push(ev.text));

      segmenter.pushSubwordToken('\u2581turn', false, 1000);
      segmenter.pushSubwordToken('\u2581to', false, 1100);
      segmenter.pushSubwordToken('\u2581deu', false, 1200);
      segmenter.pushSubwordToken('ter', false, 1250);
      segmenter.pushSubwordToken('onomy', false, 1300);

      // Early cue should fire before chapter/verse numbers arrive!
      expect(earlyCues).toEqual(['Deuteronomy']);

      segmenter.pushSubwordToken('\u2581chapter', false, 1400);
      segmenter.pushSubwordToken('\u25816', false, 1500);
      segmenter.pushSubwordToken('\u2581verse', false, 1600);
      segmenter.pushSubwordToken('\u25814', true, 1700); // endpoint = true

      expect(utterances).toEqual(['turn to deuteronomy chapter 6 verse 4']);
    });

    it('bounds sliding FIFO context window to maxWindowWords and flushes on >=800ms trailing silence', () => {
      const segmenter = new StreamingTokenSegmenter({ maxWindowWords: 12, endpointSilenceMs: 800 });
      const longText = Array.from({ length: 20 }, (_, i) => `word${i + 1}`).join(' ');

      segmenter.pushPartial(longText, false, 1000);
      expect(segmenter.getSlidingWindowText().split(' ')).toHaveLength(12);

      // Silence below threshold does not flush
      expect(segmenter.checkSilenceTimeout(1500)).toBeNull();
      // Silence >= 800ms triggers flush
      const flushed = segmenter.checkSilenceTimeout(1850);
      expect(flushed?.reason).toBe('silence_timeout');
      expect(flushed?.text).toContain('word20');
    });
  });

  describe('3. SherpaStreamingEngine & Silero VAD v5 Speech-Over-Organ-Pad Gating', () => {
    it('gates audio via Silero VAD v5 probability, allowing preaching over organ pads while ignoring pure silence', () => {
      let currentVadProb = 0.1; // pure organ pad / silence
      const acceptSpy = vi.fn();
      let mockText = '';
      let mockEndpoint = false;

      const vadBackend: SileroVadBackend = {
        getSpeechProbability: () => currentVadProb
      };

      const recognizerBackend: SherpaRecognizerBackend = {
        acceptWaveform: acceptSpy,
        decode: vi.fn(),
        getText: () => mockText,
        isEndpoint: () => mockEndpoint,
        reset: vi.fn()
      };

      const engine = new SherpaStreamingEngine({
        vadSpeechThreshold: 0.45,
        vadHangoverFrames: 2,
        vadBackend,
        recognizerBackend
      });

      const frame = new Int16Array(480).fill(500);

      // 1. Organ pad / silence alone (VAD prob 0.1) is NOT sent to ASR
      const r1 = engine.processPcmFrame(frame, 1000);
      expect(r1.routedToAsr).toBe(false);
      expect(acceptSpy).not.toHaveBeenCalled();

      // 2. Pastor preaches over organ pad (Silero VAD prob jumps to 0.88) -> routed to Zipformer
      currentVadProb = 0.88;
      mockText = 'open to philippians chapter 4';
      const r2 = engine.processPcmFrame(frame, 1030);
      expect(r2.routedToAsr).toBe(true);
      expect(acceptSpy).toHaveBeenCalledTimes(1);
      expect(r2.partialText).toBe('open to philippians chapter 4');

      // 3. Endpoint triggers discrete utterance emission
      mockText = 'open to philippians chapter 4 verse 13';
      mockEndpoint = true;
      const r3 = engine.processPcmFrame(frame, 1060);
      expect(r3.emittedUtterance?.text).toBe('open to philippians chapter 4 verse 13');
    });
  });

  describe('4. Nigerian/African Phonetic Aliases & Length-Conditioned Levenshtein Fuzzy Matching', () => {
    it('resolves Yoruba /h/-dropping and Hausa /f/~/p/ phonetic substrate aliases accurately', () => {
      const hebrews = ScriptureReferenceParser.parse('Turn with me to Ebrews chapter 11 verse 1');
      expect(hebrews.hasReference).toBe(true);
      expect(hebrews.reference?.book).toBe('Hebrews');
      expect(hebrews.reference?.chapter).toBe(11);
      expect(hebrews.reference?.verseStart).toBe(1);

      const philippians = ScriptureReferenceParser.parse('Read from Pilipians 4:13');
      expect(philippians.hasReference).toBe(true);
      expect(philippians.reference?.book).toBe('Philippians');
      expect(philippians.reference?.chapter).toBe(4);
      expect(philippians.reference?.verseStart).toBe(13);

      const haggai = ScriptureReferenceParser.parse('Open to Aggai chapter 2 verse 9');
      expect(haggai.hasReference).toBe(true);
      expect(haggai.reference?.book).toBe('Haggai');
      expect(haggai.reference?.chapter).toBe(2);
      expect(haggai.reference?.verseStart).toBe(9);
    });

    it('rescues garbled polysyllabic ASR book names via fuzzy matching while rejecting short-word false positives', () => {
      // Long book (>= 5 chars) with 1-2 ASR edits succeeds
      expect(fuzzyMatchCanonBook('Deuteronmy', true)?.name).toBe('Deuteronomy');
      const parsed = ScriptureReferenceParser.parse('Turn to Deuteronmy chapter 6 verse 4');
      expect(parsed.hasReference).toBe(true);
      expect(parsed.reference?.book).toBe('Deuteronomy');
      expect(parsed.reference?.chapter).toBe(6);
      expect(parsed.reference?.verseStart).toBe(4);

      // Everyday short English words must NEVER fuzzy-match Job, Mark, Acts, Amos
      expect(fuzzyMatchCanonBook('joy', true)).toBeNull();
      expect(fuzzyMatchCanonBook('bob', true)).toBeNull();
      expect(fuzzyMatchCanonBook('cats', true)).toBeNull();
      expect(fuzzyMatchCanonBook('almost', true)).toBeNull();

      const falsePos = ScriptureReferenceParser.parse('There is joy 10 times over and cats 2 times');
      expect(falsePos.hasReference).toBe(false);
    });
  });
});
