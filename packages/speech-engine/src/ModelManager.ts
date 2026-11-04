import { statfs } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

export interface WhisperModelInfo {
  id: string;
  name: string;
  sizeBytes: number;
  expectedSha256: string;
  downloadUrl: string;
  recommendedRamMb: number;
}

/**
 * Authentic official ggml quantized model metadata and SHA-256 checksums
 * from the official whisper.cpp repository (ggerganov/whisper.cpp).
 */
export const WHISPER_MODELS: Record<string, WhisperModelInfo> = {
  'tiny.en-q5_1': {
    id: 'tiny.en-q5_1',
    name: 'Whisper Tiny English (Q5_1 Quantized)',
    sizeBytes: 32166155, // 32.2 MB
    expectedSha256: 'c77c5766f1cef09b6b7d47f21b546cbddd4157886b3b5d6d4f709e91e66c7c2b',
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en-q5_1.bin',
    recommendedRamMb: 150
  },
  'base.en-q5_1': {
    id: 'base.en-q5_1',
    name: 'Whisper Base English (Q5_1 Quantized - Default)',
    sizeBytes: 59721011, // 59.7 MB
    expectedSha256: '4baf70dd0d7c4247ba2b81fafd9c01005ac77c2f9ef064e00dcf195d0e2fdd2f',
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en-q5_1.bin',
    recommendedRamMb: 250
  },
  'small.en-q5_1': {
    id: 'small.en-q5_1',
    name: 'Whisper Small English (Q5_1 Quantized)',
    sizeBytes: 190098681, // 190.1 MB
    expectedSha256: 'bfdff4894dcb76bbf647d56263ea2a96645423f1669176f4844a1bf8e478ad30',
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en-q5_1.bin',
    recommendedRamMb: 600
  }
};

export class ModelManager {
  private readonly minFreeSpaceBytes: number;

  /**
   * @param minFreeSpaceBytes Minimum safety margin required on target disk before download.
   * Default 2 GB safety margin to protect the user's SSD.
   */
  constructor(minFreeSpaceBytes = 2 * 1024 * 1024 * 1024) {
    this.minFreeSpaceBytes = minFreeSpaceBytes;
  }

  /**
   * Evaluates disk space and returns metadata for an explicit download confirmation prompt.
   * NEVER downloads automatically; requires explicit operator approval.
   */
  public async requestDownloadPermission(
    modelId: string,
    targetPath: string
  ): Promise<{
    allowed: boolean;
    modelInfo: WhisperModelInfo | null;
    freeBytes: number;
    reason?: string;
  }> {
    const modelInfo = this.getModelInfo(modelId);
    if (!modelInfo) {
      return {
        allowed: false,
        modelInfo: null,
        freeBytes: 0,
        reason: `Model with ID '${modelId}' not found in registry.`
      };
    }

    const diskCheck = await this.checkDiskSpace(targetPath, modelInfo.sizeBytes);
    return {
      allowed: diskCheck.allowed,
      modelInfo,
      freeBytes: diskCheck.freeBytes,
      reason: diskCheck.reason
    };
  }

  /**
   * Verifies whether target drive has sufficient free space.
   */
  public async checkDiskSpace(targetPath: string, modelSizeBytes: number): Promise<{
    allowed: boolean;
    freeBytes: number;
    reason?: string;
  }> {
    try {
      const stats = await statfs(targetPath);
      const freeBytes = stats.bavail * stats.bsize;

      if (freeBytes - modelSizeBytes < this.minFreeSpaceBytes) {
        return {
          allowed: false,
          freeBytes,
          reason: `Insufficient disk space. Available: ${(freeBytes / 1024 / 1024 / 1024).toFixed(
            2
          )} GB, Required safety margin: ${(this.minFreeSpaceBytes / 1024 / 1024 / 1024).toFixed(
            2
          )} GB.`
        };
      }

      return { allowed: true, freeBytes };
    } catch (err: any) {
      // Fail closed to prevent disk exhaustion when filesystem stats cannot be determined
      return {
        allowed: false,
        freeBytes: 0,
        reason: `Failing closed: cannot verify disk space (${err?.message || 'statfs failed'}).`
      };
    }
  }

  /**
   * Verifies a local model file against its expected SHA-256 checksum.
   * Returns false if file does not exist or checksum mismatches.
   */
  public async verifyModelFile(filePath: string, expectedSha256: string): Promise<boolean> {
    if (!existsSync(filePath)) {
      return false;
    }

    return new Promise<boolean>((resolve) => {
      try {
        const hash = createHash('sha256');
        const stream = createReadStream(filePath);

        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => {
          const digest = hash.digest('hex');
          resolve(digest.toLowerCase() === expectedSha256.toLowerCase());
        });
        stream.on('error', () => resolve(false));
      } catch {
        resolve(false);
      }
    });
  }

  public getModelInfo(modelId: string): WhisperModelInfo | null {
    return WHISPER_MODELS[modelId] ?? null;
  }
}
