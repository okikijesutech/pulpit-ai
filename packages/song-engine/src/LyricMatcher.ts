/**
 * Multi-Signal Lyric Matcher for Live Preaching and Singing Recognition.
 *
 * Implements Section 8 of the Pulpit AI build specification:
 * - Exact phrase match & token overlap
 * - Distinctiveness weighting (IDF-style filtering to suppress generic phrases like "Hallelujah")
 * - Consecutive-line evidence accumulation
 * - Ambiguity handling & rejection
 * - Fail-closed refusal to guess when evidence is insufficient
 */

import { Song, SongSection, SongVersion } from '@pulpit-ai/shared-types';
import { SongDatabase } from './SongDatabase.js';
import { ConsecutiveEvidenceTracker, ActiveSongHypothesis } from './ConsecutiveEvidenceTracker.js';

export interface LyricMatchCandidate {
  song: Song;
  version: SongVersion;
  section: SongSection;
  lineIndex: number;
  matchedLine: string;
  matchedText: string;
  confidence: number;
  distinctiveness: number;
  consecutiveMatches: number;
  isConsecutive: boolean;
  isAmbiguous: boolean;
  explanation: string;
}

export interface LyricMatchEvaluation {
  matchFound: boolean;
  topCandidate?: LyricMatchCandidate;
  runnerUp?: LyricMatchCandidate;
  isAmbiguous: boolean;
  suppressionReason?: string;
}

export class LyricMatcher {
  private static readonly GENERIC_CHURCH_TOKENS = new Set([
    'the', 'and', 'in', 'of', 'to', 'for', 'a', 'is', 'i', 'my', 'he', 'we', 'our',
    'you', 'your', 'with', 'on', 'that', 'this', 'o', 'oh',
    'lord', 'god', 'jesus', 'christ', 'holy', 'glory', 'praise', 'hallelujah',
    'amen', 'worship', 'sing', 'king', 'love'
  ]);

  private tracker: ConsecutiveEvidenceTracker;

  constructor(
    private database: SongDatabase,
    tracker?: ConsecutiveEvidenceTracker
  ) {
    this.tracker = tracker || new ConsecutiveEvidenceTracker();
  }

  public getTracker(): ConsecutiveEvidenceTracker {
    return this.tracker;
  }

  /**
   * Evaluates a transcribed audio segment against the verified song library.
   */
  public evaluateTranscript(
    transcript: string,
    isSinging = false,
    now: number = Date.now()
  ): LyricMatchEvaluation {
    if (!transcript || transcript.trim().length === 0) {
      return { matchFound: false, isAmbiguous: false, suppressionReason: 'Empty transcript' };
    }

    const normTranscript = SongDatabase.normalizeLyricText(transcript);
    const transcriptTokens = normTranscript.split(/\s+/).filter(t => t.length > 0);

    if (transcriptTokens.length === 0) {
      return { matchFound: false, isAmbiguous: false, suppressionReason: 'No valid tokens' };
    }

    // 1. Calculate phrase distinctiveness
    const distinctiveness = this.calculateDistinctiveness(transcriptTokens);

    // Rule: Common generic church phrase alone (e.g. "Hallelujah" or "Praise the Lord")
    // must NOT generate a one-off song suggestion unless backed by consecutive lines.
    if (distinctiveness < 0.35 && transcriptTokens.length < 4) {
      return {
        matchFound: false,
        isAmbiguous: false,
        suppressionReason: `Generic church phrase ("${transcript}") lacks distinctiveness to identify a song without consecutive lines.`
      };
    }

    // 2. Scan all songs in database for line matches
    const allSongs = this.database.listSongs();
    const candidates: LyricMatchCandidate[] = [];

    for (const song of allSongs) {
      for (const ver of song.versions) {
        for (const sec of ver.sections) {
          for (let lineIdx = 0; lineIdx < sec.lines.length; lineIdx++) {
            const rawLine = sec.lines[lineIdx];
            const normLine = SongDatabase.normalizeLyricText(rawLine);

            const sim = this.calculateLineSimilarity(normTranscript, normLine, transcriptTokens);
            if (sim > 0.60) {
              // Record match in ConsecutiveEvidenceTracker
              const evalRes = this.tracker.recordLineMatch(
                song,
                ver,
                sec,
                lineIdx,
                rawLine,
                sim,
                distinctiveness,
                now
              );

              // Bonus if acoustic detector flagged active singing/worship
              const singingBonus = isSinging ? 0.05 : 0;
              const finalConfidence = Math.min(0.99, evalRes.score + singingBonus);

              if (evalRes.meetsConfidenceThreshold || finalConfidence >= 0.70) {
                candidates.push({
                  song,
                  version: ver,
                  section: sec,
                  lineIndex: lineIdx,
                  matchedLine: rawLine,
                  matchedText: transcript,
                  confidence: Math.round(finalConfidence * 100) / 100,
                  distinctiveness: Math.round(distinctiveness * 100) / 100,
                  consecutiveMatches: evalRes.hypothesis.consecutiveMatches,
                  isConsecutive: evalRes.isConsecutive,
                  isAmbiguous: false,
                  explanation: evalRes.isConsecutive
                    ? `Consecutive match (${evalRes.hypothesis.consecutiveMatches} lines in sequence) in "${song.canonicalTitle} (${ver.versionName}) - ${sec.label}".`
                    : `High distinctiveness line match in "${song.canonicalTitle}" (${Math.round(sim * 100)}% similarity).`
                });
              }
            }
          }
        }
      }
    }

    if (candidates.length === 0) {
      return {
        matchFound: false,
        isAmbiguous: false,
        suppressionReason: 'No verified song lyrics matched the transcript with sufficient confidence.'
      };
    }

    // Sort by confidence descending
    candidates.sort((a, b) => b.confidence - a.confidence);

    const top = candidates[0];
    const runnerUp = candidates.length > 1 ? candidates[1] : undefined;

    // 3. Ambiguity Check
    // If top candidate and runner-up have almost identical confidence from DIFFERENT songs
    // and neither has multi-line consecutive evidence, refuse to guess.
    if (
      runnerUp &&
      runnerUp.song.id !== top.song.id &&
      Math.abs(top.confidence - runnerUp.confidence) < 0.10 &&
      top.consecutiveMatches < 2 &&
      runnerUp.consecutiveMatches < 2
    ) {
      top.isAmbiguous = true;
      runnerUp.isAmbiguous = true;
      return {
        matchFound: false,
        topCandidate: top,
        runnerUp,
        isAmbiguous: true,
        suppressionReason: `Ambiguous match: Both "${top.song.canonicalTitle}" (${Math.round(top.confidence * 100)}%) and "${runnerUp.song.canonicalTitle}" (${Math.round(runnerUp.confidence * 100)}%) share matching lyrics without consecutive line confirmation.`
      };
    }

    return {
      matchFound: true,
      topCandidate: top,
      runnerUp,
      isAmbiguous: false
    };
  }

  /**
   * Calculates distinctiveness score based on content words vs generic church terms.
   */
  public calculateDistinctiveness(tokens: string[]): number {
    if (tokens.length === 0) return 0;

    let informativeCount = 0;
    for (const t of tokens) {
      if (!LyricMatcher.GENERIC_CHURCH_TOKENS.has(t) && t.length > 2) {
        informativeCount++;
      }
    }

    if (informativeCount === 0) return 0.20;

    const ratio = informativeCount / tokens.length;
    return Math.min(1.0, Math.max(0.30, 0.40 + ratio * 0.50 + (informativeCount >= 3 ? 0.10 : 0)));
  }

  /**
   * Compares normalized transcript against normalized stored lyric line.
   */
  private calculateLineSimilarity(
    normTranscript: string,
    normLine: string,
    transcriptTokens: string[]
  ): number {
    if (normTranscript === normLine) return 1.0;
    if (normLine.includes(normTranscript)) {
      // Substring containment
      return Math.min(0.98, normTranscript.length / normLine.length + 0.35);
    }
    if (normTranscript.includes(normLine)) {
      return 0.95;
    }

    const lineTokens = normLine.split(/\s+/).filter(t => t.length > 0);
    if (lineTokens.length === 0 || transcriptTokens.length === 0) return 0;

    const setLine = new Set(lineTokens);
    let overlapCount = 0;
    for (const t of transcriptTokens) {
      if (setLine.has(t)) overlapCount++;
    }

    const jaccard = overlapCount / (transcriptTokens.length + lineTokens.length - overlapCount);
    const containment = overlapCount / Math.min(transcriptTokens.length, lineTokens.length);

    return Math.max(jaccard, containment * 0.85);
  }
}
