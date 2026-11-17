import { spawn, ChildProcess, execFile } from 'node:child_process';
import { createServer } from 'node:net';
import { endianness } from 'node:os';

export interface DaemonTranscriptionResult {
  text: string;
  confidence: number | null;
  latencyMs: number;
}

export interface WhisperServerOptions {
  /** Override URL for testing against an already-running or mock HTTP inference server */
  endpointUrl?: string;
  /** Readiness timeout in milliseconds when booting whisper-server (default 15000ms) */
  startupTimeoutMs?: number;
  /** Disable GPU offload (-ng) for older integrated GPUs */
  disableGpu?: boolean;
}

/**
 * Builds a standard 16-bit mono PCM RIFF/WAV buffer 100% in memory
 * using native C++ Buffer.copy() on little-endian CPUs (zero disk I/O).
 */
export function buildWavBuffer(samples: Int16Array, sampleRate = 16000): Buffer {
  const dataBytes = samples.length * 2;
  const buffer = Buffer.allocUnsafe(44 + dataBytes);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);

  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
  buffer.writeUInt16LE(2, 32); // Block align
  buffer.writeUInt16LE(16, 34); // Bits per sample

  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);

  if (endianness() === 'LE') {
    Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength).copy(buffer, 44);
  } else {
    for (let i = 0; i < samples.length; i++) {
      buffer.writeInt16LE(samples[i], 44 + i * 2);
    }
  }

  return buffer;
}

/**
 * Allocates an ephemeral free TCP port strictly on IPv4 loopback (127.0.0.1).
 */
export function findFreeLoopbackPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close(() => reject(new Error('Failed to allocate loopback port')));
        return;
      }
      const { port } = addr;
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

/**
 * Persistent RAM-resident whisper-server sidecar manager.
 * Eliminates the 7s-22s per-segment cold-start penalty of spawning whisper-cli on low-spec CPUs
 * and performs zero-disk in-memory multipart HTTP inference on 127.0.0.1:<ephemeralPort>.
 */
export class WhisperServerDaemon {
  private child: ChildProcess | null = null;
  private endpointUrl: string | null = null;
  private ready = false;
  private startingPromise: Promise<boolean> | null = null;
  private crashCallback: ((code: number | null, signal: string | null) => void) | null = null;
  private readonly startupTimeoutMs: number;
  private readonly disableGpu: boolean;

  constructor(options: WhisperServerOptions = {}) {
    this.startupTimeoutMs = options.startupTimeoutMs ?? 15000;
    this.disableGpu = options.disableGpu ?? process.env.WHISPER_NO_GPU === '1';
    if (options.endpointUrl) {
      this.endpointUrl = options.endpointUrl.replace(/\/+$/, '');
      this.ready = true;
    }
  }

  public isReady(): boolean {
    return this.ready && this.endpointUrl !== null;
  }

  public getEndpointUrl(): string | null {
    return this.endpointUrl;
  }

  public onCrash(cb: (code: number | null, signal: string | null) => void): void {
    this.crashCallback = cb;
  }

  /**
   * Boots the persistent whisper-server daemon on a dynamically allocated 127.0.0.1 loopback port
   * and waits for the HTTP /health endpoint to become responsive.
   */
  public async start(binaryPath: string, modelPath: string, threads: number): Promise<boolean> {
    if (this.ready && this.endpointUrl) return true;
    if (this.startingPromise) return this.startingPromise;

    this.startingPromise = (async () => {
      try {
        const port = await findFreeLoopbackPort();
        const baseUrl = `http://127.0.0.1:${port}`;

        const args = [
          '-m', modelPath,
          '-t', String(threads),
          '--host', '127.0.0.1',
          '--port', String(port),
          '--inference-path', '/inference',
          '--convert'
        ];

        if (this.disableGpu) {
          args.push('-ng');
        }

        const proc = spawn(binaryPath, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true
        });
        this.child = proc;

        proc.on('exit', (code, signal) => {
          const wasReady = this.ready;
          this.ready = false;
          this.child = null;
          this.endpointUrl = null;
          if (wasReady && code !== 0 && signal !== 'SIGTERM') {
            this.crashCallback?.(code, signal);
          }
        });

        proc.on('error', () => {
          this.ready = false;
          this.child = null;
          this.endpointUrl = null;
        });

        const healthy = await this.waitForHealth(baseUrl, this.startupTimeoutMs);
        if (!healthy) {
          this.stop();
          return false;
        }

        this.endpointUrl = baseUrl;
        this.ready = true;
        return true;
      } catch {
        this.stop();
        return false;
      } finally {
        this.startingPromise = null;
      }
    })();

    return this.startingPromise;
  }

  private async waitForHealth(baseUrl: string, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    let delayMs = 75;

    while (Date.now() < deadline) {
      if (!this.child || this.child.exitCode !== null) {
        return false;
      }
      try {
        const res = await fetch(`${baseUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(1000)
        });
        if (res.ok) return true;
      } catch {
        // Server still loading GGML weights into RAM
      }
      await new Promise((r) => setTimeout(r, delayMs));
      delayMs = Math.min(400, Math.round(delayMs * 1.4));
    }

    return false;
  }

  /**
   * Sends a 16 kHz PCM speech segment to the RAM-resident whisper-server via in-memory
   * multipart/form-data HTTP POST (zero temp WAV files written to disk).
   */
  public async transcribe(
    samples: Int16Array,
    prompt: string,
    timeoutMs = 10000,
    language = 'en',
    sampleRate = 16000
  ): Promise<DaemonTranscriptionResult> {
    if (!this.ready || !this.endpointUrl) {
      throw new Error('WhisperServerDaemon is not ready');
    }

    const startTime = Date.now();
    const wavBuffer = buildWavBuffer(samples, sampleRate);
    const wavBytes = new Uint8Array(wavBuffer.byteLength);
    wavBytes.set(wavBuffer);

    const form = new FormData();
    form.append('file', new Blob([wavBytes], { type: 'audio/wav' }), 'segment.wav');
    form.append('response_format', 'json');
    form.append('language', language);
    form.append('temperature', '0.0');
    form.append('no_timestamps', 'true');
    if (prompt) {
      form.append('prompt', prompt);
    }

    const response = await fetch(`${this.endpointUrl}/inference`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!response.ok) {
      throw new Error(`whisper-server returned HTTP ${response.status}`);
    }

    const payload: any = await response.json();
    const text =
      typeof payload?.text === 'string'
        ? payload.text.trim()
        : Array.isArray(payload?.transcription)
          ? payload.transcription.map((t: any) => t?.text || '').join(' ').trim()
          : '';

    let confidence: number | null = null;
    if (typeof payload?.confidence === 'number') {
      confidence = payload.confidence;
    } else if (typeof payload?.transcription?.[0]?.p === 'number') {
      confidence = payload.transcription[0].p;
    }

    return {
      text,
      confidence,
      latencyMs: Date.now() - startTime
    };
  }

  /**
   * Cleanly terminates the persistent whisper-server process tree (including Windows tree kill).
   */
  public stop(): void {
    this.ready = false;
    this.endpointUrl = null;

    const proc = this.child;
    this.child = null;
    if (!proc) return;

    const pid = proc.pid;
    try {
      proc.kill('SIGTERM');
    } catch {
      // Ignore already exited
    }

    // Escalate tree cleanup on Windows to guarantee zero orphaned native servers
    if (pid && process.platform === 'win32') {
      setTimeout(() => {
        if (proc.exitCode === null) {
          execFile('taskkill', ['/PID', String(pid), '/T', '/F'], () => {});
        }
      }, 1000).unref();
    } else if (pid) {
      setTimeout(() => {
        if (proc.exitCode === null) {
          try {
            proc.kill('SIGKILL');
          } catch {}
        }
      }, 1000).unref();
    }
  }
}
