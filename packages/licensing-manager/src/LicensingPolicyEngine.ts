/**
 * Licensing Policy Engine.
 *
 * Enforces strict copyright, licensing, AI processing permissions,
 * and attribution boundaries across Scripture and Song catalogues.
 */

import {
  ContentLicenseMetadata,
  LicenseEvaluationResult,
  LicenseValidationResult
} from '@pulpit-ai/shared-types';

export class LicensingPolicyEngine {
  /**
   * Validates whether a metadata record contains all 8 mandatory legal fields.
   */
  public static validateLicense(
    metadata: Partial<ContentLicenseMetadata>
  ): LicenseValidationResult {
    const errors: string[] = [];

    if (!metadata.source || metadata.source.trim().length === 0) {
      errors.push('Source must be explicitly documented and non-empty.');
    }

    if (!metadata.copyrightOwner || metadata.copyrightOwner.trim().length === 0) {
      errors.push('Copyright owner must be identified.');
    }

    if (!metadata.licenseType || metadata.licenseType.trim().length === 0) {
      errors.push('Licence type must be specified.');
    }

    if (!metadata.attribution || metadata.attribution.trim().length === 0) {
      errors.push('Attribution requirements must be provided.');
    }

    if (typeof metadata.offlineStoragePermission !== 'boolean') {
      errors.push('offlineStoragePermission must be a boolean flag.');
    }

    if (typeof metadata.redistributionPermission !== 'boolean') {
      errors.push('redistributionPermission must be a boolean flag.');
    }

    if (typeof metadata.aiProcessingPermission !== 'boolean') {
      errors.push('aiProcessingPermission must be a boolean flag.');
    }

    const validStatuses = ['verified', 'unverified', 'restricted'];
    if (!metadata.verificationStatus || !validStatuses.includes(metadata.verificationStatus)) {
      errors.push(`verificationStatus must be one of: ${validStatuses.join(', ')}.`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Evaluates if content is legally and technically authorized for AI speech/singing recognition indexing.
   */
  public static evaluateRecognitionAccess(
    metadata?: ContentLicenseMetadata
  ): LicenseEvaluationResult {
    if (!metadata) {
      return {
        permitted: false,
        reason: 'Content lacks licensing metadata and cannot be searched by AI engine.'
      };
    }

    if (metadata.verificationStatus !== 'verified') {
      return {
        permitted: false,
        reason: `Content verification status is "${metadata.verificationStatus}". Only human-approved verified content can be indexed for recognition.`
      };
    }

    if (!metadata.aiProcessingPermission) {
      return {
        permitted: false,
        reason: 'Content licence explicitly prohibits automated AI processing and matching.'
      };
    }

    return {
      permitted: true,
      attribution: metadata.attribution
    };
  }

  /**
   * Evaluates if content may be synced or redistributed to peer churches or curated shared libraries.
   */
  public static evaluateRedistribution(
    metadata?: ContentLicenseMetadata
  ): LicenseEvaluationResult {
    if (!metadata) {
      return {
        permitted: false,
        reason: 'Cannot redistribute content with unknown licensing status.'
      };
    }

    if (metadata.verificationStatus !== 'verified') {
      return {
        permitted: false,
        reason: 'Unverified or quarantined content cannot be shared externally.'
      };
    }

    if (!metadata.redistributionPermission) {
      return {
        permitted: false,
        reason: 'Content license or owner does not grant redistribution rights.'
      };
    }

    return {
      permitted: true,
      attribution: metadata.attribution
    };
  }

  /**
   * Evaluates if content can be stored in local offline SQLite.
   */
  public static evaluateOfflineStorage(
    metadata?: ContentLicenseMetadata
  ): LicenseEvaluationResult {
    if (!metadata) {
      return {
        permitted: false,
        reason: 'Missing licensing metadata.'
      };
    }

    if (!metadata.offlineStoragePermission) {
      return {
        permitted: false,
        reason: 'Offline storage permission denied by licensing agreement.'
      };
    }

    return {
      permitted: true,
      attribution: metadata.attribution
    };
  }

  /**
   * Helper to construct a verified public-domain licence.
   */
  public static createPublicDomainLicense(
    source: string,
    attribution: string,
    copyrightOwner: string = 'Public Domain'
  ): ContentLicenseMetadata {
    return {
      source,
      copyrightOwner,
      licenseType: 'public_domain',
      attribution,
      offlineStoragePermission: true,
      redistributionPermission: true,
      aiProcessingPermission: true,
      verificationStatus: 'verified'
    };
  }

  /**
   * Helper to construct a church-owned song licence (authorized for church use, not for external redistribution).
   */
  public static createChurchOwnedLicense(
    churchName: string,
    source: string = 'Local Church Song Archive',
    ccliNumber?: string
  ): ContentLicenseMetadata {
    return {
      source,
      copyrightOwner: churchName,
      licenseType: 'church_owned',
      attribution: `Used by permission — ${churchName}${ccliNumber ? ` (CCLI #${ccliNumber})` : ''}`,
      offlineStoragePermission: true,
      redistributionPermission: false, // Internal church use only
      aiProcessingPermission: true,
      verificationStatus: 'verified',
      notes: ccliNumber ? `CCLI #${ccliNumber}` : undefined
    };
  }

  /**
   * Helper to construct a commercial or publisher-licensed Bible or song licence.
   */
  public static createCommercialLicense(
    owner: string,
    source: string,
    licenseRef: string,
    permissions: {
      offlineStorage: boolean;
      redistribution: boolean;
      aiProcessing: boolean;
      verificationStatus: 'verified' | 'unverified' | 'restricted';
    }
  ): ContentLicenseMetadata {
    return {
      source,
      copyrightOwner: owner,
      licenseType: 'commercial_licensed',
      attribution: `Copyright © ${owner}. All rights reserved. Licensed under ${licenseRef}.`,
      offlineStoragePermission: permissions.offlineStorage,
      redistributionPermission: permissions.redistribution,
      aiProcessingPermission: permissions.aiProcessing,
      verificationStatus: permissions.verificationStatus,
      notes: `License Ref: ${licenseRef}`
    };
  }

  /**
   * Helper to construct initial quarantined licence metadata for newly imported content.
   */
  public static createQuarantinedLicense(
    sourcePath: string,
    detectedOwner?: string
  ): ContentLicenseMetadata {
    return {
      source: sourcePath,
      copyrightOwner: detectedOwner || 'Unverified / Pending Human Review',
      licenseType: 'custom_restricted',
      attribution: detectedOwner ? `Copyright © ${detectedOwner}` : 'Pending Verification',
      offlineStoragePermission: true,
      redistributionPermission: false,
      aiProcessingPermission: false, // Inactive until human approval
      verificationStatus: 'unverified',
      notes: 'Imported via staging pipeline. Awaiting human licensing review.'
    };
  }
}
