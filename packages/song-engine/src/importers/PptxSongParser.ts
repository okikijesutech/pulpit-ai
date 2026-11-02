/**
 * Microsoft PowerPoint (PPTX) Song Parser.
 *
 * Extracts slide text in natural sequential slide order from ppt/slides/slide*.xml.
 * Maps slides to structured song sections (Verses, Chorus, Bridge).
 */

import { SongSectionType } from '@pulpit-ai/shared-types';
import { ParsedSectionDraft, ParsedSongDraft } from './types.js';
import { SafeZipReader } from './SafeZipReader.js';
import { FileSecurityValidator } from './FileSecurityValidator.js';

export class PptxSongParser {
  public static parse(buffer: Buffer, fileName: string): ParsedSongDraft {
    const entries = SafeZipReader.readEntries(buffer);

    // Collect all slide entries: ppt/slides/slide*.xml
    const slideEntries: { index: number; path: string; data: Buffer }[] = [];
    for (const [path, data] of entries.entries()) {
      const match = /^ppt\/slides\/slide(\d+)\.xml$/i.exec(path);
      if (match) {
        slideEntries.push({
          index: parseInt(match[1], 10),
          path,
          data
        });
      }
    }

    if (slideEntries.length === 0) {
      throw new Error('Invalid PPTX presentation: no slide XML files found in OpenXML archive.');
    }

    // Sort numerically by slide number (1, 2, 3...)
    slideEntries.sort((a, b) => a.index - b.index);

    const defaultTitle = fileName.replace(/\.[^/.]+$/, '').trim();
    let detectedTitle = '';
    const sections: ParsedSectionDraft[] = [];

    for (let i = 0; i < slideEntries.length; i++) {
      const slide = slideEntries[i];
      const xmlStr = slide.data.toString('utf8');
      const lines = this.extractSlideLines(xmlStr);

      if (lines.length === 0) continue;

      // If first slide has only 1-2 short lines and no title detected yet, consider it title slide
      if (i === 0 && lines.length <= 2 && !detectedTitle) {
        detectedTitle = lines[0];
        if (lines.length === 2 && !lines[1].toLowerCase().includes('verse')) {
          // line 2 might be author
        }
        continue;
      }

      // Check if slide header indicates section type (e.g. "Verse 1", "Chorus")
      let sectionType: SongSectionType = 'verse';
      let label = `Slide ${slide.index}`;
      const firstLine = lines[0].toLowerCase();

      if (firstLine.includes('chorus')) {
        sectionType = 'chorus';
        label = lines[0];
        lines.shift();
      } else if (firstLine.includes('bridge')) {
        sectionType = 'bridge';
        label = lines[0];
        lines.shift();
      } else if (firstLine.includes('verse')) {
        sectionType = 'verse';
        label = lines[0];
        lines.shift();
      }

      if (lines.length > 0) {
        sections.push({
          type: sectionType,
          label,
          lines
        });
      }
    }

    return {
      title: detectedTitle || defaultTitle,
      sections,
      sourceFormat: 'pptx',
      sourceFileName: fileName
    };
  }

  private static extractSlideLines(xml: string): string[] {
    const lines: string[] = [];

    // Match paragraph tags: <a:p> ... </a:p>
    const pRegex = /<a:p\b[^>]*>(.*?)<\/a:p>/gis;
    let pMatch: RegExpExecArray | null;

    while ((pMatch = pRegex.exec(xml)) !== null) {
      const pContent = pMatch[1];
      const tRegex = /<a:t\b[^>]*>(.*?)<\/a:t>/gis;
      let tMatch: RegExpExecArray | null;
      let paragraphText = '';

      while ((tMatch = tRegex.exec(pContent)) !== null) {
        paragraphText += tMatch[1];
      }

      // Decode XML entities and sanitize
      paragraphText = paragraphText
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");

      const cleanLine = FileSecurityValidator.sanitizeText(paragraphText);
      if (cleanLine.length > 0) {
        lines.push(cleanLine);
      }
    }

    return lines;
  }
}
