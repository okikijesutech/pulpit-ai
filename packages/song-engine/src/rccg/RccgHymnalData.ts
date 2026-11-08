/**
 * Curated RCCG / Redemption Hymnal Collection for Pulpit AI.
 *
 * Includes the RCCG Anthem and primary hymns from The Redeemed Hymnal,
 * complete with stanza/chorus breakdowns, alternative titles (e.g. "RCCG Hymn 1"),
 * and verified public domain licensing metadata.
 */

import { Song } from '@pulpit-ai/shared-types';

export const RCCG_HYMNS: Song[] = [
  {
    id: 'rccg_anthem',
    canonicalTitle: 'RCCG Anthem (We Are The Redeemed of God)',
    alternativeTitles: ['RCCG Anthem', 'We Are The Redeemed of God', 'Hymn of the Redeemed'],
    author: 'Pastor E. A. Adeboye / RCCG',
    copyright: 'Redeemed Christian Church of God',
    license: 'Church Worship Use',
    language: 'en',
    licensing: {
      source: 'RCCG Official Publications',
      copyrightOwner: 'Redeemed Christian Church of God',
      licenseType: 'church_ccli',
      attribution: 'RCCG Anthem — For Congregational Worship',
      offlineStoragePermission: true,
      redistributionPermission: true,
      aiProcessingPermission: true,
      verificationStatus: 'verified'
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_rccg_anthem_std',
        songId: 'rccg_anthem',
        versionName: 'Standard',
        key: 'F',
        tempo: 84,
        isDefault: true,
        sections: [
          {
            id: 'sec_rccg_ant_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'We are the Redeemed of God,',
              'Bought with the precious blood of Jesus,',
              'Called out of darkness into His marvelous light,',
              'To show forth His praises everywhere.'
            ]
          },
          {
            id: 'sec_rccg_ant_ch',
            type: 'chorus',
            sequenceOrder: 2,
            label: 'Chorus',
            lines: [
              'We are the Redeemed,',
              'We are the church of the living God,',
              'Walking in dominion, walking in victory,',
              'We are the Redeemed of God.'
            ]
          },
          {
            id: 'sec_rccg_ant_v2',
            type: 'verse',
            sequenceOrder: 3,
            label: 'Verse 2',
            lines: [
              'We will preach the gospel to all nations,',
              'Healing the sick and setting captives free,',
              'By the power of the Holy Spirit,',
              'Until Christ our King shall return.'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'rccg_hymn_001',
    canonicalTitle: 'Praise to the Lord, the Almighty',
    alternativeTitles: ['RCCG Hymn 1', 'Hymn 1', 'Praise to the Lord, the Almighty, the King of creation'],
    author: 'Joachim Neander (1680), Trans. Catherine Winkworth (1863)',
    copyright: 'Public Domain',
    license: 'Public Domain',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_rccg_001_std',
        songId: 'rccg_hymn_001',
        versionName: 'Standard',
        key: 'G',
        tempo: 96,
        isDefault: true,
        sections: [
          {
            id: 'sec_rccg_001_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'Praise to the Lord, the Almighty, the King of creation!',
              'O my soul, praise Him, for He is thy health and salvation!',
              'All ye who hear, now to His temple draw near;',
              'Praise Him in glad adoration.'
            ]
          },
          {
            id: 'sec_rccg_001_v2',
            type: 'verse',
            sequenceOrder: 2,
            label: 'Verse 2',
            lines: [
              'Praise to the Lord, who o’er all things so wondrously reigneth,',
              'Shelters thee under His wings, yea, so gently sustaineth!',
              'Hast thou not seen how thy desires e’er have been',
              'Granted in what He ordaineth?'
            ]
          },
          {
            id: 'sec_rccg_001_v3',
            type: 'verse',
            sequenceOrder: 3,
            label: 'Verse 3',
            lines: [
              'Praise to the Lord, who doth prosper thy work and defend thee;',
              'Surely His goodness and mercy here daily attend thee.',
              'Ponder anew what the Almighty can do,',
              'If with His love He befriend thee.'
            ]
          },
          {
            id: 'sec_rccg_001_v4',
            type: 'verse',
            sequenceOrder: 4,
            label: 'Verse 4',
            lines: [
              'Praise to the Lord, O let all that is in me adore Him!',
              'All that hath life and breath, come now with praises before Him.',
              'Let the Amen sound from His people again,',
              'Gladly for aye we adore Him.'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'rccg_hymn_002',
    canonicalTitle: 'All People That On Earth Do Dwell',
    alternativeTitles: ['RCCG Hymn 2', 'Hymn 2', 'Old 100th'],
    author: 'William Kethe (1561)',
    copyright: 'Public Domain',
    license: 'Public Domain',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_rccg_002_std',
        songId: 'rccg_hymn_002',
        versionName: 'Standard',
        key: 'G',
        tempo: 80,
        isDefault: true,
        sections: [
          {
            id: 'sec_rccg_002_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'All people that on earth do dwell,',
              'Sing to the Lord with cheerful voice;',
              'Him serve with fear, His praise forth tell,',
              'Come ye before Him and rejoice.'
            ]
          },
          {
            id: 'sec_rccg_002_v2',
            type: 'verse',
            sequenceOrder: 2,
            label: 'Verse 2',
            lines: [
              'The Lord, ye know, is God indeed;',
              'Without our aid He did us make;',
              'We are His folk, He doth us feed,',
              'And for His sheep He doth us take.'
            ]
          },
          {
            id: 'sec_rccg_002_v3',
            type: 'verse',
            sequenceOrder: 3,
            label: 'Verse 3',
            lines: [
              'O enter then His gates with praise,',
              'Approach with joy His courts unto;',
              'Praise, laud, and bless His name always,',
              'For it is seemly so to do.'
            ]
          },
          {
            id: 'sec_rccg_002_v4',
            type: 'verse',
            sequenceOrder: 4,
            label: 'Verse 4',
            lines: [
              'For why? The Lord our God is good;',
              'His mercy is for ever sure;',
              'His truth at all times firmly stood,',
              'And shall from age to age endure.'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'rccg_hymn_003',
    canonicalTitle: 'O Worship The King, All Glorious Above',
    alternativeTitles: ['RCCG Hymn 3', 'Hymn 3', 'O Worship the King'],
    author: 'Robert Grant (1833)',
    copyright: 'Public Domain',
    license: 'Public Domain',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_rccg_003_std',
        songId: 'rccg_hymn_003',
        versionName: 'Standard',
        key: 'A',
        tempo: 92,
        isDefault: true,
        sections: [
          {
            id: 'sec_rccg_003_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'O worship the King, all glorious above,',
              'And gratefully sing His wonderful love;',
              'Our Shield and Defender, the Ancient of Days,',
              'Pavilioned in splendour, and girded with praise.'
            ]
          },
          {
            id: 'sec_rccg_003_v2',
            type: 'verse',
            sequenceOrder: 2,
            label: 'Verse 2',
            lines: [
              'O tell of His might, O sing of His grace,',
              'Whose robe is the light, whose canopy space;',
              'His chariots of wrath the deep thunderclouds form,',
              'And dark is His path on the wings of the storm.'
            ]
          },
          {
            id: 'sec_rccg_003_v3',
            type: 'verse',
            sequenceOrder: 3,
            label: 'Verse 3',
            lines: [
              'Thy bountiful care, what tongue can recite?',
              'It breathes in the air, it shines in the light;',
              'It streams from the hills, it descends to the plain,',
              'And sweetly distils in the dew and the rain.'
            ]
          },
          {
            id: 'sec_rccg_003_v4',
            type: 'verse',
            sequenceOrder: 4,
            label: 'Verse 4',
            lines: [
              'Frail children of dust, and feeble as frail,',
              'In Thee do we trust, nor find Thee to fail;',
              'Thy mercies how tender, how firm to the end,',
              'Our Maker, Defender, Redeemer, and Friend!'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'rccg_hymn_005',
    canonicalTitle: 'Great Is Thy Faithfulness',
    alternativeTitles: ['RCCG Hymn 5', 'Hymn 5', 'Great is Thy faithfulness, O God my Father'],
    author: 'Thomas O. Chisholm (1923)',
    copyright: 'Public Domain',
    license: 'Public Domain',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_rccg_005_std',
        songId: 'rccg_hymn_005',
        versionName: 'Standard',
        key: 'D',
        tempo: 78,
        isDefault: true,
        sections: [
          {
            id: 'sec_rccg_005_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'Great is Thy faithfulness, O God my Father,',
              'There is no shadow of turning with Thee;',
              'Thou changest not, Thy compassions, they fail not;',
              'As Thou hast been Thou forever wilt be.'
            ]
          },
          {
            id: 'sec_rccg_005_ch',
            type: 'chorus',
            sequenceOrder: 2,
            label: 'Chorus',
            lines: [
              'Great is Thy faithfulness! Great is Thy faithfulness!',
              'Morning by morning new mercies I see;',
              'All I have needed Thy hand hath provided—',
              'Great is Thy faithfulness, Lord, unto me!'
            ]
          },
          {
            id: 'sec_rccg_005_v2',
            type: 'verse',
            sequenceOrder: 3,
            label: 'Verse 2',
            lines: [
              'Summer and winter, and springtime and harvest,',
              'Sun, moon and stars in their courses above,',
              'Join with all nature in manifold witness',
              'To Thy great faithfulness, mercy and love.'
            ]
          },
          {
            id: 'sec_rccg_005_v3',
            type: 'verse',
            sequenceOrder: 4,
            label: 'Verse 3',
            lines: [
              'Pardon for sin and a peace that endureth,',
              'Thine own dear presence to cheer and to guide;',
              'Strength for today and bright hope for tomorrow,',
              'Blessings all mine, with ten thousand beside!'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'rccg_hymn_006',
    canonicalTitle: 'Immortal, Invisible, God Only Wise',
    alternativeTitles: ['RCCG Hymn 6', 'Hymn 6', 'Immortal Invisible'],
    author: 'Walter Chalmers Smith (1867)',
    copyright: 'Public Domain',
    license: 'Public Domain',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_rccg_006_std',
        songId: 'rccg_hymn_006',
        versionName: 'Standard',
        key: 'Ab',
        tempo: 84,
        isDefault: true,
        sections: [
          {
            id: 'sec_rccg_006_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'Immortal, invisible, God only wise,',
              'In light inaccessible hid from our eyes,',
              'Most blessed, most glorious, the Ancient of Days,',
              'Almighty, victorious, Thy great name we praise.'
            ]
          },
          {
            id: 'sec_rccg_006_v2',
            type: 'verse',
            sequenceOrder: 2,
            label: 'Verse 2',
            lines: [
              'Unresting, unhasting, and silent as light,',
              'Nor wanting, nor wasting, Thou rulest in might;',
              'Thy justice, like mountains, high soaring above',
              'Thy clouds, which are fountains of goodness and love.'
            ]
          },
          {
            id: 'sec_rccg_006_v3',
            type: 'verse',
            sequenceOrder: 3,
            label: 'Verse 3',
            lines: [
              'To all, life Thou givest, to both great and small;',
              'In all life Thou livest, the true life of all;',
              'We blossom and flourish as leaves on the tree,',
              'And wither and perish—but naught changeth Thee.'
            ]
          },
          {
            id: 'sec_rccg_006_v4',
            type: 'verse',
            sequenceOrder: 4,
            label: 'Verse 4',
            lines: [
              'Great Father of glory, pure Father of light,',
              'Thine angels adore Thee, all veiling their sight;',
              'All laud we would render; O help us to see',
              '’Tis only the splendour of light hideth Thee.'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'rccg_hymn_007',
    canonicalTitle: 'To God Be The Glory',
    alternativeTitles: ['RCCG Hymn 7', 'Hymn 7', 'To God be the glory, great things He hath done'],
    author: 'Fanny J. Crosby (1875)',
    copyright: 'Public Domain',
    license: 'Public Domain',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_rccg_007_std',
        songId: 'rccg_hymn_007',
        versionName: 'Standard',
        key: 'Ab',
        tempo: 104,
        isDefault: true,
        sections: [
          {
            id: 'sec_rccg_007_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'To God be the glory, great things He hath done;',
              'So loved He the world that He gave us His Son,',
              'Who yielded His life an atonement for sin,',
              'And opened the life gate that all may go in.'
            ]
          },
          {
            id: 'sec_rccg_007_ch',
            type: 'chorus',
            sequenceOrder: 2,
            label: 'Chorus',
            lines: [
              'Praise the Lord, praise the Lord, let the earth hear His voice!',
              'Praise the Lord, praise the Lord, let the people rejoice!',
              'O come to the Father, through Jesus the Son,',
              'And give Him the glory, great things He hath done.'
            ]
          },
          {
            id: 'sec_rccg_007_v2',
            type: 'verse',
            sequenceOrder: 3,
            label: 'Verse 2',
            lines: [
              'O perfect redemption, the purchase of blood,',
              'To every believer the promise of God;',
              'The vilest offender who truly believes,',
              'That moment from Jesus a pardon receives.'
            ]
          },
          {
            id: 'sec_rccg_007_v3',
            type: 'verse',
            sequenceOrder: 4,
            label: 'Verse 3',
            lines: [
              'Great things He hath taught us, great things He hath done,',
              'And great our rejoicing through Jesus the Son;',
              'But purer, and higher, and greater will be',
              'Our wonder, our transport, when Jesus we see.'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'rccg_hymn_010',
    canonicalTitle: 'Trust and Obey (When We Walk With The Lord)',
    alternativeTitles: ['RCCG Hymn 10', 'Hymn 10', 'Trust and Obey'],
    author: 'John H. Sammis (1887)',
    copyright: 'Public Domain',
    license: 'Public Domain',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_rccg_010_std',
        songId: 'rccg_hymn_010',
        versionName: 'Standard',
        key: 'F',
        tempo: 88,
        isDefault: true,
        sections: [
          {
            id: 'sec_rccg_010_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'When we walk with the Lord in the light of His Word,',
              'What a glory He sheds on our way!',
              'While we do His good will, He abides with us still,',
              'And with all who will trust and obey.'
            ]
          },
          {
            id: 'sec_rccg_010_ch',
            type: 'chorus',
            sequenceOrder: 2,
            label: 'Chorus',
            lines: [
              'Trust and obey, for there’s no other way',
              'To be happy in Jesus, but to trust and obey.'
            ]
          },
          {
            id: 'sec_rccg_010_v2',
            type: 'verse',
            sequenceOrder: 3,
            label: 'Verse 2',
            lines: [
              'Not a shadow can rise, not a cloud in the skies,',
              'But His smile quickly drives it away;',
              'Not a doubt nor a fear, not a sigh nor a tear,',
              'Can abide while we trust and obey.'
            ]
          },
          {
            id: 'sec_rccg_010_v3',
            type: 'verse',
            sequenceOrder: 4,
            label: 'Verse 3',
            lines: [
              'Then in fellowship sweet we will sit at His feet,',
              'Or we’ll walk by His side in the way;',
              'What He says we will do, where He sends we will go;',
              'Never fear, only trust and obey.'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'rccg_hymn_012',
    canonicalTitle: 'What A Friend We Have In Jesus',
    alternativeTitles: ['RCCG Hymn 12', 'Hymn 12', 'What a friend we have in Jesus'],
    author: 'Joseph M. Scriven (1855)',
    copyright: 'Public Domain',
    license: 'Public Domain',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_rccg_012_std',
        songId: 'rccg_hymn_012',
        versionName: 'Standard',
        key: 'F',
        tempo: 88,
        isDefault: true,
        sections: [
          {
            id: 'sec_rccg_012_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'What a friend we have in Jesus,',
              'All our sins and griefs to bear!',
              'What a privilege to carry',
              'Everything to God in prayer!',
              'O what peace we often forfeit,',
              'O what needless pain we bear,',
              'All because we do not carry',
              'Everything to God in prayer!'
            ]
          },
          {
            id: 'sec_rccg_012_v2',
            type: 'verse',
            sequenceOrder: 2,
            label: 'Verse 2',
            lines: [
              'Have we trials and temptations?',
              'Is there trouble anywhere?',
              'We should never be discouraged;',
              'Take it to the Lord in prayer!',
              'Can we find a friend so faithful,',
              'Who will all our sorrows share?',
              'Jesus knows our every weakness;',
              'Take it to the Lord in prayer!'
            ]
          },
          {
            id: 'sec_rccg_012_v3',
            type: 'verse',
            sequenceOrder: 3,
            label: 'Verse 3',
            lines: [
              'Are we weak and heavy laden,',
              'Cumbered with a load of care?',
              'Precious Savior, still our refuge;',
              'Take it to the Lord in prayer!',
              'Do thy friends despise, forsake thee?',
              'Take it to the Lord in prayer!',
              'In His arms He’ll take and shield thee,',
              'Thou wilt find a solace there.'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'rccg_hymn_013',
    canonicalTitle: 'The Solid Rock (My Hope Is Built On Nothing Less)',
    alternativeTitles: ['RCCG Hymn 13', 'Hymn 13', 'The Solid Rock', 'On Christ the solid Rock I stand'],
    author: 'Edward Mote (1834)',
    copyright: 'Public Domain',
    license: 'Public Domain',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_rccg_013_std',
        songId: 'rccg_hymn_013',
        versionName: 'Standard',
        key: 'F',
        tempo: 96,
        isDefault: true,
        sections: [
          {
            id: 'sec_rccg_013_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'My hope is built on nothing less',
              'Than Jesus’ blood and righteousness;',
              'I dare not trust the sweetest frame,',
              'But wholly lean on Jesus’ name.'
            ]
          },
          {
            id: 'sec_rccg_013_ch',
            type: 'chorus',
            sequenceOrder: 2,
            label: 'Chorus',
            lines: [
              'On Christ, the solid Rock, I stand;',
              'All other ground is sinking sand,',
              'All other ground is sinking sand.'
            ]
          },
          {
            id: 'sec_rccg_013_v2',
            type: 'verse',
            sequenceOrder: 3,
            label: 'Verse 2',
            lines: [
              'When darkness veils His lovely face,',
              'I rest on His unchanging grace;',
              'In every high and stormy gale,',
              'My anchor holds within the veil.'
            ]
          },
          {
            id: 'sec_rccg_013_v3',
            type: 'verse',
            sequenceOrder: 4,
            label: 'Verse 3',
            lines: [
              'His oath, His covenant, His blood,',
              'Support me in the whelming flood;',
              'When all around my soul gives way,',
              'He then is all my hope and stay.'
            ]
          },
          {
            id: 'sec_rccg_013_v4',
            type: 'verse',
            sequenceOrder: 5,
            label: 'Verse 4',
            lines: [
              'When He shall come with trumpet sound,',
              'O may I then in Him be found,',
              'Dressed in His righteousness alone,',
              'Faultless to stand before the throne.'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'rccg_hymn_014',
    canonicalTitle: 'Take My Life, And Let It Be',
    alternativeTitles: ['RCCG Hymn 14', 'Hymn 14', 'Take My Life and Let It Be'],
    author: 'Frances Ridley Havergal (1874)',
    copyright: 'Public Domain',
    license: 'Public Domain',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_rccg_014_std',
        songId: 'rccg_hymn_014',
        versionName: 'Standard',
        key: 'F',
        tempo: 88,
        isDefault: true,
        sections: [
          {
            id: 'sec_rccg_014_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'Take my life, and let it be',
              'Consecrated, Lord, to Thee;',
              'Take my moments and my days,',
              'Let them flow in ceaseless praise.'
            ]
          },
          {
            id: 'sec_rccg_014_v2',
            type: 'verse',
            sequenceOrder: 2,
            label: 'Verse 2',
            lines: [
              'Take my hands, and let them move',
              'At the impulse of Thy love;',
              'Take my feet, and let them be',
              'Swift and beautiful for Thee.'
            ]
          },
          {
            id: 'sec_rccg_014_v3',
            type: 'verse',
            sequenceOrder: 3,
            label: 'Verse 3',
            lines: [
              'Take my voice, and let me sing',
              'Always, only, for my King;',
              'Take my lips, and let them be',
              'Filled with messages from Thee.'
            ]
          },
          {
            id: 'sec_rccg_014_v4',
            type: 'verse',
            sequenceOrder: 4,
            label: 'Verse 4',
            lines: [
              'Take my silver and my gold,',
              'Not a mite would I withhold;',
              'Take my intellect, and use',
              'Every power as Thou shalt choose.'
            ]
          },
          {
            id: 'sec_rccg_014_v5',
            type: 'verse',
            sequenceOrder: 5,
            label: 'Verse 5',
            lines: [
              'Take my will, and make it Thine;',
              'It shall be no longer mine;',
              'Take my heart, it is Thine own;',
              'It shall be Thy royal throne.'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'rccg_hymn_015',
    canonicalTitle: 'Rock of Ages, Cleft For Me',
    alternativeTitles: ['RCCG Hymn 15', 'Hymn 15', 'Rock of Ages'],
    author: 'Augustus M. Toplady (1776)',
    copyright: 'Public Domain',
    license: 'Public Domain',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_rccg_015_std',
        songId: 'rccg_hymn_015',
        versionName: 'Standard',
        key: 'Bb',
        tempo: 80,
        isDefault: true,
        sections: [
          {
            id: 'sec_rccg_015_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'Rock of Ages, cleft for me,',
              'Let me hide myself in Thee;',
              'Let the water and the blood,',
              'From Thy riven side which flowed,',
              'Be of sin the double cure,',
              'Save me from its guilt and power.'
            ]
          },
          {
            id: 'sec_rccg_015_v2',
            type: 'verse',
            sequenceOrder: 2,
            label: 'Verse 2',
            lines: [
              'Not the labours of my hands',
              'Can fulfill Thy law’s demands;',
              'Could my zeal no respite know,',
              'Could my tears forever flow,',
              'All for sin could not atone;',
              'Thou must save, and Thou alone.'
            ]
          },
          {
            id: 'sec_rccg_015_v3',
            type: 'verse',
            sequenceOrder: 3,
            label: 'Verse 3',
            lines: [
              'Nothing in my hand I bring,',
              'Simply to the cross I cling;',
              'Naked, come to Thee for dress;',
              'Helpless, look to Thee for grace;',
              'Foul, I to the fountain fly;',
              'Wash me, Saviour, or I die.'
            ]
          },
          {
            id: 'sec_rccg_015_v4',
            type: 'verse',
            sequenceOrder: 4,
            label: 'Verse 4',
            lines: [
              'While I draw this fleeting breath,',
              'When mine eyes shall close in death,',
              'When I soar to worlds unknown,',
              'See Thee on Thy judgment throne,',
              'Rock of Ages, cleft for me,',
              'Let me hide myself in Thee.'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'rccg_hymn_016',
    canonicalTitle: 'Pass Me Not, O Gentle Saviour',
    alternativeTitles: ['RCCG Hymn 16', 'Hymn 16', 'Pass Me Not'],
    author: 'Fanny J. Crosby (1868)',
    copyright: 'Public Domain',
    license: 'Public Domain',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_rccg_016_std',
        songId: 'rccg_hymn_016',
        versionName: 'Standard',
        key: 'Ab',
        tempo: 84,
        isDefault: true,
        sections: [
          {
            id: 'sec_rccg_016_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'Pass me not, O gentle Saviour,',
              'Hear my humble cry;',
              'While on others Thou art calling,',
              'Do not pass me by.'
            ]
          },
          {
            id: 'sec_rccg_016_ch',
            type: 'chorus',
            sequenceOrder: 2,
            label: 'Chorus',
            lines: [
              'Saviour, Saviour, hear my humble cry;',
              'While on others Thou art calling,',
              'Do not pass me by.'
            ]
          },
          {
            id: 'sec_rccg_016_v2',
            type: 'verse',
            sequenceOrder: 3,
            label: 'Verse 2',
            lines: [
              'Let me at a throne of mercy',
              'Find a sweet relief;',
              'Kneeling there in deep contrition,',
              'Help my unbelief.'
            ]
          },
          {
            id: 'sec_rccg_016_v3',
            type: 'verse',
            sequenceOrder: 4,
            label: 'Verse 3',
            lines: [
              'Trusting only in Thy merit,',
              'Would I seek Thy face;',
              'Heal my wounded, broken spirit,',
              'Save me by Thy grace.'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'rccg_hymn_024',
    canonicalTitle: 'It Is Well With My Soul',
    alternativeTitles: ['RCCG Hymn 24', 'Hymn 24', 'When Peace Like a River'],
    author: 'Horatio G. Spafford (1873)',
    copyright: 'Public Domain',
    license: 'Public Domain',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_rccg_024_std',
        songId: 'rccg_hymn_024',
        versionName: 'Standard',
        key: 'C',
        tempo: 96,
        isDefault: true,
        sections: [
          {
            id: 'sec_rccg_024_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'When peace, like a river, attendeth my way,',
              'When sorrows like sea billows roll;',
              'Whatever my lot, Thou hast taught me to say,',
              'It is well, it is well with my soul.'
            ]
          },
          {
            id: 'sec_rccg_024_ch',
            type: 'chorus',
            sequenceOrder: 2,
            label: 'Chorus',
            lines: [
              'It is well with my soul,',
              'It is well, it is well with my soul.'
            ]
          },
          {
            id: 'sec_rccg_024_v2',
            type: 'verse',
            sequenceOrder: 3,
            label: 'Verse 2',
            lines: [
              'Though Satan should buffet, though trials should come,',
              'Let this blest assurance control,',
              'That Christ hath regarded my helpless estate,',
              'And hath shed His own blood for my soul.'
            ]
          },
          {
            id: 'sec_rccg_024_v3',
            type: 'verse',
            sequenceOrder: 4,
            label: 'Verse 3',
            lines: [
              'My sin, oh, the bliss of this glorious thought!',
              'My sin, not in part but the whole,',
              'Is nailed to the cross, and I bear it no more,',
              'Praise the Lord, praise the Lord, O my soul!'
            ]
          },
          {
            id: 'sec_rccg_024_v4',
            type: 'verse',
            sequenceOrder: 5,
            label: 'Verse 4',
            lines: [
              'And Lord, haste the day when the faith shall be sight,',
              'The clouds be rolled back as a scroll;',
              'The trump shall resound, and the Lord shall descend,',
              'Even so, it is well with my soul.'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'rccg_hymn_044',
    canonicalTitle: 'Showers of Blessing',
    alternativeTitles: ['RCCG Hymn 44', 'Hymn 44', 'There Shall Be Showers of Blessing'],
    author: 'Daniel W. Whittle (1883)',
    copyright: 'Public Domain',
    license: 'Public Domain',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_rccg_044_std',
        songId: 'rccg_hymn_044',
        versionName: 'Standard',
        key: 'Bb',
        tempo: 92,
        isDefault: true,
        sections: [
          {
            id: 'sec_rccg_044_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'There shall be showers of blessing:',
              'This is the promise of love;',
              'There shall be seasons refreshing,',
              'Sent from the Saviour above.'
            ]
          },
          {
            id: 'sec_rccg_044_ch',
            type: 'chorus',
            sequenceOrder: 2,
            label: 'Chorus',
            lines: [
              'Showers of blessing,',
              'Showers of blessing we need:',
              'Mercy drops round us are falling,',
              'But for the showers we plead.'
            ]
          },
          {
            id: 'sec_rccg_044_v2',
            type: 'verse',
            sequenceOrder: 3,
            label: 'Verse 2',
            lines: [
              'There shall be showers of blessing,',
              'Precious reviving again;',
              'Over the hills and the valleys,',
              'Sound of abundance of rain.'
            ]
          },
          {
            id: 'sec_rccg_044_v3',
            type: 'verse',
            sequenceOrder: 4,
            label: 'Verse 3',
            lines: [
              'There shall be showers of blessing:',
              'Send them upon us, O Lord;',
              'Grant to us now a refreshing,',
              'Come, and now honour Thy Word.'
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'rccg_hymn_045',
    canonicalTitle: 'Standing On The Promises',
    alternativeTitles: ['RCCG Hymn 45', 'Hymn 45', 'Standing on the promises of Christ my King'],
    author: 'Russell Kelso Carter (1886)',
    copyright: 'Public Domain',
    license: 'Public Domain',
    language: 'en',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    versions: [
      {
        id: 'ver_rccg_045_std',
        songId: 'rccg_hymn_045',
        versionName: 'Standard',
        key: 'Bb',
        tempo: 104,
        isDefault: true,
        sections: [
          {
            id: 'sec_rccg_045_v1',
            type: 'verse',
            sequenceOrder: 1,
            label: 'Verse 1',
            lines: [
              'Standing on the promises of Christ my King,',
              'Through eternal ages let His praises ring;',
              'Glory in the highest, I will shout and sing,',
              'Standing on the promises of God.'
            ]
          },
          {
            id: 'sec_rccg_045_ch',
            type: 'chorus',
            sequenceOrder: 2,
            label: 'Chorus',
            lines: [
              'Standing, standing,',
              'Standing on the promises of God my Saviour;',
              'Standing, standing,',
              'I’m standing on the promises of God.'
            ]
          },
          {
            id: 'sec_rccg_045_v2',
            type: 'verse',
            sequenceOrder: 3,
            label: 'Verse 2',
            lines: [
              'Standing on the promises that cannot fail,',
              'When the howling storms of doubt and fear assail,',
              'By the living Word of God I shall prevail,',
              'Standing on the promises of God.'
            ]
          },
          {
            id: 'sec_rccg_045_v3',
            type: 'verse',
            sequenceOrder: 4,
            label: 'Verse 3',
            lines: [
              'Standing on the promises of Christ the Lord,',
              'Bound to Him eternally by love’s strong cord,',
              'Overcoming daily with the Spirit’s sword,',
              'Standing on the promises of God.'
            ]
          }
        ]
      }
    ]
  }
];
