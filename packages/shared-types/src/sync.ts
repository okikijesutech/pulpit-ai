/**
 * Curated Shared Library and Content Synchronisation Types.
 *
 * Implements the content exchange and verification model from Section 13 and 14:
 * - Versioned manifests with cryptographic integrity hashes (SHA-256)
 * - Publisher attribution and moderation signatures
 * - Conflict resolution models that preserve local church arrangements
 */

import { Song } from './content.js';

export interface CuratedSongEntry {
  canonicalTitle: string;
  alternativeTitles: string[];
  author?: string;
  copyright: string;
  license: string;
  ccliNumber?: string;
  language: string;
  versionName: string;
  sections: Array<{
    type: string;
    label: string;
    lines: string[];
  }>;
  contentHashSha256: string;
}

export interface CuratedPackageManifest {
  packageId: string;
  packageName: string;
  version: string;
  publishedAt: number;
  publisher: {
    name: string;
    contact?: string;
    signatureSha256?: string;
  };
  license: string;
  description: string;
  totalSongs: number;
  packageHashSha256: string;
  songs: CuratedSongEntry[];
}

export type SyncConflictPolicy = 'keep_local' | 'add_as_variant' | 'overwrite_if_unmodified';

export interface SyncOptions {
  conflictPolicy?: SyncConflictPolicy;
  verifyChecksums?: boolean;
}

export interface SyncConflictReport {
  songTitle: string;
  localSongId: string;
  reason: string;
  resolution: 'kept_local' | 'added_as_variant' | 'updated';
}

export interface CuratedSyncResult {
  success: boolean;
  packageId: string;
  version: string;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  conflicts: SyncConflictReport[];
  integrityVerified: boolean;
  errors: string[];
}
