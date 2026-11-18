import { utilityProcess, UtilityProcess } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface SherpaManagerCallbacks {
  onUtterance: (text: string) => void;
  onEarlyBookCue?: (bookName: string, windowText: string) => void;
  onStatusChange?: (available: boolean, reason?: string) => void;
}

/**
 * Crash-Isolated Electron UtilityProcess Supervisor for Phase 2 sherpa-onnx Streaming Engine.
 *
 * - Runs native ONNX inference completely outside Electron Main & Renderer.
 * - Automatically respawns within 250 ms on native segfaults (capped at 3 restarts / 60 s).
 * - Fails closed gracefully back to Phase 1 whisper-server if native addon/models are absent.
 */
export class SherpaProcessManager {
  private worker: UtilityProcess | null = null;
  private streamingAvailable = false;
  private isShuttingDown = false;
  private restartTimestamps: number[] = [];
  private readonly callbacks: SherpaManagerCallbacks;

  constructor(callbacks: SherpaManagerCallbacks) {
    this.callbacks = callbacks;
  }

  public isStreamingAvailable(): boolean {
    return this.streamingAvailable && this.worker !== null;
  }

  public start(): void {
    if (this.isShuttingDown || this.worker) return;

    const workerScript = join(__dirname, '../workers/sherpaWorkerBootstrap.js');
    if (!existsSync(workerScript)) {
      this.streamingAvailable = false;
      return;
    }

    try {
      const proc = utilityProcess.fork(workerScript, [], {
        serviceName: 'pulpit-ai-sherpa-streaming'
      });
      this.worker = proc;

      proc.on('message', (msg: any) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'status') {
          this.streamingAvailable = Boolean(msg.available);
          this.callbacks.onStatusChange?.(this.streamingAvailable, msg.reason);
        } else if (msg.type === 'utterance' && typeof msg.text === 'string' && msg.text.trim()) {
          this.callbacks.onUtterance(msg.text.trim());
        } else if (msg.type === 'early_book_cue' && typeof msg.bookName === 'string') {
          this.callbacks.onEarlyBookCue?.(msg.bookName, msg.text || '');
        }
      });

      proc.on('exit', (code) => {
        const wasAvailable = this.streamingAvailable;
        this.worker = null;
        this.streamingAvailable = false;

        if (this.isShuttingDown || !wasAvailable || code === 0) {
          return;
        }

        // Rate-limited auto-respawn (<300 ms) so FreeShow 60fps never stutters
        const now = Date.now();
        this.restartTimestamps = this.restartTimestamps.filter((t) => now - t < 60_000);
        if (this.restartTimestamps.length < 3) {
          this.restartTimestamps.push(now);
          console.warn(`[SherpaProcessManager] UtilityProcess exited (${code}); respawning in 250ms...`);
          setTimeout(() => this.start(), 250);
        } else {
          console.error('[SherpaProcessManager] Crash limit reached; falling back cleanly to Phase 1 whisper-server.');
          this.callbacks.onStatusChange?.(false, 'Crash limit reached; using Phase 1 whisper-server');
        }
      });
    } catch (err) {
      console.warn('[SherpaProcessManager] Failed to fork UtilityProcess:', err);
      this.streamingAvailable = false;
    }
  }

  public pushPcmFrame(samples: Int16Array): void {
    if (!this.streamingAvailable || !this.worker) return;
    // Copy into plain Uint8Array/Int16Array payload safe for Electron structured clone
    this.worker.postMessage({
      type: 'audio_frame',
      samples: new Int16Array(samples),
      timestamp: Date.now()
    });
  }

  public reset(): void {
    if (this.worker && this.streamingAvailable) {
      this.worker.postMessage({ type: 'reset' });
    }
  }

  public shutdown(): void {
    this.isShuttingDown = true;
    this.streamingAvailable = false;
    if (this.worker) {
      try {
        this.worker.postMessage({ type: 'shutdown' });
        this.worker.kill();
      } catch {
        // Ignore already exited
      }
      this.worker = null;
    }
  }
}
