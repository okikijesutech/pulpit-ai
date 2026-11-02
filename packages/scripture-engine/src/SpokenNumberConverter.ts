/**
 * Spoken number converter for church speech recognition.
 * Translates cardinal and ordinal spoken words, hyphenated numbers,
 * and compounds (e.g. "twenty-three", "one hundred and nineteen") into integers.
 */

const ONES: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19
};

const ORDINALS: Record<string, number> = {
  first: 1,
  '1st': 1,
  second: 2,
  '2nd': 2,
  third: 3,
  '3rd': 3,
  fourth: 4,
  '4th': 4,
  fifth: 5,
  '5th': 5,
  sixth: 6,
  '6th': 6,
  seventh: 7,
  '7th': 7,
  eighth: 8,
  '8th': 8,
  ninth: 9,
  '9th': 9,
  tenth: 10,
  '10th': 10,
  eleventh: 11,
  twelfth: 12,
  thirteenth: 13,
  fourteenth: 14,
  fifteenth: 15,
  sixteenth: 16,
  seventeenth: 17,
  eighteenth: 18,
  nineteenth: 19,
  twentieth: 20,
  thirtieth: 30,
  fortieth: 40,
  fiftieth: 50,
  sixtieth: 60,
  seventieth: 70,
  eightieth: 80,
  ninetieth: 90,
  hundredth: 100
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90
};

/**
 * Parses a single number phrase (e.g. "23", "twenty-three", "twenty three", "one hundred and nineteen") into an integer.
 * Returns null if not a recognized number.
 */
export function parseSpokenNumber(input: string): number | null {
  if (!input) return null;
  const cleaned = input.trim().toLowerCase();

  // 1. Direct integer check
  if (/^\d+$/.test(cleaned)) {
    const val = parseInt(cleaned, 10);
    return isNaN(val) ? null : val;
  }

  // 2. Direct ordinal check
  if (ORDINALS[cleaned] !== undefined) {
    return ORDINALS[cleaned];
  }

  // 3. Direct ones check
  if (ONES[cleaned] !== undefined) {
    return ONES[cleaned];
  }

  // 4. Direct tens check
  if (TENS[cleaned] !== undefined) {
    return TENS[cleaned];
  }

  // 5. Compound words split by hyphen or space (e.g. "twenty-three", "twenty three")
  const tokens = cleaned.replace(/-/g, ' ').split(/\s+/).filter(t => t.length > 0 && t !== 'and');

  if (tokens.length === 0) return null;

  let total = 0;
  let currentGroup = 0;
  let validWordFound = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (/^\d+$/.test(token)) {
      currentGroup += parseInt(token, 10);
      validWordFound = true;
    } else if (ONES[token] !== undefined) {
      currentGroup += ONES[token];
      validWordFound = true;
    } else if (ORDINALS[token] !== undefined) {
      currentGroup += ORDINALS[token];
      validWordFound = true;
    } else if (TENS[token] !== undefined) {
      currentGroup += TENS[token];
      validWordFound = true;
    } else if (token === 'hundred') {
      currentGroup = (currentGroup === 0 ? 1 : currentGroup) * 100;
      validWordFound = true;
    } else {
      // Non-number token inside sequence
      return null;
    }
  }

  total += currentGroup;
  return validWordFound ? total : null;
}

/**
 * Normalizes spoken numbers in a text string into numeric digits.
 * E.g., "chapter three verse sixteen" -> "chapter 3 verse 16"
 * "first corinthians chapter thirteen verses four to seven" -> "first corinthians chapter 13 verses 4 to 7"
 */
export function normalizeSpokenNumbersInText(text: string): string {
  // Replace hyphenated numbers first: e.g. "twenty-three" -> "23"
  let normalized = text.replace(
    /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)-(one|two|three|four|five|six|seven|eight|nine)\b/gi,
    (match) => {
      const num = parseSpokenNumber(match);
      return num !== null ? String(num) : match;
    }
  );

  // Replace two-word tens + ones: e.g. "twenty three" -> "23"
  normalized = normalized.replace(
    /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(one|two|three|four|five|six|seven|eight|nine)\b/gi,
    (match) => {
      const num = parseSpokenNumber(match);
      return num !== null ? String(num) : match;
    }
  );

  // Replace hundreds compound: e.g. "one hundred and nineteen" or "one hundred nineteen"
  normalized = normalized.replace(
    /\b(one|two|three|four|five|six|seven|eight|nine)\s+hundred(?:\s+and)?\s+(\d+|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|one|two|three|four|five|six|seven|eight|nine)\b/gi,
    (match) => {
      const num = parseSpokenNumber(match);
      return num !== null ? String(num) : match;
    }
  );

  // Replace standalone words
  const wordsToReplace = [
    ...Object.keys(ONES),
    ...Object.keys(TENS)
  ];

  // Sort by length descending to match longer words first
  wordsToReplace.sort((a, b) => b.length - a.length);

  for (const word of wordsToReplace) {
    const val = ONES[word] !== undefined ? ONES[word] : TENS[word];
    // Don't replace "first", "second" here as they often prefix book names ("first corinthians")
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(regex, String(val));
  }

  return normalized;
}
