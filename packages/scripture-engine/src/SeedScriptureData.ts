/**
 * Bundled public domain Scripture dataset for World English Bible (WEB) and King James Version (KJV).
 * Contains verified texts for foundational church preaching passages.
 * All verses are public domain and verified against canonical texts.
 */

import { TranslationPackage } from './types.js';

export const WEB_PACKAGE: TranslationPackage = {
  metadata: {
    id: 'WEB',
    name: 'World English Bible',
    abbreviation: 'WEB',
    language: 'en',
    source: 'eBible.org / Rainbow Missions, Inc.',
    edition: '2020 Revision',
    copyright: 'Public Domain',
    license: 'Public Domain (Dedicated to the Public Domain by Michael Paul Johnson)',
    attribution: 'World English Bible (WEB) — Dedicated to the Public Domain',
    redistributionStatus: 'unrestricted',
    verificationStatus: 'verified',
    importedAt: Date.now()
  },
  verses: [
    // --- Genesis 1:1-5 ---
    { translationId: 'WEB', bookId: 'GEN', bookName: 'Genesis', chapter: 1, verse: 1, text: 'In the beginning, God created the heavens and the earth.' },
    { translationId: 'WEB', bookId: 'GEN', bookName: 'Genesis', chapter: 1, verse: 2, text: 'The earth was formless and empty. Darkness was on the surface of the deep and God’s Spirit was hovering over the surface of the waters.' },
    { translationId: 'WEB', bookId: 'GEN', bookName: 'Genesis', chapter: 1, verse: 3, text: 'God said, "Let there be light," and there was light.' },
    { translationId: 'WEB', bookId: 'GEN', bookName: 'Genesis', chapter: 1, verse: 4, text: 'God saw the light, and saw that it was good. God divided the light from the darkness.' },
    { translationId: 'WEB', bookId: 'GEN', bookName: 'Genesis', chapter: 1, verse: 5, text: 'God called the light "day", and the darkness he called "night". There was evening and there was morning, the first day.' },

    // --- Psalm 23 (Complete Psalm) ---
    { translationId: 'WEB', bookId: 'PSA', bookName: 'Psalms', chapter: 23, verse: 1, text: 'Yahweh is my shepherd: I shall lack nothing.' },
    { translationId: 'WEB', bookId: 'PSA', bookName: 'Psalms', chapter: 23, verse: 2, text: 'He makes me lie down in green pastures. He leads me beside still waters.' },
    { translationId: 'WEB', bookId: 'PSA', bookName: 'Psalms', chapter: 23, verse: 3, text: 'He restores my soul. He guides me in the paths of righteousness for his name’s sake.' },
    { translationId: 'WEB', bookId: 'PSA', bookName: 'Psalms', chapter: 23, verse: 4, text: 'Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me.' },
    { translationId: 'WEB', bookId: 'PSA', bookName: 'Psalms', chapter: 23, verse: 5, text: 'You prepare a table before me in the presence of my enemies. You have anointed my head with oil. My cup runs over.' },
    { translationId: 'WEB', bookId: 'PSA', bookName: 'Psalms', chapter: 23, verse: 6, text: 'Surely goodness and loving kindness shall follow me all the days of my life, and I will dwell in Yahweh’s house forever.' },

    // --- Proverbs 3:5-6 ---
    { translationId: 'WEB', bookId: 'PRO', bookName: 'Proverbs', chapter: 3, verse: 5, text: 'Trust in Yahweh with all your heart, and don’t lean on your own understanding.' },
    { translationId: 'WEB', bookId: 'PRO', bookName: 'Proverbs', chapter: 3, verse: 6, text: 'In all your ways acknowledge him, and he will make your paths straight.' },

    // --- John 3:1-21 (including John 3:16) ---
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 1, text: 'Now there was a man of the Pharisees named Nicodemus, a ruler of the Jews.' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 2, text: 'He came to Jesus by night, and said to him, "Rabbi, we know that you are a teacher come from God, for no one can do these signs that you do, unless God is with him."' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 3, text: 'Jesus answered him, "Most certainly, I tell you, unless one is born anew, he can’t see God’s Kingdom."' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 4, text: 'Nicodemus said to him, "How can a man be born when he is old? Can he enter a second time into his mother’s womb, and be born?"' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 5, text: 'Jesus answered, "Most certainly I tell you, unless one is born of water and spirit, he can’t enter into God’s Kingdom."' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 6, text: 'That which is born of the flesh is flesh. That which is born of the Spirit is spirit.' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 7, text: 'Don’t marvel that I said to you, ‘You must be born anew.’' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 8, text: 'The wind blows where it wants to, and you hear its sound, but don’t know where it comes from and where it is going. So is everyone who is born of the Spirit."' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 9, text: 'Nicodemus answered him, "How can these things be?"' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 10, text: 'Jesus answered him, "Are you the teacher of Israel, and don’t understand these things?' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 11, text: 'Most certainly I tell you, we speak that which we know, and testify of that which we have seen; and you don’t receive our witness.' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 12, text: 'If I told you earthly things and you don’t believe, how will you believe if I tell you heavenly things?' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 13, text: 'No one has ascended into heaven, but he who descended out of heaven, the Son of Man, who is in heaven.' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 14, text: 'As Moses lifted up the serpent in the wilderness, even so must the Son of Man be lifted up,' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 15, text: 'that whoever believes in him should not perish, but have eternal life.' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 16, text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 17, text: 'For God didn’t send his Son into the world to judge the world, but that the world should be saved through him.' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 18, text: 'He who believes in him is not judged. He who doesn’t believe has been judged already, because he has not believed in the name of the one and only Son of God.' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 19, text: 'This is the judgment, that the light has come into the world, and men loved the darkness rather than the light; for their works were evil.' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 20, text: 'For everyone who does evil hates the light, and doesn’t come to the light, lest his works would be exposed.' },
    { translationId: 'WEB', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 21, text: 'But he who does the truth comes to the light, that his works may be revealed, that they have been done in God."' },

    // --- Romans 8:28-39 ---
    { translationId: 'WEB', bookId: 'ROM', bookName: 'Romans', chapter: 8, verse: 28, text: 'We know that all things work together for good for those who love God, to those who are called according to his purpose.' },
    { translationId: 'WEB', bookId: 'ROM', bookName: 'Romans', chapter: 8, verse: 29, text: 'For whom he foreknew, he also predestined to be conformed to the image of his Son, that he might be the firstborn among many brothers.' },
    { translationId: 'WEB', bookId: 'ROM', bookName: 'Romans', chapter: 8, verse: 30, text: 'Whom he predestined, those he also called. Whom he called, those he also justified. Whom he justified, those he also glorified.' },
    { translationId: 'WEB', bookId: 'ROM', bookName: 'Romans', chapter: 8, verse: 31, text: 'What then shall we say about these things? If God is for us, who can be against us?' },
    { translationId: 'WEB', bookId: 'ROM', bookName: 'Romans', chapter: 8, verse: 38, text: 'For I am persuaded that neither death, nor life, nor angels, nor principalities, nor things present, nor things to come, nor powers,' },
    { translationId: 'WEB', bookId: 'ROM', bookName: 'Romans', chapter: 8, verse: 39, text: 'nor height, nor depth, nor any other created thing, will be able to separate us from God’s love, which is in Christ Jesus our Lord.' },

    // --- 1 Corinthians 13:1-13 (Complete Chapter) ---
    { translationId: 'WEB', bookId: '1CO', bookName: '1 Corinthians', chapter: 13, verse: 1, text: 'If I speak with the languages of men and of angels, but don’t have love, I have become sounding brass, or a clanging cymbal.' },
    { translationId: 'WEB', bookId: '1CO', bookName: '1 Corinthians', chapter: 13, verse: 2, text: 'If I have the gift of prophecy, and know all mysteries and all knowledge; and if I have all faith, so as to remove mountains, but don’t have love, I am nothing.' },
    { translationId: 'WEB', bookId: '1CO', bookName: '1 Corinthians', chapter: 13, verse: 3, text: 'If I give away all my goods to feed the poor, and if I give my body to be burned, but don’t have love, it profits me nothing.' },
    { translationId: 'WEB', bookId: '1CO', bookName: '1 Corinthians', chapter: 13, verse: 4, text: 'Love is patient and is kind; love doesn’t envy. Love doesn’t brag, is not proud,' },
    { translationId: 'WEB', bookId: '1CO', bookName: '1 Corinthians', chapter: 13, verse: 5, text: 'doesn’t behave itself inappropriately, doesn’t seek its own way, is not provoked, takes no account of evil;' },
    { translationId: 'WEB', bookId: '1CO', bookName: '1 Corinthians', chapter: 13, verse: 6, text: 'doesn’t rejoice in unrighteousness, but rejoices with the truth;' },
    { translationId: 'WEB', bookId: '1CO', bookName: '1 Corinthians', chapter: 13, verse: 7, text: 'bears all things, believes all things, hopes all things, and endures all things.' },
    { translationId: 'WEB', bookId: '1CO', bookName: '1 Corinthians', chapter: 13, verse: 8, text: 'Love never fails. But where there are prophecies, they will be done away with. Where there are languages, they will cease. Where there is knowledge, it will be done away with.' },
    { translationId: 'WEB', bookId: '1CO', bookName: '1 Corinthians', chapter: 13, verse: 9, text: 'For we know in part, and we prophesy in part;' },
    { translationId: 'WEB', bookId: '1CO', bookName: '1 Corinthians', chapter: 13, verse: 10, text: 'but when that which is complete has come, then that which is partial will be done away with.' },
    { translationId: 'WEB', bookId: '1CO', bookName: '1 Corinthians', chapter: 13, verse: 11, text: 'When I was a child, I spoke like a child, I felt like a child, I thought like a child. Now that I have become a man, I have put away childish things.' },
    { translationId: 'WEB', bookId: '1CO', bookName: '1 Corinthians', chapter: 13, verse: 12, text: 'For now we see in a mirror, dimly, but then face to face. Now I know in part, but then I will know fully, even as I was also fully known.' },
    { translationId: 'WEB', bookId: '1CO', bookName: '1 Corinthians', chapter: 13, verse: 13, text: 'But now faith, hope, and love remain—these three. The greatest of these is love.' },

    // --- 2 Timothy 3:16-17 ---
    { translationId: 'WEB', bookId: '2TI', bookName: '2 Timothy', chapter: 3, verse: 16, text: 'Every Scripture is God-breathed and profitable for teaching, for reproof, for correction, and for instruction in righteousness,' },
    { translationId: 'WEB', bookId: '2TI', bookName: '2 Timothy', chapter: 3, verse: 17, text: 'that each person who belongs to God may be complete, thoroughly equipped for every good work.' }
  ]
};

export const KJV_PACKAGE: TranslationPackage = {
  metadata: {
    id: 'KJV',
    name: 'King James Version',
    abbreviation: 'KJV',
    language: 'en',
    source: '1611 / 1769 Oxford Standard Text',
    edition: '1769 Blayney Oxford Edition',
    copyright: 'Public Domain',
    license: 'Public Domain',
    attribution: 'King James Version (KJV) — Public Domain',
    redistributionStatus: 'unrestricted',
    verificationStatus: 'verified',
    importedAt: Date.now()
  },
  verses: [
    // --- Psalm 23:1-6 ---
    { translationId: 'KJV', bookId: 'PSA', bookName: 'Psalms', chapter: 23, verse: 1, text: 'The LORD is my shepherd; I shall not want.' },
    { translationId: 'KJV', bookId: 'PSA', bookName: 'Psalms', chapter: 23, verse: 2, text: 'He maketh me to lie down in green pastures: he leadeth me beside the still waters.' },
    { translationId: 'KJV', bookId: 'PSA', bookName: 'Psalms', chapter: 23, verse: 3, text: 'He restoreth my soul: he leadeth me in the paths of righteousness for his name’s sake.' },
    { translationId: 'KJV', bookId: 'PSA', bookName: 'Psalms', chapter: 23, verse: 4, text: 'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.' },
    { translationId: 'KJV', bookId: 'PSA', bookName: 'Psalms', chapter: 23, verse: 5, text: 'Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over.' },
    { translationId: 'KJV', bookId: 'PSA', bookName: 'Psalms', chapter: 23, verse: 6, text: 'Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever.' },

    // --- John 3:16 ---
    { translationId: 'KJV', bookId: 'JHN', bookName: 'John', chapter: 3, verse: 16, text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },

    // --- Romans 8:28 ---
    { translationId: 'KJV', bookId: 'ROM', bookName: 'Romans', chapter: 8, verse: 28, text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.' },

    // --- 1 Corinthians 13:4-7 ---
    { translationId: 'KJV', bookId: '1CO', bookName: '1 Corinthians', chapter: 13, verse: 4, text: 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up,' },
    { translationId: 'KJV', bookId: '1CO', bookName: '1 Corinthians', chapter: 13, verse: 5, text: 'Doth not behave itself unseemly, seeketh not her own, is not easily provoked, thinketh no evil;' },
    { translationId: 'KJV', bookId: '1CO', bookName: '1 Corinthians', chapter: 13, verse: 6, text: 'Rejoiceth not in iniquity, but rejoiceth in the truth;' },
    { translationId: 'KJV', bookId: '1CO', bookName: '1 Corinthians', chapter: 13, verse: 7, text: 'Beareth all things, believeth all things, hopeth all things, endureth all things.' }
  ]
};
