import { describe, it, expect, beforeEach } from 'vitest';
import { LicensingManager } from '../src/LicensingManager.js';
import { LicensingPolicyEngine } from '../src/LicensingPolicyEngine.js';
import { ContentLicenseMetadata } from '@pulpit-ai/shared-types';

describe('LicensingPolicyEngine', () => {
  it('validates a complete license metadata object with all 8 fields', () => {
    const validMetadata: ContentLicenseMetadata = {
      source: 'eBible.org',
      copyrightOwner: 'Public Domain',
      licenseType: 'public_domain',
      attribution: 'World English Bible (WEB) — Public Domain',
      offlineStoragePermission: true,
      redistributionPermission: true,
      aiProcessingPermission: true,
      verificationStatus: 'verified'
    };

    const result = LicensingPolicyEngine.validateLicense(validMetadata);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails validation when mandatory legal fields are missing', () => {
    const invalid: Partial<ContentLicenseMetadata> = {
      source: '',
      // missing copyrightOwner
      licenseType: 'custom_restricted',
      attribution: '',
      offlineStoragePermission: true
    };

    const result = LicensingPolicyEngine.validateLicense(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
    expect(result.errors.some((e) => e.includes('Source'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Copyright owner'))).toBe(true);
    expect(result.errors.some((e) => e.includes('Attribution'))).toBe(true);
  });

  it('rejects AI recognition access for unverified content', () => {
    const unverifiedLicense = LicensingPolicyEngine.createQuarantinedLicense('C:/imports/hymn.docx');
    const result = LicensingPolicyEngine.evaluateRecognitionAccess(unverifiedLicense);

    expect(result.permitted).toBe(false);
    expect(result.reason).toContain('unverified');
  });

  it('rejects redistribution for church-owned internal songs', () => {
    const churchLicense = LicensingPolicyEngine.createChurchOwnedLicense('Grace Chapel');
    const result = LicensingPolicyEngine.evaluateRedistribution(churchLicense);

    expect(result.permitted).toBe(false);
    expect(result.reason).toContain('does not grant redistribution');
  });

  it('allows recognition and redistribution for verified public domain items', () => {
    const pdLicense = LicensingPolicyEngine.createPublicDomainLicense('1779 Hymnal', 'Newton - Public Domain');
    const recResult = LicensingPolicyEngine.evaluateRecognitionAccess(pdLicense);
    const redResult = LicensingPolicyEngine.evaluateRedistribution(pdLicense);

    expect(recResult.permitted).toBe(true);
    expect(recResult.attribution).toBe('Newton - Public Domain');
    expect(redResult.permitted).toBe(true);
  });
});

describe('LicensingManager', () => {
  let manager: LicensingManager;

  beforeEach(() => {
    manager = new LicensingManager();
  });

  it('registers and evaluates content items accurately', () => {
    const kjvLicense = LicensingPolicyEngine.createPublicDomainLicense(
      '1611 Oxford Text',
      'King James Version (KJV) — Public Domain'
    );

    const reg = manager.registerContent('bible_kjv', 'bible_translation', 'King James Version', kjvLicense);
    expect(reg.success).toBe(true);

    const check = manager.isApprovedForRecognition('bible_kjv');
    expect(check.permitted).toBe(true);
    expect(check.attribution).toBe('King James Version (KJV) — Public Domain');
  });

  it('prevents unrecognized items from being accessed', () => {
    const check = manager.isApprovedForRecognition('unknown_id');
    expect(check.permitted).toBe(false);
    expect(check.reason).toContain('not registered');
  });

  it('supports human operator verification workflow', () => {
    const quarantined = LicensingPolicyEngine.createQuarantinedLicense('songs/new_worship.txt');
    manager.registerContent('song_quarantined', 'song', 'New Song', quarantined);

    // Initial check: must be rejected
    expect(manager.isApprovedForRecognition('song_quarantined').permitted).toBe(false);

    // Human operator verifies
    const updated = manager.updateVerification(
      'song_quarantined',
      'verified',
      true,
      'Pastor John',
      'Verified with CCLI license #12345'
    );
    expect(updated).toBe(true);

    // Now check: permitted
    const afterCheck = manager.isApprovedForRecognition('song_quarantined');
    expect(afterCheck.permitted).toBe(true);
  });

  it('accurately reports licensing statistics', () => {
    manager.registerContent(
      'kjv',
      'bible_translation',
      'KJV',
      LicensingPolicyEngine.createPublicDomainLicense('Oxford', 'KJV PD')
    );
    manager.registerContent(
      'unreviewed',
      'song',
      'Draft Song',
      LicensingPolicyEngine.createQuarantinedLicense('file.txt')
    );

    const stats = manager.getStatistics();
    expect(stats.total).toBe(2);
    expect(stats.verified).toBe(1);
    expect(stats.unverified).toBe(1);
    expect(stats.restricted).toBe(0);
  });
});
