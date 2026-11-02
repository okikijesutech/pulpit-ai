/**
 * Universal Song Import Pipeline.
 *
 * Implements the full pipeline workflow from Section 10 of the spec:
 * Select file -> Validate file -> Resource checks -> Parse safely ->
 * Extract structure/text -> Normalize -> Detect possible songs/sections.
 */

import { ParsedSongDraft, ImportResult } from './types.js';
import { FileSecurityValidator } from './FileSecurityValidator.js';
import { TxtSongParser } from './TxtSongParser.js';
import { CsvSongParser } from './CsvSongParser.js';
import { DocxSongParser } from './DocxSongParser.js';
import { PptxSongParser } from './PptxSongParser.js';
import { PdfSongParser } from './PdfSongParser.js';

export class SongImportPipeline {
  /**
   * Securely imports a file buffer (TXT, CSV, DOCX, PPTX, PDF) and produces parsed song drafts.
   */
  public static async importFile(fileName: string, buffer: Buffer): Promise<ImportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Security & Resource Bounds Validation
    const secResult = FileSecurityValidator.validateFile(fileName, buffer);
    if (!secResult.valid) {
      return {
        success: false,
        songs: [],
        errors: [secResult.error || 'Security validation failed'],
        warnings: [],
        quarantined: secResult.quarantine
      };
    }

    const format = secResult.detectedFormat || 'txt';
    const songs: ParsedSongDraft[] = [];

    // 2. Format-Specific Parsing with error isolation
    try {
      switch (format) {
        case 'txt': {
          const content = buffer.toString('utf8');
          const draft = TxtSongParser.parse(content, fileName);
          songs.push(draft);
          break;
        }

        case 'csv': {
          const content = buffer.toString('utf8');
          const drafts = CsvSongParser.parse(content, fileName);
          songs.push(...drafts);
          break;
        }

        case 'docx': {
          const draft = DocxSongParser.parse(buffer, fileName);
          songs.push(draft);
          break;
        }

        case 'pptx': {
          const draft = PptxSongParser.parse(buffer, fileName);
          songs.push(draft);
          break;
        }

        case 'pdf': {
          const draft = PdfSongParser.parse(buffer, fileName);
          songs.push(draft);
          break;
        }

        default:
          throw new Error(`Unsupported file format: ${format}`);
      }
    } catch (err: any) {
      const isSecurityError = err.message && err.message.toLowerCase().includes('security');
      return {
        success: false,
        songs: [],
        errors: [err.message || 'File parsing failed'],
        warnings,
        quarantined: isSecurityError
      };
    }

    // Collect any parser-generated warnings
    for (const song of songs) {
      if (song.warnings && song.warnings.length > 0) {
        warnings.push(...song.warnings);
      }
    }

    return {
      success: songs.length > 0,
      songs,
      errors,
      warnings,
      quarantined: false
    };
  }
}
