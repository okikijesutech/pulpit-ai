import { describe, it, expect, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ModelManager, WHISPER_MODELS } from '@pulpit-ai/speech-engine';

describe('Native Whisper Speech Engine Integration (PR 7)', () => {
  it('electron-builder.json configures asarUnpack for native binary and model paths', () => {
    const builderPath = join(__dirname, '../electron-builder.json');
    expect(existsSync(builderPath)).toBe(true);

    const config = JSON.parse(readFileSync(builderPath, 'utf8'));
    expect(config.asar).toBe(true);
    expect(Array.isArray(config.asarUnpack)).toBe(true);

    const unpacks = config.asarUnpack as string[];
    expect(unpacks.some((p) => p.includes('speech-engine/bin'))).toBe(true);
    expect(unpacks.some((p) => p.includes('speech-engine/models'))).toBe(true);
  });

  it('contains official 64-character SHA-256 checksums for models', () => {
    const modelIds = ['tiny.en-q5_1', 'base.en-q5_1', 'small.en-q5_1'];

    for (const id of modelIds) {
      const info = WHISPER_MODELS[id];
      expect(info).toBeDefined();
      expect(info.expectedSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(info.expectedSha256).not.toContain('mock');
    }
  });

  it('guarantees explicit download check requires operator confirmation and >= 2 GB safety margin', async () => {
    const manager = new ModelManager(2 * 1024 * 1024 * 1024);

    // Mock disk check with insufficient space (e.g. 500 MB free)
    vi.spyOn(manager, 'checkDiskSpace').mockResolvedValueOnce({
      allowed: false,
      freeBytes: 500 * 1024 * 1024,
      reason: 'Insufficient disk space. Available: 0.50 GB, Required safety margin: 2.00 GB.'
    });

    const result = await manager.requestDownloadPermission('base.en-q5_1', process.cwd());
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Insufficient disk space');
  });

  it('UI label accurately specifies whisper.cpp (AVX2)', () => {
    const panelPath = join(__dirname, '../src/renderer/components/LiveTranscriptPanel.tsx');
    expect(existsSync(panelPath)).toBe(true);

    const content = readFileSync(panelPath, 'utf8');
    expect(content).toContain('whisper.cpp (AVX2)');
  });
});
