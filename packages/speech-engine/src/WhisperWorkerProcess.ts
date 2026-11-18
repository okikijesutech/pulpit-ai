import { SpeechSegment } from '@pulpit-ai/audio-engine';
import { spawn, ChildProcess } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir, cpus, totalmem, freemem } from 'node:os';
import { WhisperServerDaemon, buildWavBuffer } from './WhisperServerDaemon.js';

export interface HardwareProfile {
  platform: NodeJS.Platform;
  arch: string;
  cpuModel: string;
  logicalCores: number;
  optimalWhisperThreads: number;
  totalRamGb: number;
  freeRamGb: number;
  recommendedBackend: 'metal' | 'cuda_or_vulkan' | 'cpu_avx2' | 'cpu_neon';
}

/**
 * Computes optimal whisper.cpp thread count, guaranteeing >=50% CPU headroom on low-spec 4-core
 * sanctuary PCs so Electron UI and FreeShow 60fps projection never stutter.
 */
export function computeOptimalWhisperThreads(logicalCores = cpus().length): number {
  const envOverride = parseInt(process.env.WHISPER_THREADS || '', 10);
  if (!Number.isNaN(envOverride) && envOverride >= 1 && envOverride <= 32) {
    return envOverride;
  }
  if (logicalCores <= 2) return 1;
  if (logicalCores <= 4) return 2; // Preserves >=50% CPU headroom for Electron + FreeShow on 4-core PCs
  return Math.max(2, Math.min(8, Math.floor(logicalCores * 0.75)));
}

/**
 * Detects host CPU, RAM, and hardware acceleration profile for local AI inference.
 */
export function detectHardwareProfile(): HardwareProfile {
  const cpuList = cpus();
  const logicalCores = Math.max(1, cpuList.length);
  const cpuModel = cpuList[0]?.model?.trim() || 'Unknown CPU';
  const totalRamGb = Math.round((totalmem() / (1024 ** 3)) * 10) / 10;
  const freeRamGb = Math.round((freemem() / (1024 ** 3)) * 10) / 10;

  let recommendedBackend: HardwareProfile['recommendedBackend'] = 'cpu_avx2';
  if (process.platform === 'darwin' && process.arch === 'arm64') {
    recommendedBackend = 'metal';
  } else if (process.env.WHISPER_GPU === '1') {
    recommendedBackend = 'cuda_or_vulkan';
  } else if (process.arch === 'arm64') {
    recommendedBackend = 'cpu_neon';
  }

  return {
    platform: process.platform,
    arch: process.arch,
    cpuModel,
    logicalCores,
    optimalWhisperThreads: computeOptimalWhisperThreads(logicalCores),
    totalRamGb,
    freeRamGb,
    recommendedBackend
  };
}

export interface TranscriptionJobResult {
  text: string;
  confidence: number | null;
  latencyMs: number;
}

export type WorkerCrashListener = (exitCode: number | null, signal: string | null) => void;

export interface WhisperWorkerOptions {
  binaryPath?: string;
  serverBinaryPath?: string;
  modelPath?: string;
  /** Optional pre-running whisper-server URL (useful for integration testing) */
  serverEndpointUrl?: string;
}

/**
 * Initial decoder prompt primed with canonical Protestant books and liturgical cues.
 * Biases acoustic attention heads towards Biblical proper nouns during spoken preaching.
 */
export const CANONICAL_PROMPT_BIAS =
  'Genesis, Exodus, Leviticus, Numbers, Deuteronomy, Joshua, Judges, Ruth, ' +
  '1 Samuel, 2 Samuel, 1 Kings, 2 Kings, 1 Chronicles, 2 Chronicles, Ezra, Nehemiah, Esther, Job, Psalms, Proverbs, ' +
  'Ecclesiastes, Song of Solomon, Isaiah, Jeremiah, Lamentations, Ezekiel, Daniel, Hosea, Joel, Amos, Obadiah, ' +
  'Jonah, Micah, Nahum, Habakkuk, Zephaniah, Haggai, Zechariah, Malachi, Matthew, Mark, Luke, John, Acts, Romans, ' +
  '1 Corinthians, 2 Corinthians, Galatians, Ephesians, Philippians, Colossians, 1 Thessalonians, 2 Thessalonians, ' +
  '1 Timothy, 2 Timothy, Titus, Philemon, Hebrews, James, 1 Peter, 2 Peter, 1 John, 2 John, 3 John, Jude, Revelation. ' +
  'Chapter, verse, church, pastor, Bible, scripture, turn to, read.';

export class WhisperWorkerProcess {
  private isRunning = false;
  private singingGuardActive = false;
  private crashListeners: Set<WorkerCrashListener> = new Set();
  private mockResults: Map<string, Partial<TranscriptionJobResult>> = new Map();
  private customBinaryPath?: string;
  private customServerBinaryPath?: string;
  private customModelPath?: string;
  private activeChildren: Set<ChildProcess> = new Set();
  private readonly serverDaemon: WhisperServerDaemon;

  constructor(options: WhisperWorkerOptions = {}) {
    this.isRunning = true;
    this.customBinaryPath = options.binaryPath;
    this.customServerBinaryPath = options.serverBinaryPath;
    this.customModelPath = options.modelPath;
    this.serverDaemon = new WhisperServerDaemon({
      endpointUrl: options.serverEndpointUrl
    });
    this.serverDaemon.onCrash((code, signal) => {
      this.simulateCrash(code ?? 1, signal || 'SIGERR');
    });
  }

  public getHardwareProfile(): HardwareProfile {
    return detectHardwareProfile();
  }

  /**
   * Choir Singing Guard: when singing or sustained worship pads are active, strips
   * CANONICAL_PROMPT_BIAS to eliminate Whisper 24.5s biblical-name hallucination loops.
   */
  public setSingingGuardActive(active: boolean): void {
    this.singingGuardActive = active;
  }

  public isSingingGuardActive(): boolean {
    return this.singingGuardActive;
  }

  public getEffectivePrompt(): string {
    return this.singingGuardActive ? '' : CANONICAL_PROMPT_BIAS;
  }

  public isServerDaemonReady(): boolean {
    return this.serverDaemon.isReady();
  }

  public shutdown(): void {
    this.isRunning = false;
    this.serverDaemon.stop();
    for (const child of this.activeChildren) {
      try {
        child.kill('SIGTERM');
      } catch {
        // Ignore already-exited child processes
      }
    }
    this.activeChildren.clear();
  }

  public isHealthy(): boolean {
    return this.isRunning;
  }

  public getInitialPrompt(): string {
    return CANONICAL_PROMPT_BIAS;
  }

  public setNextResult(result: Partial<TranscriptionJobResult>): void {
    this.mockResults.set('*', result);
  }

  public setNextTranscript(text: string): void {
    this.mockResults.set('*', { text, confidence: null });
  }

  public registerMockTranscript(pattern: string, text: string, confidence: number | null = null): void {
    this.mockResults.set(pattern, { text, confidence });
  }

  public clearMockTranscripts(): void {
    this.mockResults.clear();
  }

  /**
   * Resolves the persistent whisper-server binary path (preferred Phase 1 engine).
   */
  public resolveServerBinaryPath(): string | null {
    if (this.customServerBinaryPath && existsSync(this.customServerBinaryPath)) {
      return this.customServerBinaryPath;
    }

    if (process.env.WHISPER_SERVER_PATH && existsSync(process.env.WHISPER_SERVER_PATH)) {
      return process.env.WHISPER_SERVER_PATH;
    }

    const binaryName = process.platform === 'win32' ? 'whisper-server.exe' : 'whisper-server';
    const candidatePaths = [
      join(process.cwd(), 'bin', binaryName),
      join(process.cwd(), 'packages', 'speech-engine', 'bin', binaryName),
      join(__dirname, '..', 'bin', binaryName),
      join(__dirname, '..', '..', 'bin', binaryName),
      join((process as any).resourcesPath || '', 'app.asar.unpacked', 'node_modules', '@pulpit-ai', 'speech-engine', 'bin', binaryName)
    ];

    for (const p of candidatePaths) {
      if (existsSync(p)) return p;
    }

    return null;
  }

  /**
   * Resolves the legacy native whisper-cli executable path (fallback if whisper-server is absent).
   */
  public resolveBinaryPath(): string | null {
    if (this.customBinaryPath && existsSync(this.customBinaryPath)) {
      return this.customBinaryPath;
    }

    if (process.env.WHISPER_BIN_PATH && existsSync(process.env.WHISPER_BIN_PATH)) {
      return process.env.WHISPER_BIN_PATH;
    }

    const binaryName = process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli';
    const candidatePaths = [
      join(process.cwd(), 'bin', binaryName),
      join(process.cwd(), 'packages', 'speech-engine', 'bin', binaryName),
      join(__dirname, '..', 'bin', binaryName),
      join(__dirname, '..', '..', 'bin', binaryName),
      join((process as any).resourcesPath || '', 'app.asar.unpacked', 'node_modules', '@pulpit-ai', 'speech-engine', 'bin', binaryName)
    ];

    for (const p of candidatePaths) {
      if (existsSync(p)) return p;
    }

    return null;
  }

  /**
   * Resolves the native Whisper GGML model file path.
   * Prioritizes quantized multilingual models (ggml-base-q5_1.bin) for superior
   * Nigerian/African accented English phonology before falling back to .en variants.
   */
  public resolveModelPath(): string | null {
    if (this.customModelPath && existsSync(this.customModelPath)) {
      return this.customModelPath;
    }

    if (process.env.WHISPER_MODEL_PATH && existsSync(process.env.WHISPER_MODEL_PATH)) {
      return process.env.WHISPER_MODEL_PATH;
    }

    const candidateModels = [
      'ggml-base-q5_1.bin',
      'ggml-small-q5_1.bin',
      'ggml-base.en-q5_1.bin',
      'ggml-small.en-q5_1.bin',
      'ggml-base.bin',
      'ggml-base.en.bin',
      'ggml-tiny-q5_1.bin',
      'ggml-tiny.en-q5_1.bin',
      'ggml-tiny.en.bin'
    ];

    const home = homedir();
    const platformAppData =
      process.platform === 'darwin'
        ? join(home, 'Library', 'Application Support')
        : process.platform === 'win32'
          ? process.env.APPDATA || join(home, 'AppData', 'Roaming')
          : process.env.XDG_CONFIG_HOME || join(home, '.config');

    const modelDirs = [
      join(process.cwd(), 'models'),
      join(process.cwd(), 'packages', 'speech-engine', 'models'),
      join(platformAppData, 'Pulpit AI', 'models'),
      join(home, '.pulpit-ai', 'models'),
      join(__dirname, '..', 'models'),
      join(__dirname, '..', '..', 'models')
    ];

    for (const dir of modelDirs) {
      for (const m of candidateModels) {
        const fullPath = join(dir, m);
        if (existsSync(fullPath)) return fullPath;
      }
    }

    return null;
  }

  /**
   * Pre-warms the persistent RAM-resident whisper-server daemon at startup so the first
   * spoken scripture reference incurs zero cold-start model loading delay.
   */
  public async warmup(): Promise<void> {
    try {
      const serverBin = this.resolveServerBinaryPath();
      const modelPath = this.resolveModelPath();
      if (serverBin && modelPath) {
        await this.serverDaemon.start(serverBin, modelPath, computeOptimalWhisperThreads());
      }
    } catch (err) {
      console.warn('[WhisperWorkerProcess] Daemon warmup deferred:', err);
    }
  }

  /**
   * Executes transcription on a 16-bit PCM speech segment outside the Electron main thread.
   */
  public async transcribeSegment(
    segment: SpeechSegment,
    timeoutMs = 30000
  ): Promise<TranscriptionJobResult> {
    if (!this.isRunning) {
      throw new Error('Whisper worker is not running.');
    }

    const startTime = Date.now();

    // 1. Check registered mock results first (vital for automated test suites)
    if (this.mockResults.has('*')) {
      const mock = this.mockResults.get('*')!;
      this.mockResults.delete('*'); // Single-use consumption
      return {
        text: mock.text ?? '',
        confidence: mock.confidence !== undefined ? mock.confidence : null,
        latencyMs: mock.latencyMs ?? Date.now() - startTime
      };
    }

    for (const [pattern, mock] of this.mockResults.entries()) {
      if (segment.id.includes(pattern) || segment.sourceId.includes(pattern)) {
        return {
          text: mock.text ?? '',
          confidence: mock.confidence !== undefined ? mock.confidence : null,
          latencyMs: mock.latencyMs ?? Date.now() - startTime
        };
      }
    }

    // 2. Minimum Acoustic Energy Gate: If average RMS < 0.002, audio is silence or low ambient hiss.
    if (segment.samples && segment.samples.length > 0) {
      let sumSquares = 0;
      for (let i = 0; i < segment.samples.length; i++) {
        const val = segment.samples[i] / 32768.0;
        sumSquares += val * val;
      }
      const rms = Math.sqrt(sumSquares / segment.samples.length);
      if (rms < 0.002) {
        return {
          text: '',
          confidence: null,
          latencyMs: Date.now() - startTime
        };
      }
    }

    const effectivePrompt = this.getEffectivePrompt();

    // 3. Primary Path: Persistent RAM-Resident whisper-server HTTP Daemon (Zero Cold Start, Zero Disk I/O)
    if (this.serverDaemon.isReady()) {
      try {
        return await this.serverDaemon.transcribe(segment.samples, effectivePrompt, timeoutMs);
      } catch (daemonErr) {
        console.warn('[WhisperWorkerProcess] Persistent daemon error, falling back:', daemonErr);
      }
    } else {
      const serverBin = this.resolveServerBinaryPath();
      const nativeModel = this.resolveModelPath();
      if (serverBin && nativeModel) {
        const started = await this.serverDaemon.start(
          serverBin,
          nativeModel,
          computeOptimalWhisperThreads()
        );
        if (started) {
          try {
            return await this.serverDaemon.transcribe(segment.samples, effectivePrompt, timeoutMs);
          } catch (daemonErr) {
            console.warn('[WhisperWorkerProcess] Persistent daemon error after start:', daemonErr);
          }
        }
      }
    }

    // 4. Legacy Fallback: whisper-cli subprocess (only if whisper-server binary is not installed yet)
    const nativeBin = this.resolveBinaryPath();
    const nativeModel = this.resolveModelPath();
    if (nativeBin && nativeModel) {
      try {
        return await this.transcribeWithSubprocess(
          nativeBin,
          nativeModel,
          segment,
          effectivePrompt,
          timeoutMs,
          startTime
        );
      } catch (nativeErr) {
        console.warn('[WhisperWorkerProcess] Native whisper-cli fallback error:', nativeErr);
      }
    }

    return {
      text: '',
      confidence: null,
      latencyMs: Date.now() - startTime
    };
  }

  private async transcribeWithSubprocess(
    binPath: string,
    modelPath: string,
    segment: SpeechSegment,
    prompt: string,
    timeoutMs: number,
    startTime: number
  ): Promise<TranscriptionJobResult> {
    const tempWav = join(tmpdir(), `pulpit_audio_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.wav`);
    writeFileSync(tempWav, buildWavBuffer(segment.samples, 16000));

    const optimalThreads = computeOptimalWhisperThreads();
    const args = [
      '-m', modelPath,
      '-f', tempWav,
      '-t', String(optimalThreads),
      '--language', 'en',
      '--output-json',
      '--no-prints',
      '--no-timestamps',
      '--suppress-nst',
      '-nth', '0.65',
      '-et', '2.40'
    ];

    if (prompt) {
      args.push('--prompt', prompt);
    }

    if (process.env.WHISPER_NO_GPU === '1') {
      args.push('-ng');
    }

    return new Promise<TranscriptionJobResult>((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      const child = spawn(binPath, args, { windowsHide: true });
      this.activeChildren.add(child);

      const timer = setTimeout(() => {
        this.activeChildren.delete(child);
        child.kill('SIGKILL');
        try { unlinkSync(tempWav); } catch {}
        try { unlinkSync(`${tempWav}.json`); } catch {}
        reject(new Error(`Native whisper subprocess timed out after ${timeoutMs}ms.`));
      }, timeoutMs);

      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      child.on('close', (code, signal) => {
        clearTimeout(timer);
        this.activeChildren.delete(child);
        try { unlinkSync(tempWav); } catch {}

        if (code !== 0 && code !== null) {
          try { unlinkSync(`${tempWav}.json`); } catch {}
          this.simulateCrash(code, signal || 'SIGERR');
          reject(new Error(`whisper.cpp exited with code ${code}: ${stderr}`));
          return;
        }

        let parsedText = '';
        let parsedConfidence: number | null = null;

        const jsonPath = `${tempWav}.json`;
        if (existsSync(jsonPath)) {
          try {
            const fileContent = readFileSync(jsonPath, 'utf8');
            const json = JSON.parse(fileContent);
            const textParts = (json.transcription || []).map((t: any) => t.text).filter(Boolean);
            parsedText = textParts.join(' ').trim();
            if (typeof json.transcription?.[0]?.p === 'number') {
              parsedConfidence = json.transcription[0].p;
            }
          } catch {}
          try { unlinkSync(jsonPath); } catch {}
        }

        if (!parsedText) {
          try {
            const json = JSON.parse(stdout);
            parsedText = (json.transcription?.[0]?.text || json.text || '').trim();
            if (typeof json.transcription?.[0]?.p === 'number') {
              parsedConfidence = json.transcription[0].p;
            }
          } catch {
            parsedText = stdout.trim();
          }
        }

        resolve({
          text: parsedText,
          confidence: parsedConfidence,
          latencyMs: Date.now() - startTime
        });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        this.activeChildren.delete(child);
        try { unlinkSync(tempWav); } catch {}
        try { unlinkSync(`${tempWav}.json`); } catch {}
        reject(err);
      });
    });
  }

  public simulateCrash(code = 1, signal = 'SIGSEGV'): void {
    this.isRunning = false;
    for (const l of this.crashListeners) {
      l(code, signal);
    }
  }

  public restart(): void {
    this.isRunning = true;
  }

  public onCrash(listener: WorkerCrashListener): () => void {
    this.crashListeners.add(listener);
    return () => {
      this.crashListeners.delete(listener);
    };
  }
}
