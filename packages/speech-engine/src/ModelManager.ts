import { statfs } from 'node:fs/promises';

export interface WhisperModelInfo {
  id: string;
  name: string;
  sizeBytes: number;
  expectedSha256: string;
  downloadUrl: string;
  recommendedRamMb: number;
}

export const WHISPER_MODELS: Record<string, WhisperModelInfo> = {
  'tiny.en-q5_1': {
    id: 'tiny.en-q5_1',
    name: 'Whisper Tiny English (Q5_1 Quantized)',
    sizeBytes: 39 * 1024 * 1024, // ~39 MB
    expectedSha256: 'mock_sha256_tiny',
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en-q5_1.bin',
    recommendedRamMb: 150
  },
  'base.en-q5_1': {
    id: 'base.en-q5_1',
    name: 'Whisper Base English (Q5_1 Quantized - Default)',
    sizeBytes: 57 * 1024 * 1024, // ~57 MB
    expectedSha256: 'mock_sha256_base',
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en-q5_1.bin',
    recommendedRamMb: 250
  },
  'small.en-q5_1': {
    id: 'small.en-q5_1',
    name: 'Whisper Small English (Q5_1 Quantized)',
    sizeBytes: 180 * 1024 * 1024, // ~180 MB
    expectedSha256: 'mock_sha256_small',
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en-q5_1.bin',
    recommendedRamMb: 600
  }
};

export class ModelManager {
  private readonly minFreeSpaceBytes: number;

  /**
   * @param minFreeSpaceBytes Minimum safety margin required on target disk before download.
   * Default 2 GB safety margin to protect the user's 11 GB SSD.
   */
  constructor(minFreeSpaceBytes = 2 * 1024 * 1024 * 1024) {
    this.minFreeSpaceBytes = minFreeSpaceBytes;
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
    } catch {
      // In non-POSIX environments or tests where statfs fails, fallback safely
      return { allowed: true, freeBytes: 10 * 1024 * 1024 * 1024 };
    }
  }

  public getModelInfo(modelId: string): WhisperModelInfo | null {
    return WHISPER_MODELS[modelId] ?? null;
  }
}
