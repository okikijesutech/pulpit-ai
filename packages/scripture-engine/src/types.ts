import { ScriptureReference } from '@pulpit-ai/shared-types';

export interface TranslationMetadata {
  id: string; // e.g. 'WEB', 'KJV'
  name: string; // 'World English Bible', 'King James Version'
  abbreviation: string; // 'WEB', 'KJV'
  language: string; // 'en'
  source?: string;
  edition?: string;
  copyright: string; // 'Public Domain'
  license: string; // 'Public Domain'
  attribution: string; // 'World English Bible (WEB) — Dedicated to the Public Domain'
  redistributionStatus: 'unrestricted' | 'church_internal' | 'restricted';
  checksum?: string;
  verificationStatus: 'verified' | 'unverified';
  importedAt: number;
}

export interface ScriptureVerseRecord {
  translationId: string;
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface ScripturePassageResult {
  found: boolean;
  reference: ScriptureReference;
  translation: TranslationMetadata;
  verses: ScriptureVerseRecord[];
  fullText: string;
  formattedText: string;
  attribution: string;
}

export interface TranslationPackage {
  metadata: TranslationMetadata;
  verses: ScriptureVerseRecord[];
}
