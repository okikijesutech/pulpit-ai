/**
 * Canonical metadata for the 66 books of the Protestant Bible canon.
 * Contains book names, standard abbreviations, spoken aliases, chapter counts,
 * and exact verse counts per chapter for bounds validation.
 */

export interface CanonBook {
  id: string; // 3-letter standard abbreviation (e.g., 'GEN', 'JHN', '1CO')
  name: string; // Standard display name (e.g., 'Genesis', 'John', '1 Corinthians')
  testament: 'OT' | 'NT';
  aliases: string[]; // Spoken variants, abbreviations, and numerical alternatives
  totalChapters: number;
  versesPerChapter: number[]; // Index 0 = chapter 1 verse count
}

export const CANON_BOOKS: CanonBook[] = [
  // --- OLD TESTAMENT (39 Books) ---
  {
    id: 'GEN',
    name: 'Genesis',
    testament: 'OT',
    aliases: ['genesis', 'gen'],
    totalChapters: 50,
    versesPerChapter: [
      31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18,
      34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23,
      57, 38, 34, 34, 28, 34, 31, 22, 33, 26
    ]
  },
  {
    id: 'EXO',
    name: 'Exodus',
    testament: 'OT',
    aliases: ['exodus', 'exod', 'exo'],
    totalChapters: 40,
    versesPerChapter: [
      22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 26,
      36, 31, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38
    ]
  },
  {
    id: 'LEV',
    name: 'Leviticus',
    testament: 'OT',
    aliases: ['leviticus', 'lev'],
    totalChapters: 27,
    versesPerChapter: [
      17, 16, 17, 35, 19, 30, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 37, 27,
      24, 33, 44, 23, 55, 46, 34
    ]
  },
  {
    id: 'NUM',
    name: 'Numbers',
    testament: 'OT',
    aliases: ['numbers', 'num'],
    totalChapters: 36,
    versesPerChapter: [
      54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 50, 13, 32, 22, 29,
      35, 41, 30, 25, 18, 65, 23, 31, 40, 16, 54, 42, 56, 29, 34, 13
    ]
  },
  {
    id: 'DEU',
    name: 'Deuteronomy',
    testament: 'OT',
    aliases: ['deuteronomy', 'deut', 'deu'],
    totalChapters: 34,
    versesPerChapter: [
      46, 37, 29, 49, 33, 25, 26, 20, 29, 22, 32, 32, 18, 29, 23, 22, 20, 22, 21, 20,
      23, 30, 25, 22, 19, 19, 26, 68, 29, 20, 30, 52, 29, 12
    ]
  },
  {
    id: 'JOS',
    name: 'Joshua',
    testament: 'OT',
    aliases: ['joshua', 'josh', 'jos'],
    totalChapters: 24,
    versesPerChapter: [
      18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9,
      45, 34, 16, 33
    ]
  },
  {
    id: 'JDG',
    name: 'Judges',
    testament: 'OT',
    aliases: ['judges', 'judg', 'jdg'],
    totalChapters: 21,
    versesPerChapter: [
      36, 23, 31, 24, 31, 40, 25, 35, 57, 18, 40, 15, 25, 20, 20, 31, 13, 31, 30, 48, 25
    ]
  },
  {
    id: 'RUT',
    name: 'Ruth',
    testament: 'OT',
    aliases: ['ruth', 'rth', 'rut'],
    totalChapters: 4,
    versesPerChapter: [22, 23, 18, 22]
  },
  {
    id: '1SA',
    name: '1 Samuel',
    testament: 'OT',
    aliases: ['first samuel', '1 samuel', '1st samuel', 'one samuel', '1 sam', '1sa'],
    totalChapters: 31,
    versesPerChapter: [
      28, 36, 21, 22, 12, 21, 17, 22, 27, 27, 15, 25, 23, 52, 35, 23, 58, 30, 24, 42,
      15, 23, 29, 22, 44, 25, 12, 25, 11, 31, 13
    ]
  },
  {
    id: '2SA',
    name: '2 Samuel',
    testament: 'OT',
    aliases: ['second samuel', '2 samuel', '2nd samuel', 'two samuel', '2 sam', '2sa'],
    totalChapters: 24,
    versesPerChapter: [
      27, 32, 39, 12, 25, 23, 29, 18, 13, 19, 27, 31, 39, 33, 37, 23, 29, 33, 43, 26,
      22, 51, 39, 25
    ]
  },
  {
    id: '1KI',
    name: '1 Kings',
    testament: 'OT',
    aliases: ['first kings', '1 kings', '1st kings', 'one kings', '1 kgs', '1ki'],
    totalChapters: 22,
    versesPerChapter: [
      53, 46, 28, 34, 18, 38, 51, 66, 28, 29, 43, 33, 34, 31, 34, 34, 24, 46, 21, 43, 29, 53
    ]
  },
  {
    id: '2KI',
    name: '2 Kings',
    testament: 'OT',
    aliases: ['second kings', '2 kings', '2nd kings', 'two kings', '2 kgs', '2ki'],
    totalChapters: 25,
    versesPerChapter: [
      18, 25, 27, 44, 27, 33, 20, 29, 37, 36, 21, 21, 25, 29, 38, 20, 41, 37, 37, 21,
      26, 20, 37, 20, 30
    ]
  },
  {
    id: '1CH',
    name: '1 Chronicles',
    testament: 'OT',
    aliases: ['first chronicles', '1 chronicles', '1st chronicles', 'one chronicles', '1 chron', '1ch'],
    totalChapters: 29,
    versesPerChapter: [
      54, 55, 24, 43, 26, 81, 40, 40, 44, 14, 47, 40, 14, 17, 29, 43, 27, 17, 19, 8,
      30, 19, 32, 31, 31, 32, 34, 21, 30
    ]
  },
  {
    id: '2CH',
    name: '2 Chronicles',
    testament: 'OT',
    aliases: ['second chronicles', '2 chronicles', '2nd chronicles', 'two chronicles', '2 chron', '2ch'],
    totalChapters: 36,
    versesPerChapter: [
      17, 18, 17, 22, 14, 42, 22, 18, 31, 19, 23, 16, 22, 15, 19, 14, 19, 34, 11, 37,
      20, 12, 21, 27, 28, 23, 9, 27, 36, 27, 21, 33, 25, 33, 27, 23
    ]
  },
  {
    id: 'EZR',
    name: 'Ezra',
    testament: 'OT',
    aliases: ['ezra', 'ezr'],
    totalChapters: 10,
    versesPerChapter: [11, 70, 13, 24, 17, 22, 28, 36, 15, 44]
  },
  {
    id: 'NEH',
    name: 'Nehemiah',
    testament: 'OT',
    aliases: ['nehemiah', 'neh'],
    totalChapters: 13,
    versesPerChapter: [11, 20, 32, 23, 19, 19, 73, 18, 38, 39, 36, 47, 31]
  },
  {
    id: 'EST',
    name: 'Esther',
    testament: 'OT',
    aliases: ['esther', 'est'],
    totalChapters: 10,
    versesPerChapter: [22, 23, 15, 17, 14, 14, 10, 17, 32, 3]
  },
  {
    id: 'JOB',
    name: 'Job',
    testament: 'OT',
    aliases: ['job', 'jb'],
    totalChapters: 42,
    versesPerChapter: [
      22, 13, 26, 21, 27, 30, 21, 22, 35, 22, 20, 25, 28, 22, 35, 22, 16, 21, 29, 29,
      34, 30, 17, 25, 6, 14, 23, 28, 25, 31, 40, 22, 33, 37, 16, 33, 24, 41, 30, 24, 34, 17
    ]
  },
  {
    id: 'PSA',
    name: 'Psalms',
    testament: 'OT',
    aliases: ['psalms', 'psalm', 'psa', 'ps', 'pss'],
    totalChapters: 150,
    versesPerChapter: [
      6, 12, 8, 8, 12, 10, 17, 9, 20, 18, 7, 8, 6, 7, 5, 11, 15, 50, 14, 9, 13, 31, 6, 10,
      22, 12, 14, 9, 11, 12, 24, 11, 22, 22, 28, 12, 40, 22, 13, 17, 13, 11, 5, 26, 17, 11,
      9, 14, 20, 23, 19, 9, 6, 7, 23, 13, 11, 11, 17, 12, 8, 12, 11, 10, 13, 20, 7, 35, 36,
      5, 24, 20, 28, 23, 10, 12, 20, 72, 13, 19, 16, 8, 18, 12, 13, 17, 7, 18, 52, 17, 16,
      15, 5, 23, 11, 13, 12, 9, 9, 5, 8, 28, 22, 35, 45, 48, 43, 13, 31, 7, 10, 10, 9, 8,
      18, 19, 2, 29, 176, 7, 8, 9, 4, 8, 5, 6, 5, 6, 8, 8, 3, 18, 3, 3, 21, 26, 9, 8, 24,
      13, 10, 7, 12, 15, 21, 10, 20, 14, 9, 6
    ]
  },
  {
    id: 'PRO',
    name: 'Proverbs',
    testament: 'OT',
    aliases: ['proverbs', 'proverb', 'prov', 'pro'],
    totalChapters: 31,
    versesPerChapter: [
      33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29, 30,
      31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31
    ]
  },
  {
    id: 'ECC',
    name: 'Ecclesiastes',
    testament: 'OT',
    aliases: ['ecclesiastes', 'eccl', 'ecc', 'the preacher'],
    totalChapters: 12,
    versesPerChapter: [18, 26, 22, 16, 20, 12, 29, 17, 18, 20, 10, 14]
  },
  {
    id: 'SNG',
    name: 'Song of Solomon',
    testament: 'OT',
    aliases: ['song of solomon', 'song of songs', 'canticles', 'sos', 'sng'],
    totalChapters: 8,
    versesPerChapter: [17, 17, 11, 16, 16, 13, 13, 14]
  },
  {
    id: 'ISA',
    name: 'Isaiah',
    testament: 'OT',
    aliases: ['isaiah', 'isa'],
    totalChapters: 66,
    versesPerChapter: [
      31, 22, 26, 6, 30, 13, 25, 22, 21, 34, 16, 6, 22, 32, 9, 14, 14, 7, 25, 6,
      17, 25, 18, 23, 12, 21, 13, 29, 24, 33, 9, 20, 24, 17, 10, 22, 38, 22, 8, 31,
      29, 25, 28, 28, 25, 13, 15, 22, 26, 11, 23, 15, 12, 17, 13, 12, 21, 14, 21, 22,
      11, 12, 19, 12, 25, 24
    ]
  },
  {
    id: 'JER',
    name: 'Jeremiah',
    testament: 'OT',
    aliases: ['jeremiah', 'jer'],
    totalChapters: 52,
    versesPerChapter: [
      19, 37, 25, 31, 31, 30, 34, 22, 26, 25, 23, 17, 27, 22, 21, 21, 27, 23, 15, 18,
      14, 30, 40, 10, 38, 24, 22, 17, 32, 24, 40, 44, 26, 22, 19, 32, 21, 28, 18, 16,
      18, 22, 13, 30, 5, 28, 7, 47, 39, 46, 64, 34
    ]
  },
  {
    id: 'LAM',
    name: 'Lamentations',
    testament: 'OT',
    aliases: ['lamentations', 'lam'],
    totalChapters: 5,
    versesPerChapter: [22, 22, 66, 22, 22]
  },
  {
    id: 'EZK',
    name: 'Ezekiel',
    testament: 'OT',
    aliases: ['ezekiel', 'ezk', 'eze'],
    totalChapters: 48,
    versesPerChapter: [
      28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14, 49,
      32, 31, 49, 27, 17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28, 23, 29, 49,
      26, 20, 27, 31, 25, 24, 23, 35
    ]
  },
  {
    id: 'DAN',
    name: 'Daniel',
    testament: 'OT',
    aliases: ['daniel', 'dan'],
    totalChapters: 12,
    versesPerChapter: [21, 49, 30, 37, 31, 28, 28, 27, 27, 21, 45, 13]
  },
  {
    id: 'HOS',
    name: 'Hosea',
    testament: 'OT',
    aliases: ['hosea', 'hos'],
    totalChapters: 14,
    versesPerChapter: [11, 23, 5, 19, 15, 11, 16, 14, 17, 15, 12, 14, 16, 9]
  },
  {
    id: 'JOL',
    name: 'Joel',
    testament: 'OT',
    aliases: ['joel', 'jol', 'joe'],
    totalChapters: 3,
    versesPerChapter: [20, 32, 21]
  },
  {
    id: 'AMO',
    name: 'Amos',
    testament: 'OT',
    aliases: ['amos', 'amo'],
    totalChapters: 9,
    versesPerChapter: [15, 16, 15, 13, 27, 14, 17, 14, 15]
  },
  {
    id: 'OBA',
    name: 'Obadiah',
    testament: 'OT',
    aliases: ['obadiah', 'oba', 'obd'],
    totalChapters: 1,
    versesPerChapter: [21]
  },
  {
    id: 'JON',
    name: 'Jonah',
    testament: 'OT',
    aliases: ['jonah', 'jon'],
    totalChapters: 4,
    versesPerChapter: [17, 10, 10, 11]
  },
  {
    id: 'MIC',
    name: 'Micah',
    testament: 'OT',
    aliases: ['micah', 'mic'],
    totalChapters: 7,
    versesPerChapter: [16, 13, 12, 13, 15, 16, 20]
  },
  {
    id: 'NAM',
    name: 'Nahum',
    testament: 'OT',
    aliases: ['nahum', 'nah', 'nam'],
    totalChapters: 3,
    versesPerChapter: [15, 13, 19]
  },
  {
    id: 'HAB',
    name: 'Habakkuk',
    testament: 'OT',
    aliases: ['habakkuk', 'hab'],
    totalChapters: 3,
    versesPerChapter: [17, 20, 19]
  },
  {
    id: 'ZEP',
    name: 'Zephaniah',
    testament: 'OT',
    aliases: ['zephaniah', 'zeph', 'zep'],
    totalChapters: 3,
    versesPerChapter: [18, 15, 20]
  },
  {
    id: 'HAG',
    name: 'Haggai',
    testament: 'OT',
    aliases: ['haggai', 'hag'],
    totalChapters: 2,
    versesPerChapter: [15, 23]
  },
  {
    id: 'ZEC',
    name: 'Zechariah',
    testament: 'OT',
    aliases: ['zechariah', 'zech', 'zec'],
    totalChapters: 14,
    versesPerChapter: [21, 13, 10, 14, 11, 15, 14, 23, 17, 12, 17, 14, 9, 21]
  },
  {
    id: 'MAL',
    name: 'Malachi',
    testament: 'OT',
    aliases: ['malachi', 'mal'],
    totalChapters: 4,
    versesPerChapter: [14, 17, 18, 6]
  },

  // --- NEW TESTAMENT (27 Books) ---
  {
    id: 'MAT',
    name: 'Matthew',
    testament: 'NT',
    aliases: ['matthew', 'matt', 'mat'],
    totalChapters: 28,
    versesPerChapter: [
      25, 23, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 27, 35, 30, 34,
      46, 46, 39, 51, 46, 75, 66, 20
    ]
  },
  {
    id: 'MRK',
    name: 'Mark',
    testament: 'NT',
    aliases: ['mark', 'mrk', 'mk'],
    totalChapters: 16,
    versesPerChapter: [45, 28, 35, 41, 43, 56, 37, 38, 50, 52, 33, 44, 37, 72, 47, 20]
  },
  {
    id: 'LUK',
    name: 'Luke',
    testament: 'NT',
    aliases: ['luke', 'luk', 'lk'],
    totalChapters: 24,
    versesPerChapter: [
      80, 52, 38, 44, 39, 49, 50, 56, 62, 42, 54, 59, 35, 35, 32, 31, 37, 43, 48, 47,
      38, 71, 56, 53
    ]
  },
  {
    id: 'JHN',
    name: 'John',
    testament: 'NT',
    aliases: ['john', 'jhn', 'jn'],
    totalChapters: 21,
    versesPerChapter: [
      51, 25, 36, 54, 47, 71, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40, 42, 31, 25
    ]
  },
  {
    id: 'ACT',
    name: 'Acts',
    testament: 'NT',
    aliases: ['acts', 'acts of the apostles', 'act'],
    totalChapters: 28,
    versesPerChapter: [
      26, 47, 26, 37, 42, 15, 60, 40, 43, 48, 30, 25, 52, 28, 41, 40, 34, 28, 41, 38,
      40, 30, 35, 27, 27, 32, 44, 31
    ]
  },
  {
    id: 'ROM',
    name: 'Romans',
    testament: 'NT',
    aliases: ['romans', 'rom'],
    totalChapters: 16,
    versesPerChapter: [32, 29, 31, 25, 21, 23, 25, 39, 33, 21, 36, 21, 14, 23, 33, 27]
  },
  {
    id: '1CO',
    name: '1 Corinthians',
    testament: 'NT',
    aliases: [
      'first corinthians', '1 corinthians', '1st corinthians', 'one corinthians',
      '1 cor', '1co', '1cor'
    ],
    totalChapters: 16,
    versesPerChapter: [31, 16, 23, 21, 13, 20, 40, 13, 27, 33, 34, 31, 13, 40, 58, 24]
  },
  {
    id: '2CO',
    name: '2 Corinthians',
    testament: 'NT',
    aliases: [
      'second corinthians', '2 corinthians', '2nd corinthians', 'two corinthians',
      '2 cor', '2co', '2cor'
    ],
    totalChapters: 13,
    versesPerChapter: [24, 17, 18, 18, 21, 18, 16, 24, 15, 18, 33, 21, 14]
  },
  {
    id: 'GAL',
    name: 'Galatians',
    testament: 'NT',
    aliases: ['galatians', 'gal'],
    totalChapters: 6,
    versesPerChapter: [24, 21, 29, 31, 26, 18]
  },
  {
    id: 'EPH',
    name: 'Ephesians',
    testament: 'NT',
    aliases: ['ephesians', 'eph'],
    totalChapters: 6,
    versesPerChapter: [23, 22, 21, 32, 33, 24]
  },
  {
    id: 'PHP',
    name: 'Philippians',
    testament: 'NT',
    aliases: ['philippians', 'phil', 'php'],
    totalChapters: 4,
    versesPerChapter: [30, 30, 21, 23]
  },
  {
    id: 'COL',
    name: 'Colossians',
    testament: 'NT',
    aliases: ['colossians', 'col'],
    totalChapters: 4,
    versesPerChapter: [29, 23, 25, 18]
  },
  {
    id: '1TH',
    name: '1 Thessalonians',
    testament: 'NT',
    aliases: [
      'first thessalonians', '1 thessalonians', '1st thessalonians', 'one thessalonians',
      '1 thess', '1th'
    ],
    totalChapters: 5,
    versesPerChapter: [10, 20, 13, 18, 28]
  },
  {
    id: '2TH',
    name: '2 Thessalonians',
    testament: 'NT',
    aliases: [
      'second thessalonians', '2 thessalonians', '2nd thessalonians', 'two thessalonians',
      '2 thess', '2th'
    ],
    totalChapters: 3,
    versesPerChapter: [12, 17, 18]
  },
  {
    id: '1TI',
    name: '1 Timothy',
    testament: 'NT',
    aliases: ['first timothy', '1 timothy', '1st timothy', 'one timothy', '1 tim', '1ti'],
    totalChapters: 6,
    versesPerChapter: [20, 15, 16, 16, 25, 21]
  },
  {
    id: '2TI',
    name: '2 Timothy',
    testament: 'NT',
    aliases: ['second timothy', '2 timothy', '2nd timothy', 'two timothy', '2 tim', '2ti'],
    totalChapters: 4,
    versesPerChapter: [18, 26, 17, 22]
  },
  {
    id: 'TIT',
    name: 'Titus',
    testament: 'NT',
    aliases: ['titus', 'tit'],
    totalChapters: 3,
    versesPerChapter: [16, 15, 15]
  },
  {
    id: 'PHM',
    name: 'Philemon',
    testament: 'NT',
    aliases: ['philemon', 'phm'],
    totalChapters: 1,
    versesPerChapter: [25]
  },
  {
    id: 'HEB',
    name: 'Hebrews',
    testament: 'NT',
    aliases: ['hebrews', 'heb'],
    totalChapters: 13,
    versesPerChapter: [14, 18, 19, 16, 14, 20, 28, 13, 28, 39, 40, 29, 25]
  },
  {
    id: 'JAS',
    name: 'James',
    testament: 'NT',
    aliases: ['james', 'jas', 'jm'],
    totalChapters: 5,
    versesPerChapter: [27, 26, 18, 17, 20]
  },
  {
    id: '1PE',
    name: '1 Peter',
    testament: 'NT',
    aliases: ['first peter', '1 peter', '1st peter', 'one peter', '1 pet', '1pe'],
    totalChapters: 5,
    versesPerChapter: [25, 25, 22, 19, 14]
  },
  {
    id: '2PE',
    name: '2 Peter',
    testament: 'NT',
    aliases: ['second peter', '2 peter', '2nd peter', 'two peter', '2 pet', '2pe'],
    totalChapters: 3,
    versesPerChapter: [21, 22, 18]
  },
  {
    id: '1JN',
    name: '1 John',
    testament: 'NT',
    aliases: ['first john', '1 john', '1st john', 'one john', '1 jhn', '1jn'],
    totalChapters: 5,
    versesPerChapter: [10, 29, 24, 21, 21]
  },
  {
    id: '2JN',
    name: '2 John',
    testament: 'NT',
    aliases: ['second john', '2 john', '2nd john', 'two john', '2 jhn', '2jn'],
    totalChapters: 1,
    versesPerChapter: [13]
  },
  {
    id: '3JN',
    name: '3 John',
    testament: 'NT',
    aliases: ['third john', '3 john', '3rd john', 'three john', '3 jhn', '3jn'],
    totalChapters: 1,
    versesPerChapter: [14]
  },
  {
    id: 'JUD',
    name: 'Jude',
    testament: 'NT',
    aliases: ['jude', 'jud'],
    totalChapters: 1,
    versesPerChapter: [25]
  },
  {
    id: 'REV',
    name: 'Revelation',
    testament: 'NT',
    aliases: ['revelation', 'revelations', 'the revelation of john', 'rev'],
    totalChapters: 22,
    versesPerChapter: [
      20, 29, 22, 11, 14, 17, 17, 13, 21, 11, 19, 17, 18, 20, 8, 21, 18, 24, 21, 15, 27, 21
    ]
  }
];

/** Lookup map: lowercase normalized alias -> CanonBook */
const aliasMap = new Map<string, CanonBook>();
for (const book of CANON_BOOKS) {
  aliasMap.set(book.name.toLowerCase(), book);
  for (const alias of book.aliases) {
    aliasMap.set(alias.toLowerCase(), book);
  }
}

/**
 * Finds a canonical book by name or spoken alias.
 */
export function findCanonBook(aliasOrName: string): CanonBook | undefined {
  const normalized = aliasOrName.trim().toLowerCase();
  return aliasMap.get(normalized);
}
