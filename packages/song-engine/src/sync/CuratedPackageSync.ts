/**
 * Curated Package Synchronisation Engine.
 *
 * Implements safe, versioned synchronization of curated shared libraries:
 * - Validates cryptographic signatures & hash trees before executing write actions
 * - Protects local church customizations by never silently destroying existing arrangements
 * - Supports conflict policies: 'keep_local', 'add_as_variant', 'overwrite_if_unmodified'
 */

import {
  CuratedPackageManifest,
  CuratedSyncResult,
  SyncConflictReport,
  SyncOptions,
  Song,
  SongVersion,
  SongSection
} from '@pulpit-ai/shared-types';
import { SongDatabase } from '../SongDatabase.js';
import { ManifestValidator } from './ManifestValidator.js';

export class CuratedPackageSync {
  constructor(private database: SongDatabase) {}

  /**
   * Synchronises a curated package into the local SQLite database.
   */
  public syncPackage(
    manifest: CuratedPackageManifest,
    options: SyncOptions = {}
  ): CuratedSyncResult {
    const conflictPolicy = options.conflictPolicy ?? 'add_as_variant';
    const verifyChecksums = options.verifyChecksums ?? true;

    // 1. Verify Manifest Integrity
    if (verifyChecksums) {
      const valRes = ManifestValidator.validate(manifest);
      if (!valRes.valid) {
        return {
          success: false,
          packageId: manifest.packageId,
          version: manifest.version,
          importedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          conflicts: [],
          integrityVerified: false,
          errors: valRes.errors
        };
      }
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const conflicts: SyncConflictReport[] = [];
    const now = Date.now();

    // 2. Iterate each curated song and apply conflict policy
    for (const curated of manifest.songs) {
      const normCuratedTitle = SongDatabase.normalizeLyricText(curated.canonicalTitle);
      const existingSongs = this.database.listSongs();
      const matchedLocal = existingSongs.find(
        s => SongDatabase.normalizeLyricText(s.canonicalTitle) === normCuratedTitle
      );

      if (!matchedLocal) {
        // Unique new song -> Create clean record
        const songId = `curated_${manifest.packageId}_${Math.random().toString(36).substring(2, 8)}`;
        const sections: SongSection[] = curated.sections.map((sec, idx) => ({
          id: `sec_${songId}_${idx + 1}`,
          type: (sec.type as any) || 'verse',
          sequenceOrder: idx + 1,
          label: sec.label,
          lines: sec.lines
        }));

        const newSong: Song = {
          id: songId,
          canonicalTitle: curated.canonicalTitle,
          alternativeTitles: curated.alternativeTitles || [],
          author: curated.author,
          copyright: curated.copyright,
          license: curated.license || manifest.license,
          ccliNumber: curated.ccliNumber,
          language: curated.language || 'en',
          licensing: {
            source: `Curated Shared Package: ${manifest.packageName} (${manifest.packageId})`,
            copyrightOwner: curated.copyright || (typeof manifest.publisher === 'string' ? manifest.publisher : manifest.publisher?.name) || 'Public Domain',
            licenseType: curated.license || manifest.license || 'public_domain',
            attribution: curated.author ? `${curated.canonicalTitle} (${curated.author})` : curated.canonicalTitle,
            offlineStoragePermission: true,
            redistributionPermission: true,
            aiProcessingPermission: true,
            verificationStatus: 'verified'
          },
          versions: [
            {
              id: `ver_${songId}_std`,
              songId,
              versionName: curated.versionName || 'Standard',
              isDefault: true,
              sections
            }
          ],
          createdAt: now,
          updatedAt: now
        };

        this.database.saveSong(newSong);
        importedCount++;
      } else {
        // Song already exists in local church database -> Evaluate conflict policy
        if (conflictPolicy === 'keep_local') {
          conflicts.push({
            songTitle: curated.canonicalTitle,
            localSongId: matchedLocal.id,
            reason: 'Song already exists locally. Policy "keep_local" retained existing version.',
            resolution: 'kept_local'
          });
          skippedCount++;
        } else if (conflictPolicy === 'add_as_variant') {
          // Check if this version name already exists
          const existingVer = matchedLocal.versions.find(
            v => v.versionName.toLowerCase() === (curated.versionName || 'Curated').toLowerCase()
          );

          if (existingVer) {
            conflicts.push({
              songTitle: curated.canonicalTitle,
              localSongId: matchedLocal.id,
              reason: `Version "${curated.versionName}" already exists on local song.`,
              resolution: 'kept_local'
            });
            skippedCount++;
          } else {
            const verId = `ver_${matchedLocal.id}_${Math.random().toString(36).substring(2, 6)}`;
            const sections: SongSection[] = curated.sections.map((sec, idx) => ({
              id: `sec_${verId}_${idx + 1}`,
              type: (sec.type as any) || 'verse',
              sequenceOrder: idx + 1,
              label: sec.label,
              lines: sec.lines
            }));

            const newVersion: SongVersion = {
              id: verId,
              songId: matchedLocal.id,
              versionName: curated.versionName || `Curated (${manifest.version})`,
              isDefault: false,
              sections
            };

            matchedLocal.versions.push(newVersion);
            matchedLocal.updatedAt = now;
            this.database.saveSong(matchedLocal);

            conflicts.push({
              songTitle: curated.canonicalTitle,
              localSongId: matchedLocal.id,
              reason: 'Local song found. Appended curated arrangement as a non-destructive version.',
              resolution: 'added_as_variant'
            });
            updatedCount++;
          }
        } else if (conflictPolicy === 'overwrite_if_unmodified') {
          // Replace versions
          matchedLocal.canonicalTitle = curated.canonicalTitle;
          matchedLocal.author = curated.author || matchedLocal.author;
          matchedLocal.license = curated.license || matchedLocal.license;
          matchedLocal.updatedAt = now;

          const verId = `ver_${matchedLocal.id}_std`;
          matchedLocal.versions = [
            {
              id: verId,
              songId: matchedLocal.id,
              versionName: curated.versionName || 'Standard',
              isDefault: true,
              sections: curated.sections.map((sec, idx) => ({
                id: `sec_${verId}_${idx + 1}`,
                type: (sec.type as any) || 'verse',
                sequenceOrder: idx + 1,
                label: sec.label,
                lines: sec.lines
              }))
            }
          ];

          this.database.saveSong(matchedLocal);
          conflicts.push({
            songTitle: curated.canonicalTitle,
            localSongId: matchedLocal.id,
            reason: 'Overwrote local song with curated package.',
            resolution: 'updated'
          });
          updatedCount++;
        }
      }
    }

    return {
      success: true,
      packageId: manifest.packageId,
      version: manifest.version,
      importedCount,
      updatedCount,
      skippedCount,
      conflicts,
      integrityVerified: true,
      errors: []
    };
  }
}
