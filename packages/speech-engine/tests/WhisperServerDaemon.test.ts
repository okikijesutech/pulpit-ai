import { describe, it, expect, afterEach } from 'vitest';
import { createServer, Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildWavBuffer,
  findFreeLoopbackPort,
  WhisperServerDaemon,
  WhisperWorkerProcess,
  WHISPER_MODELS,
  CANONICAL_PROMPT_BIAS
} from '../src/index.js';

describe('Phase 1 (v1.1.0): Persistent whisper-server Daemon, Choir Guard & Bloat Removal', () => {
  let mockServer: Server | null = null;

  afterEach(async () => {
    if (mockServer) {
      await new Promise<void>((resolve) => mockServer!.close(() => resolve()));
      mockServer = null;
    }
  });

  it('allocates a free ephemeral IPv4 loopback port dynamically', async () => {
    const port = await findFreeLoopbackPort();
    expect(Number.isInteger(port)).toBe(true);
    expect(port).toBeGreaterThan(1024);
    expect(port).toBeLessThanOrEqual(65535);
  });

  it('builds a valid 16 kHz mono PCM RIFF/WAV buffer purely in memory', () => {
    const samples = new Int16Array([0, 1000, -1000, 16000, -16000]);
    const wav = buildWavBuffer(samples, 16000);

    expect(wav.length).toBe(44 + samples.length * 2);
    expect(wav.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(wav.subarray(8, 12).toString('ascii')).toBe('WAVE');
    expect(wav.readUInt16LE(20)).toBe(1); // PCM
    expect(wav.readUInt16LE(22)).toBe(1); // Mono
    expect(wav.readUInt32LE(24)).toBe(16000); // Sample rate
    expect(wav.readInt16LE(44 + 2)).toBe(1000);
    expect(wav.readInt16LE(44 + 4)).toBe(-1000);
  });

  it('sends zero-disk in-memory multipart audio to persistent whisper-server and parses JSON', async () => {
    const port = await findFreeLoopbackPort();
    let capturedBody = '';

    mockServer = createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }
      if (req.url === '/inference' && req.method === 'POST') {
        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          capturedBody = Buffer.concat(chunks).toString('latin1');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              text: ' Turn with me to Romans chapter 8 verse 28 ',
              confidence: 0.94
            })
          );
        });
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => mockServer!.listen(port, '127.0.0.1', () => resolve()));

    const worker = new WhisperWorkerProcess({
      serverEndpointUrl: `http://127.0.0.1:${port}`
    });
    expect(worker.isServerDaemonReady()).toBe(true);

    // Non-silent audio samples (> 0.002 RMS)
    const activeSamples = new Int16Array(1600);
    for (let i = 0; i < activeSamples.length; i++) {
      activeSamples[i] = Math.round(8000 * Math.sin((2 * Math.PI * 220 * i) / 16000));
    }

    const result = await worker.transcribeSegment({
      id: 'seg_daemon_1',
      sourceId: 'mic_1',
      samples: activeSamples,
      sampleRate: 16000,
      durationMs: 100,
      startedAt: Date.now() - 100,
      endedAt: Date.now()
    });

    expect(result.text).toBe('Turn with me to Romans chapter 8 verse 28');
    expect(result.confidence).toBe(0.94);
    expect(capturedBody).toContain('segment.wav');
    expect(capturedBody).toContain('RIFF');
    expect(capturedBody).toContain('Genesis, Exodus');
    worker.shutdown();
  });

  it('Choir Singing Guard strips CANONICAL_PROMPT_BIAS during singing to prevent hallucination loops', () => {
    const worker = new WhisperWorkerProcess();
    expect(worker.getEffectivePrompt()).toBe(CANONICAL_PROMPT_BIAS);

    worker.setSingingGuardActive(true);
    expect(worker.isSingingGuardActive()).toBe(true);
    expect(worker.getEffectivePrompt()).toBe('');

    worker.setSingingGuardActive(false);
    expect(worker.getEffectivePrompt()).toBe(CANONICAL_PROMPT_BIAS);
  });

  it('registers multilingual Q5_1 models with authentic 64-char SHA-256 checksums for accented preaching', () => {
    expect(WHISPER_MODELS['base-q5_1']).toBeDefined();
    expect(WHISPER_MODELS['base-q5_1'].expectedSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(WHISPER_MODELS['small-q5_1']).toBeDefined();
    expect(WHISPER_MODELS['small-q5_1'].expectedSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('removes @xenova/transformers ONNX fallback bloat from speech-engine package.json', () => {
    const pkgPath = join(__dirname, '../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    expect(pkg.dependencies?.['@xenova/transformers']).toBeUndefined();
  });

  it('WhisperServerDaemon reports not ready before start and stops cleanly', () => {
    const daemon = new WhisperServerDaemon();
    expect(daemon.isReady()).toBe(false);
    expect(daemon.getEndpointUrl()).toBeNull();
    daemon.stop();
    expect(daemon.isReady()).toBe(false);
  });
});
