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
  'the end',
  'unintelligible',
  'whispering',
  'inaudible',
  'mumbling',
  'crowd cheering',
  'speaking in foreign language'
]);

const PHANTOM_ANNOTATION_REGEX =
  /^["'*(\[]*(music|applause|laughter|blank_audio|blank|cheering|screaming|screams|groaning|groan|sighs|sigh|unintelligible|whispering|whisper|cough|coughing|gasp|crying|silence|mumbling|inaudible|crowd cheering|speaking in foreign language)["'*)\]]*\.?$/i;
const PHANTOM_SUBTITLE_REGEX = /^(subtitles|subtitling|transcribed|translated|captioned|sous-titres)\s+(by|created by|realises par|realises)/i;

export class PhantomPhraseFilter {
  /**
   * Returns true if the recognized text matches known hallucination / phantom phrase patterns.
   */
  public static isPhantomPhrase(rawText: string): boolean {
    if (!rawText) return true;
    const trimmed = rawText.trim();
    if (trimmed.length === 0) return true;

    // Check bracketed or asterisk annotations like [MUSIC], *screams*, *sigh*, *whispering*, *unintelligible*
    const clean = trimmed.replace(/^["'\s]+|["'\s]+$/g, '');
    if (PHANTOM_ANNOTATION_REGEX.test(trimmed) || PHANTOM_ANNOTATION_REGEX.test(clean)) {
      return true;
    }

    // Universal Whisper non-speech acoustic event tag rejection:
    // Whisper outputs non-speech events enclosed in brackets [...], asterisks *...*, or parentheses (...)
    // Examples: [INAUDIBLE], [speaking in foreign language], *crowd cheering*, *mumbling*, *snicker*, (screaming)
    if (
      (/^\*.*\*$/.test(clean) || /^\[.*\]$/.test(clean) || /^\(.*\)$/.test(clean)) &&
      !clean.includes(':') // Preserve potential scripture verse tags like [John 3:16]
    ) {
      return true;
    }

    // Check lowercase exact phrase matches
    const lower = clean.toLowerCase();
    if (PHANTOM_EXACT_PATTERNS.has(lower)) {
      return true;
    }

    // Check subtitle/credits hallucinations
    if (PHANTOM_SUBTITLE_REGEX.test(trimmed)) {
      return true;
    }

    // Check autoregressive repetition loops
    if (PhantomPhraseFilter.isRepetitionLoop(trimmed)) {
      return true;
    }

    // Check repeated single words like "you you you" or "thank you thank you"
    const words = lower.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.every((w) => w === words[0])) {
      return true;
    }

    return false;
  }

  /**
   * Detects autoregressive repetition loops produced when Whisper decoder hallucinates on low energy/noise.
   * Examples:
   *  - "You need to be a man, you need to be a man, you need to be a man..."
   *  - "I'm a woman, a woman, a woman, a woman, a woman..."
   */
  public static isRepetitionLoop(rawText: string): boolean {
    if (!rawText) return false;
    const lower = rawText.trim().toLowerCase();
    const words = lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    if (words.length < 4) return false;

    // 1. Single word repeated 4+ times consecutively (e.g. "you you you you")
    let maxSingleRepeats = 1;
    let currentSingleRepeats = 1;
    for (let i = 1; i < words.length; i++) {
      if (words[i] === words[i - 1]) {
        currentSingleRepeats++;
        if (currentSingleRepeats > maxSingleRepeats) maxSingleRepeats = currentSingleRepeats;
      } else {
        currentSingleRepeats = 1;
      }
    }
    if (maxSingleRepeats >= 4) {
      return true;
    }

    // 2. Phrase repeated 3+ times (phrase length 2 to 8 words)
    // e.g. "a woman, a woman, a woman" (length 2)
    // "you need to be a man, you need to be a man, you need to be a man" (length 6)
    for (let phraseLen = 2; phraseLen <= Math.min(8, Math.floor(words.length / 3)); phraseLen++) {
      for (let start = 0; start <= words.length - phraseLen * 3; start++) {
        let repeats = 1;
        let pos = start + phraseLen;
        while (pos + phraseLen <= words.length) {
          let match = true;
          for (let k = 0; k < phraseLen; k++) {
            if (words[start + k] !== words[pos + k]) {
              match = false;
              break;
            }
          }
          if (match) {
            repeats++;
            pos += phraseLen;
          } else {
            break;
          }
        }
        if (repeats >= 3) {
          return true;
        }
      }
    }

    // 3. Compression / vocabulary ratio check for long outputs (>= 12 words)
    // Autoregressive repetition loops on long texts have very few unique tokens
    if (words.length >= 12) {
      const unique = new Set(words);
      if (unique.size / words.length < 0.35) {
        return true;
      }
    }

    return false;
  }
}
