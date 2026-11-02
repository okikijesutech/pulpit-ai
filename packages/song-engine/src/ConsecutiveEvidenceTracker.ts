/**
 * Consecutive-Line Evidence Tracker for Live Song Recognition.
 *
 * Implements Section 8 multi-signal evidence accumulation:
 * Tracks sequential lyric lines across audio segments.
 * High confidence is awarded when consecutive lines in a verse or chorus are confirmed in order.
 * Stale hypotheses decay after a configurable window (default 25s).
 */

import { Song, SongSection, SongVersion } from '@pulpit-ai/shared-types';
import { SongDatabase } from './SongDatabase.js';

export interface ActiveSongHypothesis {
  songId: string;
  canonicalTitle: string;
  versionId: string;
  versionName: string;
  sectionId: string;
  sectionLabel: string;
  lastMatchedLineIndex: number;
  matchedLines: string[];
  consecutiveMatches: number;
  accumulatedConfidence: number;
  lastSeenAt: number;
}

export interface EvidenceEvaluationResult {
  hypothesis: ActiveSongHypothesis;
  isConsecutive: boolean;
  meetsConfidenceThreshold: boolean;
  score: number;
}

export class ConsecutiveEvidenceTracker {
  private hypotheses: Map<string, ActiveSongHypothesis> = new Map();
  private readonly hypothesisWindowMs: number;

  constructor(options: { hypothesisWindowMs?: number } = {}) {
    this.hypothesisWindowMs = options.hypothesisWindowMs ?? 25000; // 25s window
  }

  /**
   * Clears all tracked hypotheses.
   */
  public reset(): void {
    this.hypotheses.clear();
  }

  /**
   * Removes hypotheses older than the tracking window.
   */
  public pruneStale(now: number = Date.now()): void {
    for (const [key, hyp] of this.hypotheses.entries()) {
      if (now - hyp.lastSeenAt > this.hypothesisWindowMs) {
        this.hypotheses.delete(key);
      }
    }
  }

  /**
   * Registers a line match and checks if it forms consecutive evidence.
   */
  public recordLineMatch(
    song: Song,
    version: SongVersion,
    section: SongSection,
    lineIndex: number,
    matchedLineText: string,
    lineSimilarity: number,
    distinctivenessScore: number,
    now: number = Date.now()
  ): EvidenceEvaluationResult {
    this.pruneStale(now);

    const hypKey = `${song.id}_${version.id}_${section.id}`;
    const existing = this.hypotheses.get(hypKey);

    let isConsecutive = false;
    let consecutiveMatches = 1;
    const lineScore = (lineSimilarity * 0.65) + (distinctivenessScore * 0.35);
    let accumulatedConfidence = lineScore;

    if (existing) {
      // Check if this line is strictly the next line or a chorus repeat
      const delta = lineIndex - existing.lastMatchedLineIndex;
      if (delta === 1 || (delta === 0 && lineIndex > 0)) {
        isConsecutive = true;
        consecutiveMatches = existing.consecutiveMatches + 1;
        // Boost confidence significantly with consecutive evidence
        accumulatedConfidence = Math.min(
          0.99,
          existing.accumulatedConfidence * 0.35 + lineScore * 0.65 + 0.20
        );
      } else if (delta > 1 && delta <= 3) {
        // Line skipped in transcription (e.g. background music obscured a line)
        consecutiveMatches = existing.consecutiveMatches + 1;
        accumulatedConfidence = Math.min(
          0.95,
          existing.accumulatedConfidence * 0.45 + lineScore * 0.55 + 0.12
        );
      } else {
        // Jumper or repeat
        consecutiveMatches = 1;
      }

      existing.lastMatchedLineIndex = lineIndex;
      if (!existing.matchedLines.includes(matchedLineText)) {
        existing.matchedLines.push(matchedLineText);
      }
      existing.consecutiveMatches = consecutiveMatches;
      existing.accumulatedConfidence = accumulatedConfidence;
      existing.lastSeenAt = now;

      const meetsThreshold =
        consecutiveMatches >= 2 || (accumulatedConfidence >= 0.75 && distinctivenessScore >= 0.45);

      return {
        hypothesis: existing,
        isConsecutive,
        meetsConfidenceThreshold: meetsThreshold,
        score: accumulatedConfidence
      };
    }

    // New hypothesis
    const newHyp: ActiveSongHypothesis = {
      songId: song.id,
      canonicalTitle: song.canonicalTitle,
      versionId: version.id,
      versionName: version.versionName,
      sectionId: section.id,
      sectionLabel: section.label,
      lastMatchedLineIndex: lineIndex,
      matchedLines: [matchedLineText],
      consecutiveMatches: 1,
      accumulatedConfidence,
      lastSeenAt: now
    };

    this.hypotheses.set(hypKey, newHyp);

    // Single line meets threshold if combined score >= 0.75 and distinctiveness is acceptable
    const meetsThreshold = accumulatedConfidence >= 0.75 && distinctivenessScore >= 0.45;

    return {
      hypothesis: newHyp,
      isConsecutive: false,
      meetsConfidenceThreshold: meetsThreshold,
      score: accumulatedConfidence
    };
  }

  /**
   * Returns active hypotheses ranked by accumulated confidence and consecutive lines.
   */
  public getTopHypotheses(): ActiveSongHypothesis[] {
    return Array.from(this.hypotheses.values()).sort(
      (a, b) => b.accumulatedConfidence - a.accumulatedConfidence
    );
  }
}
