import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ScriptureDatabase, WEB_PACKAGE, KJV_PACKAGE } from '../src/index.js';

describe('ScriptureDatabase', () => {
  let db: ScriptureDatabase;

  beforeEach(() => {
    db = new ScriptureDatabase(':memory:');
    db.loadPackage(WEB_PACKAGE);
    db.loadPackage(KJV_PACKAGE);
  });

  afterEach(() => {
    db.close();
  });

  it('registers and lists translation packages with full legal metadata', () => {
    const translations = db.listTranslations();
    expect(translations.length).toBe(2);

    const web = db.getTranslation('WEB');
    expect(web).toBeDefined();
    expect(web?.name).toBe('World English Bible');
    expect(web?.copyright).toBe('Public Domain');
    expect(web?.attribution).toContain('Dedicated to the Public Domain');
    expect(web?.redistributionStatus).toBe('unrestricted');

    const kjv = db.getTranslation('kjv');
    expect(kjv).toBeDefined();
    expect(kjv?.abbreviation).toBe('KJV');
  });

  it('retrieves exact verified verse text for John 3:16 in WEB and KJV', () => {
    const webResult = db.getPassage('WEB', 'John', 3, 16);
    expect(webResult).not.toBeNull();
    expect(webResult?.found).toBe(true);
    expect(webResult?.verses.length).toBe(1);
    expect(webResult?.fullText).toContain('For God so loved the world');
    expect(webResult?.fullText).toContain('one and only Son');
    expect(webResult?.attribution).toContain('World English Bible');

    const kjvResult = db.getPassage('KJV', 'John', 3, 16);
    expect(kjvResult).not.toBeNull();
    expect(kjvResult?.fullText).toContain('only begotten Son');
    expect(kjvResult?.attribution).toContain('King James Version');
  });

  it('retrieves multi-verse passages accurately (1 Corinthians 13:4-7)', () => {
    const result = db.getPassage('WEB', '1 Corinthians', 13, 4, 7);
    expect(result).not.toBeNull();
    expect(result?.verses.length).toBe(4);
    expect(result?.verses[0].verse).toBe(4);
    expect(result?.verses[3].verse).toBe(7);
    expect(result?.formattedText).toContain('[4] Love is patient and is kind');
    expect(result?.formattedText).toContain('[7] bears all things');
  });

  it('retrieves complete Psalm 23 (1-6)', () => {
    const result = db.getPassage('WEB', 'Psalms', 23, 1, 6);
    expect(result).not.toBeNull();
    expect(result?.verses.length).toBe(6);
    expect(result?.verses[0].text).toContain('Yahweh is my shepherd');
    expect(result?.verses[5].text).toContain('dwell in Yahweh’s house forever');
  });

  it('strictly returns null when requested passage is missing or not in database', () => {
    // Ezekiel 1:1 is not loaded in this seed package
    const result = db.getPassage('WEB', 'Ezekiel', 1, 1);
    expect(result).toBeNull();
  });

  it('strictly rejects out-of-bounds chapter or verse requests', () => {
    // John has only 21 chapters
    expect(db.getPassage('WEB', 'John', 25, 1)).toBeNull();

    // John 3 has only 36 verses
    expect(db.getPassage('WEB', 'John', 3, 50)).toBeNull();
  });
});
