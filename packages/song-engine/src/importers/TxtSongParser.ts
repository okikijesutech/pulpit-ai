/**
 * Plain Text (TXT) Song Lyric Parser.
 *
 * Supports UTF-8 encoded plain text, section header markers ([Verse 1], [Chorus]),
 * blank-line paragraph separation, and author/title metadata extraction.
 */

import { SongSectionType } from '@pulpit-ai/shared-types';
import { ParsedSectionDraft, ParsedSongDraft } from './types.js';
import { FileSecurityValidator } from './FileSecurityValidator.js';

export class TxtSongParser {
  private static SECTION_HEADER_REGEX =
    /^(?:\[\s*|\(\s*|)?(verse\s*\d*|chorus\s*\d*|bridge\s*\d*|pre-?chorus\s*\d*|tag\s*\d*|refrain\s*\d*|intro\s*\d*|outro\s*\d*)(?:\s*\]|\s*\)|\s*:)?$/i;

  public static parse(content: string, fileName: string): ParsedSongDraft {
    const sanitized = FileSecurityValidator.sanitizeText(content);
    const rawLines = sanitized.split(/\r?\n/);

    let title = '';
    let author = '';
    let copyright = '';
    const warnings: string[] = [];

    // Strip default file extension for fallback title
    const defaultTitle = fileName.replace(/\.[^/.]+$/, '').trim();

    const sections: ParsedSectionDraft[] = [];
    let currentSection: ParsedSectionDraft | null = null;
    let pendingLines: string[] = [];
    let lineIdx = 0;

    // 1. Scan top lines for metadata headers (e.g. Title:, Author:, Copyright:)
    while (lineIdx < rawLines.length) {
      const line = rawLines[lineIdx].trim();
      if (!line) {
        lineIdx++;
        continue;
      }

      if (/^title\s*:\s*(.+)$/i.test(line)) {
        title = line.replace(/^title\s*:\s*/i, '').trim();
        lineIdx++;
      } else if (/^author\s*:\s*(.+)$/i.test(line) || /^by\s*:\s*(.+)$/i.test(line)) {
        author = line.replace(/^(?:author|by)\s*:\s*/i, '').trim();
        lineIdx++;
      } else if (/^copyright\s*:\s*(.+)$/i.test(line) || /^ccli\s*:\s*(.+)$/i.test(line)) {
        copyright = line.replace(/^(?:copyright|ccli)\s*:\s*/i, '').trim();
        lineIdx++;
      } else {
        // First non-metadata line encountered
        break;
      }
    }

    // If title was not found via header, check if first line looks like a title
    if (!title && lineIdx < rawLines.length) {
      const firstLine = rawLines[lineIdx].trim();
      const nextLine = lineIdx + 1 < rawLines.length ? rawLines[lineIdx + 1].trim() : '';
      if (!this.SECTION_HEADER_REGEX.test(firstLine) && (!nextLine || this.SECTION_HEADER_REGEX.test(nextLine))) {
        title = firstLine;
        lineIdx++;
      } else {
        title = defaultTitle;
      }
    } else if (!title) {
      title = defaultTitle;
    }

    // 2. Parse body into sections
    for (; lineIdx < rawLines.length; lineIdx++) {
      const line = rawLines[lineIdx].trim();

      if (!line) {
        // Blank line: close pending section
        if (currentSection) {
          if (pendingLines.length > 0) {
            currentSection.lines.push(...pendingLines);
            pendingLines = [];
          }
          if (currentSection.lines.length > 0) {
            sections.push(currentSection);
            currentSection = null;
          }
        }
        continue;
      }

      // Check for section header
      const headerMatch = this.SECTION_HEADER_REGEX.exec(line);
      if (headerMatch) {
        // Flush previous section
        if (currentSection) {
          if (pendingLines.length > 0) {
            currentSection.lines.push(...pendingLines);
            pendingLines = [];
          }
          if (currentSection.lines.length > 0) {
            sections.push(currentSection);
          }
        }

        const rawType = headerMatch[1].toLowerCase();
        const sectionType = this.mapSectionType(rawType);
        const label = line.replace(/[[\]()]/g, '').trim();

        currentSection = {
          type: sectionType,
          label: label || 'Verse',
          lines: []
        };
      } else {
        // Ordinary lyric line
        if (!currentSection) {
          currentSection = {
            type: 'verse',
            label: `Verse ${sections.length + 1}`,
            lines: []
          };
        }
        pendingLines.push(line);
      }
    }

    // Flush final section
    if (currentSection) {
      if (pendingLines.length > 0) {
        currentSection.lines.push(...pendingLines);
      }
      if (currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
    }

    if (sections.length === 0) {
      if (title && title !== defaultTitle) {
        sections.push({
          type: 'verse',
          label: 'Verse 1',
          lines: [title]
        });
        title = defaultTitle;
      } else {
        warnings.push('No lyric sections could be extracted from the file.');
      }
    }

    return {
      title,
      author: author || undefined,
      copyright: copyright || undefined,
      sections,
      sourceFormat: 'txt',
      sourceFileName: fileName,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  private static mapSectionType(raw: string): SongSectionType {
    if (raw.includes('chorus') && !raw.includes('pre')) return 'chorus';
    if (raw.includes('pre-chorus') || raw.includes('prechorus')) return 'pre_chorus';
    if (raw.includes('bridge')) return 'bridge';
    if (raw.includes('tag')) return 'tag';
    if (raw.includes('refrain')) return 'refrain';
    if (raw.includes('intro')) return 'intro';
    if (raw.includes('outro')) return 'outro';
    return 'verse';
  }
}
