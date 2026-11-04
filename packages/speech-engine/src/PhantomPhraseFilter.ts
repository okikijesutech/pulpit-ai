/**
 * Phantom Phrase Filter (PR 7).
 * Filters out common Whisper model hallucinations on ambient noise, music, or low-level silence.
 */

const PHANTOM_EXACT_PATTERNS = new Set([
  'thank you.',
  'thank you',
  'thank you very much.',
  'thank you very much',
  'thanks for watching!',
  'thanks for watching',
  'please subscribe.',
  'please subscribe',
  'subscribe to our channel.',
  'subscribe to our channel',
  'you',
  'the end.',
  'the end'
]);

const PHANTOM_BRACKETED_REGEX = /^[\[(](music|applause|laughter|blank_audio|cheering|screaming|groaning|sighs)[\])]\.?$/i;
const PHANTOM_SUBTITLE_REGEX = /^(subtitles|subtitling|transcribed|translated|captioned|sous-titres)\s+(by|created by|realises par|realises)/i;

export class PhantomPhraseFilter {
  /**
   * Returns true if the recognized text matches known hallucination / phantom phrase patterns.
   */
  public static isPhantomPhrase(rawText: string): boolean {
    if (!rawText) return true;
    const trimmed = rawText.trim();
    if (trimmed.length === 0) return true;

    // Check bracketed annotations like [MUSIC] or (applause)
    if (PHANTOM_BRACKETED_REGEX.test(trimmed)) {
      return true;
    }

    // Check lowercase exact phrase matches
    const lower = trimmed.toLowerCase();
    if (PHANTOM_EXACT_PATTERNS.has(lower)) {
      return true;
    }

    // Check subtitle/credits hallucinations
    if (PHANTOM_SUBTITLE_REGEX.test(trimmed)) {
      return true;
    }

    // Check repeated single words like "you you you" or "thank you thank you"
    const words = lower.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.every((w) => w === words[0])) {
      return true;
    }

    return false;
  }
}
