/**
 * Song Suggestion Candidate Generator for Live Church Presentation.
 *
 * Connects the live speech/singing recognition pipeline to the verified song catalog.
 * Produces structured SuggestionCandidates adhering strictly to the fail-closed authority model:
 * - Emits SuggestionCandidate only when lyrics match local verified songs with sufficient confidence.
 * - Suppresses duplicate suggestions for the same song within a configurable cooldown window.
 * - Formats allowlisted FreeShowCommand payloads for operator review and Central Authority authorization.
 */

import { FreeShowCommand, SuggestionCandidate } from '@pulpit-ai/shared-types';
import { SongDatabase } from './SongDatabase.js';
import { LyricMatcher, LyricMatchEvaluation } from './LyricMatcher.js';
import { ConsecutiveEvidenceTracker } from './ConsecutiveEvidenceTracker.js';

export interface SongCandidateGeneratorOptions {
  cooldownMs?: number; // Minimum ms between identical song suggestions (default 12000)
  minConfidence?: number; // Minimum confidence to emit suggestion (default 0.70)
}

export type SongCandidateListener = (candidate: SuggestionCandidate) => void;
export type SongEvaluationListener = (evalRes: LyricMatchEvaluation) => void;

export class SongCandidateGenerator {
  private readonly cooldownMs: number;
  private readonly minConfidence: number;
  private matcher: LyricMatcher;
  private lastEmittedSongTime: Map<string, number> = new Map();

  private candidateListeners: Set<SongCandidateListener> = new Set();
  private evaluationListeners: Set<SongEvaluationListener> = new Set();

  constructor(
    private database: SongDatabase,
    matcherOrOptions?: LyricMatcher | SongCandidateGeneratorOptions,
    options?: SongCandidateGeneratorOptions
  ) {
    if (matcherOrOptions instanceof LyricMatcher) {
      this.matcher = matcherOrOptions;
      this.cooldownMs = options?.cooldownMs ?? 12000;
      this.minConfidence = options?.minConfidence ?? 0.70;
    } else {
      const opts = (matcherOrOptions as SongCandidateGeneratorOptions) || options || {};
      this.matcher = new LyricMatcher(database, new ConsecutiveEvidenceTracker());
      this.cooldownMs = opts.cooldownMs ?? 12000;
      this.minConfidence = opts.minConfidence ?? 0.70;
    }
  }

  public getLyricMatcher(): LyricMatcher {
    return this.matcher;
  }

  /**
   * Registers a listener for emitted song candidates.
   */
  public onCandidate(listener: SongCandidateListener): () => void {
    this.candidateListeners.add(listener);
    return () => this.candidateListeners.delete(listener);
  }

  /**
   * Registers a listener for all lyric evaluation events (including suppressed/ambiguous ones).
   */
  public onEvaluation(listener: SongEvaluationListener): () => void {
    this.evaluationListeners.add(listener);
    return () => this.evaluationListeners.delete(listener);
  }

  /**
   * Ingests a transcribed speech/singing segment and generates a SuggestionCandidate if a match is found.
   */
  public processTranscript(
    transcript: string,
    isSinging = false,
    now: number = Date.now()
  ): SuggestionCandidate | null {
    const evalRes = this.matcher.evaluateTranscript(transcript, isSinging, now);

    for (const listener of this.evaluationListeners) {
      listener(evalRes);
    }

    if (!evalRes.matchFound || !evalRes.topCandidate) {
      return null;
    }

    const cand = evalRes.topCandidate;

    // Check minimum confidence threshold
    if (cand.confidence < this.minConfidence) {
      return null;
    }

    // Cooldown check for this song
    const lastEmitted = this.lastEmittedSongTime.get(cand.song.id) || 0;
    if (now - lastEmitted < this.cooldownMs) {
      return null;
    }

    // Format content preview from section lines
    const contentPreview = cand.section.lines.slice(0, 3).join('\n');

    const command: FreeShowCommand = {
      action: 'start_show',
      data: {
        name: cand.song.canonicalTitle,
        slide: cand.section.label,
        index: cand.section.sequenceOrder - 1
      },
      source: 'ai',
      correlationId: `ai_song_${now}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now
    };

    const candidate: SuggestionCandidate = {
      id: `cand_song_${now}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'song',
      title: `${cand.song.canonicalTitle} (${cand.version.versionName}) - ${cand.section.label}`,
      contentPreview,
      confidence: cand.confidence,
      evidence: `${cand.explanation} ${isSinging ? '[Acoustic Audio Mode: Singing]' : '[Acoustic Audio Mode: Spoken]'}`,
      detectedAt: now,
      status: 'pending',
      actionPayload: command
    };

    this.lastEmittedSongTime.set(cand.song.id, now);

    for (const listener of this.candidateListeners) {
      listener(candidate);
    }

    return candidate;
  }
}
