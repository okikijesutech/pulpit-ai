/**
 * Microsoft Word (DOCX) Song Parser.
 *
 * Securely extracts text from OpenXML package (word/document.xml).
 * Strictly prevents macro execution, link injection, and decompression bombs.
 */

import { ParsedSongDraft } from './types.js';
import { SafeZipReader } from './SafeZipReader.js';
import { TxtSongParser } from './TxtSongParser.js';
import { FileSecurityValidator } from './FileSecurityValidator.js';

export class DocxSongParser {
  /**
   * Parses a DOCX binary buffer into a ParsedSongDraft.
   */
  public static parse(buffer: Buffer, fileName: string): ParsedSongDraft {
    const entries = SafeZipReader.readEntries(buffer);
    const docXmlBuffer = entries.get('word/document.xml');

    if (!docXmlBuffer) {
      throw new Error('Invalid DOCX format: missing word/document.xml in OpenXML archive.');
    }

    const xmlStr = docXmlBuffer.toString('utf8');
    const text = this.extractTextFromDocxXml(xmlStr);

    if (!text.trim()) {
      throw new Error('DOCX document contains no readable text content.');
    }

    const draft = TxtSongParser.parse(text, fileName);
    draft.sourceFormat = 'docx';
    return draft;
  }

  /**
   * Safely extracts text from WordprocessingML XML without executing external links or entities.
   */
  private static extractTextFromDocxXml(xml: string): string {
    const paragraphs: string[] = [];

    // Match paragraph tags: <w:p> ... </w:p>
    const pRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/gis;
    let pMatch: RegExpExecArray | null;

    while ((pMatch = pRegex.exec(xml)) !== null) {
      const pContent = pMatch[1];
      const tRegex = /<w:t\b[^>]*>(.*?)<\/w:t>/gis;
      let tMatch: RegExpExecArray | null;
      let paragraphText = '';

      while ((tMatch = tRegex.exec(pContent)) !== null) {
        paragraphText += tMatch[1];
      }

      // Decode standard XML entities
      paragraphText = paragraphText
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");

      paragraphs.push(FileSecurityValidator.sanitizeText(paragraphText));
    }

    return paragraphs.join('\n');
  }
}
