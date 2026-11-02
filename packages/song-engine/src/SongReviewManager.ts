/**
 * Song Import Review and Staging Manager.
 *
 * Enforces the non-negotiable rule from Section 10:
 * "Imported content must be reviewed before it is used for recognition."
 * Keeps untrusted imports staged in quarantine until the church presentation operator
 * confirms rights, resolves duplicate matches, and approves library promotion.
 */

import { Song, SongVersion, SongSection } from '@pulpit-ai/shared-types';
import { ParsedSongDraft } from './importers/types.js';
import { SongDatabase } from './SongDatabase.js';
import { SongDuplicateDetector, DuplicateCheckResult } from './SongDuplicateDetector.js';

export interface StagedSongImport {
  id: string;
  draft: ParsedSongDraft;
  duplicateCheck: DuplicateCheckResult;
  stagedAt: number;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  rightsConfirmed: boolean;
  rejectionReason?: string;
}

export interface ApproveImportOptions {
  action: 'create_new' | 'add_as_version' | 'replace';
  versionName?: string;
  rightsConfirmed: boolean;
  overrideTitle?: string;
  overrideAuthor?: string;
}

export class SongReviewManager {
  private stagedMap: Map<string, StagedSongImport> = new Map();

  constructor(private database: SongDatabase) {}

  /**
   * Stages a parsed song draft for operator review and runs duplicate detection.
   */
  public stageDraft(draft: ParsedSongDraft): StagedSongImport {
    const stagingId = `stage_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const duplicateCheck = SongDuplicateDetector.checkDuplicate(draft, this.database);

    const staged: StagedSongImport = {
      id: stagingId,
      draft,
      duplicateCheck,
      stagedAt: Date.now(),
      reviewStatus: 'pending',
      rightsConfirmed: false
    };

    this.stagedMap.set(stagingId, staged);
    return staged;
  }

  /**
   * Lists all songs currently pending operator review.
   */
  public listStaged(): StagedSongImport[] {
    return Array.from(this.stagedMap.values());
  }

  /**
   * Retrieves a staged item by ID.
   */
  public getStaged(stagingId: string): StagedSongImport | null {
    return this.stagedMap.get(stagingId) || null;
  }

  /**
   * Promotes a staged song into the active church library upon operator approval.
   */
  public approveImport(stagingId: string, options: ApproveImportOptions): Song {
    const staged = this.stagedMap.get(stagingId);
    if (!staged) {
      throw new Error(`Staged import "${stagingId}" not found.`);
    }

    if (!options.rightsConfirmed) {
      throw new Error('Operator must confirm church usage rights/CCLI license before approval.');
    }

    const draft = staged.draft;
    const now = Date.now();
    let savedSong: Song;

    if (options.action === 'add_as_version' && staged.duplicateCheck.matchedSong) {
      // Append as a new distinct arrangement version to existing song
      const existing = staged.duplicateCheck.matchedSong;
      const versionName = options.versionName || `Arrangement (${new Date().toLocaleDateString()})`;

      const newVersion: SongVersion = {
        id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        songId: existing.id,
        versionName,
        isDefault: false,
        sections: draft.sections.map((sec, idx) => ({
          id: `sec_${Date.now()}_${idx}`,
          type: sec.type,
          sequenceOrder: idx + 1,
          label: sec.label,
          lines: sec.lines
        }))
      };

      existing.versions.push(newVersion);
      existing.updatedAt = now;
      this.database.saveSong(existing);
      savedSong = existing;
    } else if (options.action === 'replace' && staged.duplicateCheck.matchedSong) {
      // Replace existing song
      const existing = staged.duplicateCheck.matchedSong;
      savedSong = {
        ...existing,
        canonicalTitle: options.overrideTitle || draft.title,
        author: options.overrideAuthor || draft.author || existing.author,
        copyright: draft.copyright || existing.copyright,
        versions: [
          {
            id: `ver_${Date.now()}_std`,
            songId: existing.id,
            versionName: options.versionName || 'Standard',
            isDefault: true,
            sections: draft.sections.map((sec, idx) => ({
              id: `sec_${Date.now()}_${idx}`,
              type: sec.type,
              sequenceOrder: idx + 1,
              label: sec.label,
              lines: sec.lines
            }))
          }
        ],
        updatedAt: now
      };
      this.database.saveSong(savedSong);
    } else {
      // Create new song record
      const songId = `song_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const sections: SongSection[] = draft.sections.map((sec, idx) => ({
        id: `sec_${Date.now()}_${idx}`,
        type: sec.type,
        sequenceOrder: idx + 1,
        label: sec.label,
        lines: sec.lines
      }));

      savedSong = {
        id: songId,
        canonicalTitle: options.overrideTitle || draft.title,
        alternativeTitles: draft.alternativeTitles || [],
        author: options.overrideAuthor || draft.author,
        copyright: draft.copyright,
        license: draft.license || 'Local Church Use',
        language: draft.language || 'en',
        versions: [
          {
            id: `ver_${songId}_std`,
            songId,
            versionName: options.versionName || 'Standard',
            isDefault: true,
            sections
          }
        ],
        createdAt: now,
        updatedAt: now
      };

      this.database.saveSong(savedSong);
    }

    // Remove from staging queue
    this.stagedMap.delete(stagingId);
    return savedSong;
  }

  /**
   * Rejects a staged import.
   */
  public rejectImport(stagingId: string, reason = 'Operator rejected'): boolean {
    const staged = this.stagedMap.get(stagingId);
    if (!staged) return false;

    staged.reviewStatus = 'rejected';
    staged.rejectionReason = reason;
    this.stagedMap.delete(stagingId);
    return true;
  }

  /**
   * Clears all staged items.
   */
  public clearStaged(): void {
    this.stagedMap.clear();
  }
}
