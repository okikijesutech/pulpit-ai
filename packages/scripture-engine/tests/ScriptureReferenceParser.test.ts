import { describe, it, expect } from 'vitest';
import {
  ScriptureReferenceParser,
  parseSpokenNumber,
  normalizeSpokenNumbersInText
} from '../src/index.js';

describe('SpokenNumberConverter', () => {
  it('parses numbers and words accurately', () => {
    expect(parseSpokenNumber('3')).toBe(3);
    expect(parseSpokenNumber('sixteen')).toBe(16);
    expect(parseSpokenNumber('twenty-three')).toBe(23);
    expect(parseSpokenNumber('twenty three')).toBe(23);
    expect(parseSpokenNumber('one hundred and nineteen')).toBe(119);
    expect(parseSpokenNumber('first')).toBe(1);
    expect(parseSpokenNumber('second')).toBe(2);
    expect(parseSpokenNumber('invalid_word')).toBeNull();
  });

  it('normalizes numbers in spoken sentences', () => {
    const text = 'chapter three verse sixteen';
    expect(normalizeSpokenNumbersInText(text)).toBe('chapter 3 verse 16');
  });
});

describe('ScriptureReferenceParser', () => {
  it('parses standard colon notation: "John 3:16"', () => {
    const result = ScriptureReferenceParser.parse('Please open your Bible to John 3:16 for today');
    expect(result.hasReference).toBe(true);
    expect(result.isCanonValid).toBe(true);
    expect(result.reference).toBeDefined();
    expect(result.reference?.book).toBe('John');
    expect(result.reference?.chapter).toBe(3);
    expect(result.reference?.verseStart).toBe(16);
    expect(result.reference?.verseEnd).toBeUndefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('parses verse ranges: "1 Corinthians 13:4-7"', () => {
    const result = ScriptureReferenceParser.parse('Reading from 1 Corinthians 13:4-7 today');
    expect(result.hasReference).toBe(true);
    expect(result.isCanonValid).toBe(true);
    expect(result.reference?.book).toBe('1 Corinthians');
    expect(result.reference?.chapter).toBe(13);
    expect(result.reference?.verseStart).toBe(4);
    expect(result.reference?.verseEnd).toBe(7);
  });

  it('parses spoken words: "John chapter three verse sixteen"', () => {
    const result = ScriptureReferenceParser.parse('Let us turn our Bibles to John chapter three verse sixteen.');
    expect(result.hasReference).toBe(true);
    expect(result.isCanonValid).toBe(true);
    expect(result.reference?.book).toBe('John');
    expect(result.reference?.chapter).toBe(3);
    expect(result.reference?.verseStart).toBe(16);
  });

  it('parses ordinal book names and spoken numbers: "First Corinthians thirteen, verses four to seven"', () => {
    const result = ScriptureReferenceParser.parse('Turn to First Corinthians chapter thirteen verses four to seven');
    expect(result.hasReference).toBe(true);
    expect(result.isCanonValid).toBe(true);
    expect(result.reference?.book).toBe('1 Corinthians');
    expect(result.reference?.chapter).toBe(13);
    expect(result.reference?.verseStart).toBe(4);
    expect(result.reference?.verseEnd).toBe(7);
  });

  it('parses complete Psalm: "Psalm twenty-three"', () => {
    const result = ScriptureReferenceParser.parse('The Lord is my shepherd, as recorded in Psalm twenty-three.');
    expect(result.hasReference).toBe(true);
    expect(result.isCanonValid).toBe(true);
    expect(result.reference?.book).toBe('Psalms');
    expect(result.reference?.chapter).toBe(23);
    expect(result.reference?.verseStart).toBe(1);
    expect(result.reference?.verseEnd).toBe(6); // Psalm 23 has 6 verses
  });

  it('detects invalid verse out of bounds: "John 3:50"', () => {
    const result = ScriptureReferenceParser.parse('Look at John 3:50');
    expect(result.hasReference).toBe(true);
    expect(result.isCanonValid).toBe(false);
    expect(result.isInvalid).toBe(true);
    expect(result.validationError).toContain('Verse 50 is out of bounds');
    expect(result.reference).toBeUndefined();
  });

  it('detects invalid chapter out of bounds: "John chapter 25 verse 1"', () => {
    const result = ScriptureReferenceParser.parse('Turn to John chapter 25 verse 1');
    expect(result.hasReference).toBe(true);
    expect(result.isCanonValid).toBe(false);
    expect(result.isInvalid).toBe(true);
    expect(result.validationError).toContain('Chapter 25 is out of bounds');
  });

  it('flags incomplete references without guessing missing numbers', () => {
    const result = ScriptureReferenceParser.parse('Turn with me to the Gospel of Matthew this morning');
    expect(result.hasReference).toBe(false);
    expect(result.isIncomplete).toBe(true);
    expect(result.validationError).toContain('mentioned without chapter or verse');
  });

  it('strictly rejects sermon themes without explicit Scripture reference', () => {
    const sermonThemes = [
      'God is our refuge and our strength in times of trouble.',
      'Today my message is about walking in unconditional love and divine peace.',
      'Hallelujah, praise the Lord for His goodness and mercies.',
      'The grace of God abounds towards us abundantly.',
      'Let us pray for our families and our nation.'
    ];

    for (const theme of sermonThemes) {
      const result = ScriptureReferenceParser.parse(theme);
      expect(result.hasReference).toBe(false);
      expect(result.reference).toBeUndefined();
    }
  });

  it('handles empty or blank transcripts cleanly', () => {
    expect(ScriptureReferenceParser.parse('').hasReference).toBe(false);
    expect(ScriptureReferenceParser.parse('   ').hasReference).toBe(false);
  });
});
