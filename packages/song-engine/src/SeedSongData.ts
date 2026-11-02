/**
 * Verified public-domain hymns bundled for default church library.
 * All hymns are verified pre-1928 public domain with accurate author attribution.
 */

import { Song } from '@pulpit-ai/shared-types';

export const SEED_SONGS: Song[] = [
  {
    id: 'hymn_amazing_grace',
    canonicalTitle: 'Amazing Grace',
    alternativeTitles: ['Amazing Grace! How Sweet the Sound', 'New Britain'],
    author: 'John Newton (1779)',
    copyright: 'Public Domain',
    license: 'Public Domain',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_amazing_grace_std',
        songId: 'hymn_amazing_grace',
        versionName: 'Standard (Traditional)',
        key: 'G',
        tempo: 72,
        isDefault: true,
        sections: [
          {
            id: 'sec_ag_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'Amazing grace! How sweet the sound',
              'That saved a wretch like me!',
              'I once was lost, but now am found;',
              'Was blind, but now I see.'
            ]
          },
          {
            id: 'sec_ag_v2',
            type: 'verse',
            sequenceOrder: 2,
            label: 'Verse 2',
            lines: [
              "'Twas grace that taught my heart to fear,",
              'And grace my fears relieved;',
              'How precious did that grace appear',
              'The hour I first believed.'
            ]
          },
          {
            id: 'sec_ag_v3',
            type: 'verse',
            sequenceOrder: 3,
            label: 'Verse 3',
            lines: [
              'Through many dangers, toils, and snares',
              'I have already come;',
              "'Tis grace hath brought me safe thus far,",
              'And grace will lead me home.'
            ]
          },
          {
            id: 'sec_ag_v4',
            type: 'verse',
            sequenceOrder: 4,
            label: 'Verse 4',
            lines: [
              'When we’ve been there ten thousand years,',
              'Bright shining as the sun,',
              'We’ve no less days to sing God’s praise',
              'Than when we’d first begun.'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'hymn_blessed_assurance',
    canonicalTitle: 'Blessed Assurance',
    alternativeTitles: ['Blessed Assurance, Jesus Is Mine'],
    author: 'Fanny J. Crosby (1873)',
    copyright: 'Public Domain',
    license: 'Public Domain',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_blessed_assurance_std',
        songId: 'hymn_blessed_assurance',
        versionName: 'Standard',
        key: 'D',
        tempo: 88,
        isDefault: true,
        sections: [
          {
            id: 'sec_ba_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'Blessed assurance, Jesus is mine!',
              'Oh, what a foretaste of glory divine!',
              'Heir of salvation, purchase of God,',
              'Born of His Spirit, washed in His blood.'
            ]
          },
          {
            id: 'sec_ba_ch',
            type: 'chorus',
            sequenceOrder: 2,
            label: 'Chorus',
            lines: [
              'This is my story, this is my song,',
              'Praising my Savior all the day long;',
              'This is my story, this is my song,',
              'Praising my Savior all the day long.'
            ]
          },
          {
            id: 'sec_ba_v2',
            type: 'verse',
            sequenceOrder: 3,
            label: 'Verse 2',
            lines: [
              'Perfect submission, perfect delight,',
              'Visions of rapture now burst on my sight;',
              'Angels descending bring from above',
              'Echoes of mercy, whispers of love.'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'hymn_holy_holy_holy',
    canonicalTitle: 'Holy, Holy, Holy! Lord God Almighty',
    alternativeTitles: ['Holy, Holy, Holy', 'Nicaea'],
    author: 'Reginald Heber (1826)',
    copyright: 'Public Domain',
    license: 'Public Domain',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_holy_holy_holy_std',
        songId: 'hymn_holy_holy_holy',
        versionName: 'Standard',
        key: 'E-flat',
        tempo: 84,
        isDefault: true,
        sections: [
          {
            id: 'sec_hhh_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'Holy, holy, holy! Lord God Almighty!',
              'Early in the morning our song shall rise to Thee;',
              'Holy, holy, holy! Merciful and mighty!',
              'God in three Persons, blessed Trinity!'
            ]
          },
          {
            id: 'sec_hhh_v2',
            type: 'verse',
            sequenceOrder: 2,
            label: 'Verse 2',
            lines: [
              'Holy, holy, holy! All the saints adore Thee,',
              'Casting down their golden crowns around the glassy sea;',
              'Cherubim and seraphim falling down before Thee,',
              'Which wert, and art, and evermore shalt be.'
            ]
          }
        ]
      }
    ]
  }
];
