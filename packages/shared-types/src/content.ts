/**
 * Domain types for Scripture, Songs, and Suggestion Candidates.
 */

import { FreeShowCommand } from './freeshow.js';

export interface ScriptureReference {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  translation: string;
  rawSpokenText: string;
}

export interface ScriptureVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
}

export interface SongMatch {
  songId: string;
  title: string;
  version?: string;
  author?: string;
  matchedLines: string[];
  confidence: number;
}

export type CandidateStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'dismissed'
  | 'expired';

export interface SuggestionCandidate {
  id: string;
  type: 'scripture' | 'song';
  title: string;
  contentPreview: string;
  confidence: number;
  evidence: string;
  detectedAt: number;
  actionPayload: FreeShowCommand;
  status: CandidateStatus;
}
