/**
 * Song Duplicate Detection Engine.
 *
 * Compares incoming song drafts against the local song library using:
 * - Normalized title equality and Levenshtein token similarity
 * - Full-text lyric token set overlap (Jaccard similarity)
 * - Identifies exact matches, arrangement variants, and unique songs.
 */

import { Song } from '@pulpit-ai/shared-types';
import { ParsedSongDraft } from './importers/types.js';
import { SongDatabase } from './SongDatabase.js';

export type DuplicateMatchStatus =
  | 'unique_new'
  | 'exact_match'
  | 'variant_version'
  | 'similar_title';

export interface DuplicateCheckResult {
  status: DuplicateMatchStatus;
  matchedSong?: Song;
  titleSimilarity: number;
  lyricOverlap: number;
  recommendation: 'create_new' | 'add_as_version' | 'replace' | 'reject';
  explanation: string;
}

export class SongDuplicateDetector {
  /**
   * Compares a parsed draft against the current library in SongDatabase.
   */
  public static checkDuplicate(
    draft: ParsedSongDraft,
    database: SongDatabase
  ): DuplicateCheckResult {
    const allSongs = database.listSongs();
    if (allSongs.length === 0) {
      return {
        status: 'unique_new',
        titleSimilarity: 0,
        lyricOverlap: 0,
        recommendation: 'create_new',
        explanation: 'No existing songs in library.'
      };
    }

    const draftTokens = this.extractTokenSet(
      draft.sections.flatMap(s => s.lines).join(' ')
    );

    let bestMatch: Song | null = null;
    let highestScore = 0;
    let bestTitleSim = 0;
    let bestLyricMetrics = { jaccard: 0, draftInExisting: 0, existingInDraft: 0, maxContainment: 0 };

    for (const existing of allSongs) {
      let titleSim = this.calculateTitleSimilarity(draft.title, existing.canonicalTitle);

      if (existing.alternativeTitles) {
        for (const alt of existing.alternativeTitles) {
          const altSim = this.calculateTitleSimilarity(draft.title, alt);
          if (altSim > titleSim) titleSim = altSim;
        }
      }

      const existingLyrics = existing.versions
        .flatMap(v => v.sections)
        .flatMap(s => s.lines)
        .join(' ');
      const existingTokens = this.extractTokenSet(existingLyrics);
      const lyricMetrics = this.calculateLyricOverlap(draftTokens, existingTokens);

      // Score weight: title matching + lyric containment
      const score = (titleSim * 0.6) + (lyricMetrics.maxContainment * 0.4);

      if (score > highestScore) {
        highestScore = score;
        bestMatch = existing;
        bestTitleSim = titleSim;
        bestLyricMetrics = lyricMetrics;
      }
    }

    // Determine status & recommendation
    if (bestMatch && highestScore >= 0.25) {
      const lyricOverlap = Math.max(bestLyricMetrics.draftInExisting, bestLyricMetrics.jaccard);

      // 1. Exact title + High lyric containment/overlap -> Exact duplicate
      if (bestTitleSim >= 0.95 && (bestLyricMetrics.draftInExisting >= 0.85 || bestLyricMetrics.jaccard >= 0.85)) {
        return {
          status: 'exact_match',
          matchedSong: bestMatch,
          titleSimilarity: bestTitleSim,
          lyricOverlap,
          recommendation: 'reject',
          explanation: `Identical song "${bestMatch.canonicalTitle}" already exists in the library with matching lyrics.`
        };
      }

      // 2. High title similarity with lyric presence OR significant lyric overlap -> Variant / Arrangement
      if ((bestTitleSim >= 0.80 && bestLyricMetrics.maxContainment >= 0.15) || bestLyricMetrics.jaccard >= 0.50) {
        return {
          status: 'variant_version',
          matchedSong: bestMatch,
          titleSimilarity: bestTitleSim,
          lyricOverlap,
          recommendation: 'add_as_version',
          explanation: `Matched existing song "${bestMatch.canonicalTitle}" (${Math.round(lyricOverlap * 100)}% lyric overlap). Recommend adding as a new version or arrangement.`
        };
      }

      // 3. Similar title only, but low lyric overlap
      if (bestTitleSim >= 0.80) {
        return {
          status: 'similar_title',
          matchedSong: bestMatch,
          titleSimilarity: bestTitleSim,
          lyricOverlap,
          recommendation: 'create_new',
          explanation: `Title is similar to "${bestMatch.canonicalTitle}", but lyrics differ. Verify if this is an independent song.`
        };
      }
    }

    return {
      status: 'unique_new',
      titleSimilarity: bestTitleSim,
      lyricOverlap: bestLyricMetrics.jaccard,
      recommendation: 'create_new',
      explanation: 'No duplicate found in the library. Safe to import as a new song.'
    };
  }

  private static cleanTitle(title: string): string {
    return title
      .replace(/\s*[\(\[\{][^\)\]\}]*[\)\]\}]/g, '') // remove parentheticals
      .replace(/\s*[-–—/].*$/, '') // remove trailing dash phrases
      .trim();
  }

  private static calculateTitleSimilarity(draftTitle: string, existingTitle: string): number {
    const normDraft = SongDatabase.normalizeLyricText(draftTitle);
    const normExisting = SongDatabase.normalizeLyricText(existingTitle);
    if (normDraft === normExisting) return 1.0;

    // Check base titles without parentheticals / arrangement notes
    const baseDraft = SongDatabase.normalizeLyricText(this.cleanTitle(draftTitle));
    const baseExisting = SongDatabase.normalizeLyricText(this.cleanTitle(existingTitle));
    if (baseDraft === baseExisting && baseDraft.length > 2) {
      return 0.95;
    }

    const tokensA = new Set(normDraft.split(/\s+/).filter(t => t.length > 0));
    const tokensB = new Set(normExisting.split(/\s+/).filter(t => t.length > 0));

    const jaccard = this.calculateJaccardOverlap(tokensA, tokensB);
    const containment = this.calculateContainment(tokensA, tokensB);

    if (containment >= 0.99 && Math.min(tokensA.size, tokensB.size) >= 2) {
      return 0.90;
    }

    return Math.max(jaccard, containment * 0.85);
  }

  private static calculateContainment(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    let inB = 0;
    for (const t of setA) {
      if (setB.has(t)) inB++;
    }
    return inB / Math.min(setA.size, setB.size);
  }

  private static calculateLyricOverlap(draftTokens: Set<string>, existingTokens: Set<string>): {
    jaccard: number;
    draftInExisting: number;
    existingInDraft: number;
    maxContainment: number;
  } {
    if (draftTokens.size === 0 || existingTokens.size === 0) {
      return { jaccard: 0, draftInExisting: 0, existingInDraft: 0, maxContainment: 0 };
    }

    let intersectionCount = 0;
    for (const token of draftTokens) {
      if (existingTokens.has(token)) {
        intersectionCount++;
      }
    }

    const unionCount = draftTokens.size + existingTokens.size - intersectionCount;
    const jaccard = unionCount === 0 ? 0 : Math.round((intersectionCount / unionCount) * 100) / 100;
    const draftInExisting = Math.round((intersectionCount / draftTokens.size) * 100) / 100;
    const existingInDraft = Math.round((intersectionCount / existingTokens.size) * 100) / 100;
    const maxContainment = Math.max(draftInExisting, existingInDraft);

    return { jaccard, draftInExisting, existingInDraft, maxContainment };
  }

  private static extractTokenSet(text: string): Set<string> {
    const normalized = SongDatabase.normalizeLyricText(text);
    return new Set(normalized.split(/\s+/).filter(t => t.length > 2));
  }

  private static calculateJaccardOverlap(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;

    let intersectionCount = 0;
    for (const token of setA) {
      if (setB.has(token)) {
        intersectionCount++;
      }
    }

    const unionCount = setA.size + setB.size - intersectionCount;
    return unionCount === 0 ? 0 : Math.round((intersectionCount / unionCount) * 100) / 100;
  }
}
