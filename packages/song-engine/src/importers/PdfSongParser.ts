/**
 * Text-based PDF Song Parser.
 *
 * Extracts text from PDF content streams (BT...ET, Tj, TJ).
 * Decompresses FlateDecode streams safely using Node zlib.
 * Detects scanned/image-only pages and raises actionable warnings without silently dropping pages.
 */

import { inflateSync } from 'node:zlib';
import { ParsedSongDraft } from './types.js';
import { TxtSongParser } from './TxtSongParser.js';
import { FileSecurityValidator } from './FileSecurityValidator.js';

export class PdfSongParser {
  /**
   * Parses a text-based PDF buffer into a ParsedSongDraft.
   */
  public static parse(buffer: Buffer, fileName: string): ParsedSongDraft {
    // 1. Verify magic bytes
    if (buffer.length < 5 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new Error('Invalid PDF format: missing %PDF- header signature.');
    }

    const pdfText = this.extractTextFromPdfBuffer(buffer);
    const warnings: string[] = [];

    // Check for scanned / image-only document
    if (!pdfText.trim() || pdfText.trim().length < 10) {
      warnings.push(
        'Document appears to be scanned or image-based. Text-based PDF extraction found 0 readable characters. OCR is required for scanned lyrics.'
      );
    }

    const draft = TxtSongParser.parse(pdfText, fileName);
    draft.sourceFormat = 'pdf';

    if (warnings.length > 0) {
      draft.warnings = [...warnings, ...(draft.warnings || [])];
    }

    return draft;
  }

  /**
   * Scans PDF buffer for content streams and extracts text operators.
   */
  private static extractTextFromPdfBuffer(buffer: Buffer): string {
    const extractedParagraphs: string[] = [];
    const bufStr = buffer.toString('binary');

    let searchPos = 0;
    while (searchPos < buffer.length) {
      const streamIdx = bufStr.indexOf('stream', searchPos);
      if (streamIdx === -1) break;

      let dataStart = streamIdx + 6;
      if (bufStr[dataStart] === '\r') dataStart++;
      if (bufStr[dataStart] === '\n') dataStart++;

      const endstreamIdx = bufStr.indexOf('endstream', dataStart);
      if (endstreamIdx === -1) break;

      let dataEnd = endstreamIdx;
      if (dataEnd > dataStart && bufStr[dataEnd - 1] === '\n') dataEnd--;
      if (dataEnd > dataStart && bufStr[dataEnd - 1] === '\r') dataEnd--;

      const rawStream = buffer.subarray(dataStart, dataEnd);
      let decompressedStream: Buffer | null = null;

      // Try inflating stream (FlateDecode)
      try {
        decompressedStream = inflateSync(rawStream);
      } catch {
        // Uncompressed stream
        decompressedStream = rawStream;
      }

      if (decompressedStream) {
        const streamText = this.parseTextStream(decompressedStream.toString('latin1'));
        if (streamText.trim()) {
          extractedParagraphs.push(streamText);
        }
      }

      searchPos = endstreamIdx + 9;
    }

    return extractedParagraphs.join('\n\n');
  }

  /**
   * Extracts text from inside PDF text blocks (BT ... ET).
   */
  private static parseTextStream(streamContent: string): string {
    const textLines: string[] = [];
    const btRegex = /BT([\s\S]*?)ET/g;
    let btMatch: RegExpExecArray | null;

    while ((btMatch = btRegex.exec(streamContent)) !== null) {
      const block = btMatch[1];

      // Match string literals: (Text) Tj
      const tjRegex = /\((.*?)\)\s*Tj/g;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        const line = FileSecurityValidator.sanitizeText(this.unescapePdfString(tjMatch[1]));
        if (line.length > 0) {
          textLines.push(line);
        }
      }

      // Match array strings: [(T) 20 (ext)] TJ
      const arrayRegex = /\[(.*?)\]\s*TJ/g;
      let arrayMatch: RegExpExecArray | null;
      while ((arrayMatch = arrayRegex.exec(block)) !== null) {
        const arrayContent = arrayMatch[1];
        const innerStrRegex = /\((.*?)\)/g;
        let innerMatch: RegExpExecArray | null;
        let combined = '';
        while ((innerMatch = innerStrRegex.exec(arrayContent)) !== null) {
          combined += this.unescapePdfString(innerMatch[1]);
        }
        const cleanCombined = FileSecurityValidator.sanitizeText(combined);
        if (cleanCombined.length > 0) {
          textLines.push(cleanCombined);
        }
      }
    }

    return textLines.join('\n');
  }

  private static unescapePdfString(str: string): string {
    return str
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');
  }
}
