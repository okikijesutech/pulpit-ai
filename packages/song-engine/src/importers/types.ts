import { SongSectionType } from '@pulpit-ai/shared-types';

export interface ParsedSectionDraft {
  type: SongSectionType;
  label: string;
  lines: string[];
}

export interface ParsedSongDraft {
  title: string;
  alternativeTitles?: string[];
  author?: string;
  copyright?: string;
  license?: string;
  language?: string;
  sections: ParsedSectionDraft[];
  sourceFormat: 'txt' | 'csv' | 'docx' | 'pptx' | 'pdf';
  sourceFileName: string;
  warnings?: string[];
}

export interface ImportResult {
  success: boolean;
  songs: ParsedSongDraft[];
  errors: string[];
  warnings: string[];
  quarantined: boolean;
}
