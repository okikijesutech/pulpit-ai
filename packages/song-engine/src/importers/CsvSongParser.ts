/**
 * Comma-Separated Values (CSV) Song Parser.
 *
 * Implements RFC 4180 compliant CSV parsing with support for:
 * - One-row-per-song format (title, author, lyrics)
 * - Multi-row relational format (title, section, lyric lines)
 * - Configurable column header mapping and validation of malformed fields.
 */

import { SongSectionType } from '@pulpit-ai/shared-types';
import { ParsedSectionDraft, ParsedSongDraft } from './types.js';
import { FileSecurityValidator } from './FileSecurityValidator.js';

export class CsvSongParser {
  /**
   * Parses CSV string into an array of Song drafts.
   */
  public static parse(content: string, fileName: string): ParsedSongDraft[] {
    const sanitized = FileSecurityValidator.sanitizeText(content);
    const rows = this.parseCsvRows(sanitized);

    if (rows.length < 2) {
      throw new Error('CSV must contain at least a header row and one data row.');
    }

    const headers = rows[0].map(h => h.trim().toLowerCase());
    const titleCol = this.findColumnIndex(headers, ['title', 'song', 'song_title', 'name']);
    const authorCol = this.findColumnIndex(headers, ['author', 'writer', 'composer', 'artist']);
    const lyricsCol = this.findColumnIndex(headers, ['lyrics', 'lyric', 'text', 'content', 'words']);
    const sectionCol = this.findColumnIndex(headers, ['section', 'section_type', 'type', 'label']);
    const copyrightCol = this.findColumnIndex(headers, ['copyright', 'license', 'ccli']);

    if (titleCol === -1 || lyricsCol === -1) {
      throw new Error(
        `CSV is missing required columns. Must include at least 'title' and 'lyrics' headers. Found: [${headers.join(', ')}]`
      );
    }

    // Check if CSV is Mode B (multi-row per song with section column) or Mode A (one row per song)
    const isMultiRowRelational = sectionCol !== -1;

    if (!isMultiRowRelational) {
      // Mode A: One row per song
      const drafts: ParsedSongDraft[] = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (row.length <= titleCol || !row[titleCol].trim()) continue;

        const title = row[titleCol].trim();
        const author = authorCol !== -1 && row[authorCol] ? row[authorCol].trim() : undefined;
        const copyright = copyrightCol !== -1 && row[copyrightCol] ? row[copyrightCol].trim() : undefined;
        const rawLyrics = row[lyricsCol] || '';

        const sections = this.splitLyricsIntoSections(rawLyrics);

        drafts.push({
          title,
          author,
          copyright,
          sections,
          sourceFormat: 'csv',
          sourceFileName: fileName
        });
      }
      return drafts;
    } else {
      // Mode B: Multiple rows grouped by song title
      const songMap = new Map<
        string,
        {
          title: string;
          author?: string;
          copyright?: string;
          sections: ParsedSectionDraft[];
        }
      >();

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (row.length <= titleCol || !row[titleCol].trim()) continue;

        const title = row[titleCol].trim();
        const author = authorCol !== -1 && row[authorCol] ? row[authorCol].trim() : undefined;
        const copyright = copyrightCol !== -1 && row[copyrightCol] ? row[copyrightCol].trim() : undefined;
        const rawSection = row[sectionCol] ? row[sectionCol].trim() : 'Verse';
        const rawLyrics = row[lyricsCol] || '';

        let songEntry = songMap.get(title.toLowerCase());
        if (!songEntry) {
          songEntry = {
            title,
            author,
            copyright,
            sections: []
          };
          songMap.set(title.toLowerCase(), songEntry);
        }

        const lines = rawLyrics
          .split(/\r?\n/)
          .map(l => l.trim())
          .filter(l => l.length > 0);

        if (lines.length > 0) {
          songEntry.sections.push({
            type: this.mapSectionType(rawSection),
            label: rawSection,
            lines
          });
        }
      }

      return Array.from(songMap.values()).map(s => ({
        title: s.title,
        author: s.author,
        copyright: s.copyright,
        sections: s.sections,
        sourceFormat: 'csv',
        sourceFileName: fileName
      }));
    }
  }

  /**
   * RFC 4180 CSV line parser supporting quoted fields, newlines, and escaped quotes ("").
   */
  private static parseCsvRows(text: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = i + 1 < text.length ? text[i + 1] : '';

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentField);
        currentField = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n in CRLF
        }
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.some(f => f.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField);
      if (currentRow.some(f => f.trim().length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  private static findColumnIndex(headers: string[], candidates: string[]): number {
    for (let i = 0; i < headers.length; i++) {
      const cleanHeader = headers[i].replace(/[_\s-]/g, '').toLowerCase();
      for (const cand of candidates) {
        const cleanCand = cand.replace(/[_\s-]/g, '').toLowerCase();
        if (cleanHeader === cleanCand) return i;
      }
    }
    return -1;
  }

  private static splitLyricsIntoSections(rawLyrics: string): ParsedSectionDraft[] {
    const lines = rawLyrics.split(/\r?\n/).map(l => l.trim());
    const sections: ParsedSectionDraft[] = [];
    let currentLines: string[] = [];
    let sectionCount = 1;

    for (const line of lines) {
      if (!line) {
        if (currentLines.length > 0) {
          sections.push({
            type: 'verse',
            label: `Verse ${sectionCount++}`,
            lines: currentLines
          });
          currentLines = [];
        }
      } else {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 0) {
      sections.push({
        type: 'verse',
        label: `Verse ${sectionCount}`,
        lines: currentLines
      });
    }

    return sections;
  }

  private static mapSectionType(raw: string): SongSectionType {
    const lower = raw.toLowerCase();
    if (lower.includes('chorus') && !lower.includes('pre')) return 'chorus';
    if (lower.includes('pre-chorus') || lower.includes('prechorus')) return 'pre_chorus';
    if (lower.includes('bridge')) return 'bridge';
    if (lower.includes('tag')) return 'tag';
    if (lower.includes('refrain')) return 'refrain';
    if (lower.includes('intro')) return 'intro';
    if (lower.includes('outro')) return 'outro';
    return 'verse';
  }
}
