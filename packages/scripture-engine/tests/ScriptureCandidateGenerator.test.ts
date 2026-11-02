import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ScriptureDatabase,
  WEB_PACKAGE,
  KJV_PACKAGE,
  ScriptureCandidateGenerator
} from '../src/index.js';

describe('ScriptureCandidateGenerator', () => {
  let db: ScriptureDatabase;
  let generator: ScriptureCandidateGenerator;

  beforeEach(() => {
    db = new ScriptureDatabase(':memory:');
    db.loadPackage(WEB_PACKAGE);
    db.loadPackage(KJV_PACKAGE);
    generator = new ScriptureCandidateGenerator(db, {
      activeTranslation: 'WEB',
      cooldownMs: 5000
    });
  });

  afterEach(() => {
    db.close();
  });

  it('generates a verified SuggestionCandidate for explicit spoken reference (John 3:16)', () => {
    const candidateListener = vi.fn();
    generator.onCandidate(candidateListener);

    const cand = generator.processTranscript('Let us read together from John 3:16 this morning.');

    expect(cand).not.toBeNull();
    expect(candidateListener).toHaveBeenCalledTimes(1);
    expect(cand?.type).toBe('scripture');
    expect(cand?.title).toBe('John 3:16 (WEB)');
    expect(cand?.contentPreview).toContain('[16] For God so loved the world');
    expect(cand?.contentPreview).toContain('one and only Son');
    expect(cand?.confidence).toBeGreaterThanOrEqual(0.9);
    expect(cand?.status).toBe('pending');
    expect(cand?.actionPayload.action).toBe('start_scripture');
    expect(cand?.actionPayload.data?.attribution).toContain('World English Bible');
  });

  it('generates candidate using selected active translation (KJV)', () => {
    generator.setActiveTranslation('KJV');
    const cand = generator.processTranscript('Turn to Psalm 23:1 in the King James');

    expect(cand).not.toBeNull();
    expect(cand?.title).toBe('Psalms 23:1 (KJV)');
    expect(cand?.contentPreview).toContain('[1] The LORD is my shepherd; I shall not want.');
    expect(cand?.actionPayload.data?.attribution).toContain('King James Version');
  });

  it('suppresses duplicate suggestions within the cooldown window', () => {
    const cand1 = generator.processTranscript('Open to 1 Corinthians 13:4-7 please.');
    expect(cand1).not.toBeNull();

    // Immediate second mention of same reference
    const cand2 = generator.processTranscript('Again, as we see in 1 Corinthians 13:4-7...');
    expect(cand2).toBeNull();
  });

  it('strictly ignores sermon themes and general preaching without explicit references', () => {
    const candidateListener = vi.fn();
    generator.onCandidate(candidateListener);

    const cand = generator.processTranscript(
      'Brothers and sisters, the power of God is moving in our lives today with great joy and glory.'
    );

    expect(cand).toBeNull();
    expect(candidateListener).not.toHaveBeenCalled();
  });

  it('emits error event and suppresses candidate for out-of-bounds references', () => {
    const errorListener = vi.fn();
    generator.onError(errorListener);

    const cand = generator.processTranscript('Please look at John 3:50.');

    expect(cand).toBeNull();
    expect(errorListener).toHaveBeenCalledTimes(1);
    expect(errorListener.mock.calls[0][0].reason).toContain('Verse 50 is out of bounds');
  });

  it('emits error event when passage is missing from local verified database', () => {
    const errorListener = vi.fn();
    generator.onError(errorListener);

    // Isaiah 53:5 is canonical, but not in our mini seed dataset
    const cand = generator.processTranscript('Turn to Isaiah 53:5');

    expect(cand).toBeNull();
    expect(errorListener).toHaveBeenCalledTimes(1);
    expect(errorListener.mock.calls[0][0].reason).toContain('not found in verified WEB translation');
  });
});
