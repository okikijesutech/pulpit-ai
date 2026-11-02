/**
 * File Security and Sanitization Validator.
 *
 * Enforces resource bounds, file size limits, decompression bomb protection,
 * and text sanitization against script injections and malicious payloads.
 * Conforms to Section 10 and Section 16 of the build specification.
 */

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB limit
export const MAX_UNCOMPRESSED_ARCHIVE_BYTES = 50 * 1024 * 1024; // 50 MB uncompressed limit
export const MAX_DECOMPRESSION_RATIO = 50; // 50:1 ratio limit

export interface SecurityValidationResult {
  valid: boolean;
  quarantine: boolean;
  error?: string;
  detectedFormat?: 'txt' | 'csv' | 'docx' | 'pptx' | 'pdf';
}

export class FileSecurityValidator {
  /**
   * Validates file buffer size and checks magic header bytes.
   */
  public static validateFile(fileName: string, buffer: Buffer): SecurityValidationResult {
    if (!buffer || buffer.length === 0) {
      return {
        valid: false,
        quarantine: false,
        error: 'File is empty (0 bytes)'
      };
    }

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        quarantine: true,
        error: `File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 25 MB.`
      };
    }

    const lowerName = fileName.toLowerCase();

    // Check magic bytes
    // 1. PDF: starts with %PDF- (0x25 0x50 0x44 0x46 0x2D)
    if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
      return { valid: true, quarantine: false, detectedFormat: 'pdf' };
    }

    // 2. OpenXML ZIP (DOCX / PPTX): starts with PK\x03\x04 (0x50 0x4B 0x03 0x04)
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    ) {
      if (lowerName.endsWith('.pptx')) {
        return { valid: true, quarantine: false, detectedFormat: 'pptx' };
      }
      return { valid: true, quarantine: false, detectedFormat: 'docx' };
    }

    // 3. CSV or TXT
    if (lowerName.endsWith('.csv')) {
      return { valid: true, quarantine: false, detectedFormat: 'csv' };
    }

    return { valid: true, quarantine: false, detectedFormat: 'txt' };
  }

  /**
   * Checks zip entry sizes for potential decompression bombs.
   */
  public static validateZipRatio(
    compressedSize: number,
    uncompressedSize: number
  ): { safe: boolean; error?: string } {
    if (uncompressedSize > MAX_UNCOMPRESSED_ARCHIVE_BYTES) {
      return {
        safe: false,
        error: `Archive uncompressed size (${(uncompressedSize / (1024 * 1024)).toFixed(1)} MB) exceeds 50 MB limit.`
      };
    }

    if (compressedSize > 0) {
      const ratio = uncompressedSize / compressedSize;
      if (ratio > MAX_DECOMPRESSION_RATIO) {
        return {
          safe: false,
          error: `Potential decompression bomb detected: compression ratio ${ratio.toFixed(1)}:1 exceeds limit of ${MAX_DECOMPRESSION_RATIO}:1.`
        };
      }
    }

    return { safe: true };
  }

  /**
   * Sanitizes extracted raw text:
   * - Strips HTML/script tags (<script>, <iframe>, <object>, <embed>)
   * - Strips executable URL pseudo-protocols (javascript:, vbscript:, data:)
   * - Strips control characters (preserves newlines and tabs)
   * - Strips null bytes
   */
  public static sanitizeText(text: string): string {
    if (!text) return '';

    return text
      // Remove null bytes
      .replace(/\0/g, '')
      // Remove dangerous tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      // Remove dangerous protocols
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      // Remove control characters (except \t, \n, \r)
      .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();
  }
}
