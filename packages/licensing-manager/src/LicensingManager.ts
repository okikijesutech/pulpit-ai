/**
 * Central Licensing Manager.
 *
 * Coordinates license registration, policy audits, and compliance enforcement
 * across Bible translations and Song libraries.
 */

import {
  ContentLicenseMetadata,
  LicenseEvaluationResult,
  LicenseValidationResult
} from '@pulpit-ai/shared-types';
import { LicensingPolicyEngine } from './LicensingPolicyEngine.js';

export interface RegisteredLicenseItem {
  contentId: string;
  contentType: 'bible_translation' | 'song';
  title: string;
  metadata: ContentLicenseMetadata;
  registeredAt: number;
  reviewedBy?: string;
}

export class LicensingManager {
  private registry: Map<string, RegisteredLicenseItem> = new Map();

  /**
   * Registers a content item with its mandatory license metadata.
   */
  public registerContent(
    contentId: string,
    contentType: 'bible_translation' | 'song',
    title: string,
    metadata: ContentLicenseMetadata,
    reviewer?: string
  ): { success: boolean; validation: LicenseValidationResult } {
    const validation = LicensingPolicyEngine.validateLicense(metadata);
    if (!validation.valid) {
      return { success: false, validation };
    }

    this.registry.set(contentId, {
      contentId,
      contentType,
      title,
      metadata: { ...metadata },
      registeredAt: Date.now(),
      reviewedBy: reviewer
    });

    return { success: true, validation };
  }

  /**
   * Retrieves license record for an item.
   */
  public getLicense(contentId: string): RegisteredLicenseItem | undefined {
    return this.registry.get(contentId);
  }

  /**
   * Checks if an item is approved for AI speech recognition or song lyric matching.
   */
  public isApprovedForRecognition(contentId: string): LicenseEvaluationResult {
    const item = this.registry.get(contentId);
    if (!item) {
      return {
        permitted: false,
        reason: `Item "${contentId}" is not registered in the licensing database.`
      };
    }
    return LicensingPolicyEngine.evaluateRecognitionAccess(item.metadata);
  }

  /**
   * Checks if an item can be exported or synced to shared church libraries.
   */
  public isApprovedForRedistribution(contentId: string): LicenseEvaluationResult {
    const item = this.registry.get(contentId);
    if (!item) {
      return {
        permitted: false,
        reason: `Item "${contentId}" is not registered in the licensing database.`
      };
    }
    return LicensingPolicyEngine.evaluateRedistribution(item.metadata);
  }

  /**
   * Updates verification status after human operator review.
   */
  public updateVerification(
    contentId: string,
    status: 'verified' | 'unverified' | 'restricted',
    aiProcessingPermission: boolean,
    reviewer: string,
    notes?: string
  ): boolean {
    const item = this.registry.get(contentId);
    if (!item) return false;

    item.metadata.verificationStatus = status;
    item.metadata.aiProcessingPermission = aiProcessingPermission;
    item.reviewedBy = reviewer;
    if (notes) {
      item.metadata.notes = item.metadata.notes ? `${item.metadata.notes}; ${notes}` : notes;
    }
    return true;
  }

  /**
   * Returns count of registered items grouped by verification status.
   */
  public getStatistics(): {
    total: number;
    verified: number;
    unverified: number;
    restricted: number;
  } {
    let verified = 0;
    let unverified = 0;
    let restricted = 0;

    for (const item of this.registry.values()) {
      if (item.metadata.verificationStatus === 'verified') verified++;
      else if (item.metadata.verificationStatus === 'unverified') unverified++;
      else if (item.metadata.verificationStatus === 'restricted') restricted++;
    }

    return {
      total: this.registry.size,
      verified,
      unverified,
      restricted
    };
  }
}
