/**
 * Content Licensing, Permission, and Attribution definitions.
 * Enforces Section 7 & 13 of the Pulpit AI build specification.
 */

export type LicenseType =
  | 'public_domain'
  | 'creative_commons'
  | 'church_owned'
  | 'commercial_licensed'
  | 'ccli_covered'
  | 'custom_restricted';

export type VerificationStatus = 'verified' | 'unverified' | 'restricted';

export interface ContentLicenseMetadata {
  /** Origin of the content (e.g. publication, hymnal edition, publisher portal, local church archive) */
  source: string;
  /** Explicit copyright holder (e.g. "Public Domain", "Hope Publishing", "Local Church Name") */
  copyrightOwner: string;
  /** Standardized or custom license category */
  licenseType: LicenseType | string;
  /** Required human-facing attribution displayed when projecting or citing */
  attribution: string;
  /** Whether content may be saved to and read from local offline SQLite/disk */
  offlineStoragePermission: boolean;
  /** Whether content can be exported, shared, or synced to peer church libraries */
  redistributionPermission: boolean;
  /** Whether the AI recognition engine is legally and technically authorized to index and search this content */
  aiProcessingPermission: boolean;
  /** Current verification state */
  verificationStatus: VerificationStatus;
  /** Optional notes regarding license boundaries or CCLI license numbers */
  notes?: string;
}

export interface LicenseValidationResult {
  valid: boolean;
  errors: string[];
}

export interface LicenseEvaluationResult {
  permitted: boolean;
  reason?: string;
  attribution?: string;
}
