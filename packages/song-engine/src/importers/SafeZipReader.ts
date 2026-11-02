/**
 * Safe, In-Memory OpenXML ZIP Archive Reader.
 *
 * Designed specifically for sandboxed extraction of Office OpenXML documents (DOCX and PPTX).
 * Enforces zip-bomb protection, decompression ratio bounds, and macro quarantine.
 * Uses native Node zlib without external dependencies.
 */

import { inflateRawSync } from 'node:zlib';
import { FileSecurityValidator } from './FileSecurityValidator.js';

export interface ZipEntry {
  path: string;
  compressedSize: number;
  uncompressedSize: number;
  data: Buffer;
}

export class SafeZipReader {
  /**
   * Reads a ZIP buffer safely and returns extracted files.
   */
  public static readEntries(buffer: Buffer): Map<string, Buffer> {
    const entries = new Map<string, Buffer>();
    let offset = 0;
    let totalUncompressedSize = 0;

    // Scan for Local File Headers: PK\x03\x04 (0x04034b50 in little endian)
    while (offset + 30 <= buffer.length) {
      const signature = buffer.readUInt32LE(offset);

      // Central Directory Header (PK\x01\x02) or End of Central Directory (PK\x05\x06) means we reached directory
      if (signature === 0x02014b50 || signature === 0x06054b50) {
        break;
      }

      // Check Local File Header signature (0x04034b50)
      if (signature !== 0x04034b50) {
        offset++;
        continue;
      }

      const flags = buffer.readUInt16LE(offset + 6);
      const compressionMethod = buffer.readUInt16LE(offset + 8);
      let compressedSize = buffer.readUInt32LE(offset + 18);
      let uncompressedSize = buffer.readUInt32LE(offset + 22);
      const fileNameLength = buffer.readUInt16LE(offset + 26);
      const extraFieldLength = buffer.readUInt16LE(offset + 28);

      const fileNameOffset = offset + 30;
      const dataOffset = fileNameOffset + fileNameLength + extraFieldLength;

      if (dataOffset > buffer.length) {
        break;
      }

      const fileName = buffer.subarray(fileNameOffset, fileNameOffset + fileNameLength).toString('utf8');

      // Security Check: detect malicious VBA macro binaries in OpenXML
      if (
        fileName.toLowerCase().includes('vbaproject.bin') ||
        fileName.toLowerCase().endsWith('.vbs') ||
        fileName.toLowerCase().endsWith('.exe')
      ) {
        throw new Error(
          `Security violation: Active macro or executable binary detected in archive: "${fileName}". Quarantining file.`
        );
      }

      // If streaming data descriptor flag is set (bit 3), inspect central directory or jump safely
      if ((flags & 0x08) !== 0 && compressedSize === 0) {
        // Fall back to central directory scan if needed
        offset = dataOffset;
        continue;
      }

      // Validate decompression ratio against zip bomb attack
      const ratioCheck = FileSecurityValidator.validateZipRatio(compressedSize, uncompressedSize);
      if (!ratioCheck.safe) {
        throw new Error(`Zip bomb mitigation triggered: ${ratioCheck.error}`);
      }

      totalUncompressedSize += uncompressedSize;
      const totalRatioCheck = FileSecurityValidator.validateZipRatio(buffer.length, totalUncompressedSize);
      if (!totalRatioCheck.safe) {
        throw new Error(`Zip bomb mitigation triggered: ${totalRatioCheck.error}`);
      }

      if (dataOffset + compressedSize > buffer.length) {
        break;
      }

      const compressedData = buffer.subarray(dataOffset, dataOffset + compressedSize);
      let decompressedData: Buffer;

      if (compressionMethod === 0) {
        // Stored (no compression)
        decompressedData = Buffer.from(compressedData);
      } else if (compressionMethod === 8) {
        // Deflated
        try {
          decompressedData = inflateRawSync(compressedData);
        } catch (err: any) {
          throw new Error(`Failed to decompress entry "${fileName}": ${err.message}`);
        }
      } else {
        // Unsupported compression method
        offset = dataOffset + compressedSize;
        continue;
      }

      entries.set(fileName, decompressedData);
      offset = dataOffset + compressedSize;
    }

    return entries;
  }
}
