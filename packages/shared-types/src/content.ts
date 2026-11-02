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

export type SongSectionType =
  | 'verse'
  | 'chorus'
  | 'bridge'
  | 'pre_chorus'
  | 'tag'
  | 'refrain'
  | 'intro'
  | 'outro';

export interface SongSection {
  id: string;
  type: SongSectionType;
  sequenceOrder: number;
  label: string; // e.g. "Verse 1", "Chorus"
  lines: string[];
}

export interface SongVersion {
  id: string;
  songId: string;
  versionName: string; // e.g. "Standard", "Arrangement 2024"
  key?: string;
  tempo?: number;
  isDefault: boolean;
  sections: SongSection[];
  notes?: string;
}

export interface Song {
  id: string;
  canonicalTitle: string;
  alternativeTitles: string[];
  author?: string;
  copyright?: string;
  license?: string;
  ccliNumber?: string;
  language: string;
  versions: SongVersion[];
  createdAt: number;
  updatedAt: number;
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
