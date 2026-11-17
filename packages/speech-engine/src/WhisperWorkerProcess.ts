import { SpeechSegment } from '@pulpit-ai/audio-engine';
import { spawn, ChildProcess } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir, cpus, totalmem, freemem, endianness } from 'node:os';

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
 * Computes optimal whisper.cpp thread count, leaving headroom for Electron UI & FreeShow projection.
 */
export function computeOptimalWhisperThreads(logicalCores = cpus().length): number {
  const envOverride = parseInt(process.env.WHISPER_THREADS || '', 10);
  if (!Number.isNaN(envOverride) && envOverride >= 1 && envOverride <= 32) {
    return envOverride;
  }
  if (logicalCores <= 2) return 1;
  if (logicalCores <= 4) return Math.max(2, logicalCores - 1);
  // Reserve at least 2 logical cores for Electron renderer & FreeShow projection smoothness, cap at 8
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

/**
 * Initial decoder prompt primed with canonical Protestant books and liturgical cues.
 * Biases acoustic attention heads towards Biblical proper nouns.
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
  private crashListeners: Set<WorkerCrashListener> = new Set();
  private mockResults: Map<string, Partial<TranscriptionJobResult>> = new Map();
  private transcriberPromise: Promise<any> | null = null;
  private customBinaryPath?: string;
  private customModelPath?: string;
  private activeChildren: Set<ChildProcess> = new Set();

  constructor(options: { binaryPath?: string; modelPath?: string } = {}) {
    this.isRunning = true;
    this.customBinaryPath = options.binaryPath;
    this.customModelPath = options.modelPath;
  }

  public getHardwareProfile(): HardwareProfile {
    return detectHardwareProfile();
  }

  public shutdown(): void {
    this.isRunning = false;
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
   * Resolves the native whisper.cpp executable path.
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
      // Packaged app path
      join((process as any).resourcesPath || '', 'app.asar.unpacked', 'node_modules', '@pulpit-ai', 'speech-engine', 'bin', binaryName)
    ];

    for (const p of candidatePaths) {
      if (existsSync(p)) return p;
    }

    return null;
  }

  /**
   * Resolves the native Whisper GGML model file path.
   */
  public resolveModelPath(): string | null {
    if (this.customModelPath && existsSync(this.customModelPath)) {
      return this.customModelPath;
    }

    if (process.env.WHISPER_MODEL_PATH && existsSync(process.env.WHISPER_MODEL_PATH)) {
      return process.env.WHISPER_MODEL_PATH;
    }

    const candidateModels = [
      'ggml-base.en-q5_1.bin',
      'ggml-base.en.bin',
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

  private async getTranscriber(): Promise<any> {
    if (!this.transcriberPromise) {
      this.transcriberPromise = (async () => {
        try {
          const { pipeline } = await import('@xenova/transformers');
          return await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
            quantized: true
          });
        } catch (err) {
          console.warn('Whisper ONNX fallback pipeline load deferred or failed:', err);
          return null;
        }
      })();
    }
    return this.transcriberPromise;
  }

  public async warmup(): Promise<void> {
    try {
      const nativeBin = this.resolveBinaryPath();
      if (!nativeBin) {
        await this.getTranscriber();
      }
    } catch (err) {
      console.warn('Warmup error in Whisper worker:', err);
    }
  }

  /**
   * Executes transcription on a 16-bit PCM speech segment outside the Electron main thread.
   */
  public async transcribeSegment(
    segment: SpeechSegment,
    timeoutMs = 15000
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
    // Discard immediately to prevent native Whisper from decoding hallucination loops on silence.
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

    // 3. Try Native whisper.cpp Subprocess if binary and model are present
    const nativeBin = this.resolveBinaryPath();
    const nativeModel = this.resolveModelPath();
    if (nativeBin && nativeModel) {
      try {
        return await this.transcribeWithSubprocess(nativeBin, nativeModel, segment, timeoutMs, startTime);
      } catch (nativeErr) {
        console.warn('[WhisperWorkerProcess] Native whisper execution error, attempting fallback:', nativeErr);
      }
    }

    // 3. Fallback to in-process ONNX if available
    try {
      const transcriber = await this.getTranscriber();
      if (transcriber && segment.samples && segment.samples.length > 0) {
        const float32 = new Float32Array(segment.samples.length);
        let sumSquares = 0;
        for (let i = 0; i < segment.samples.length; i++) {
          const val = segment.samples[i] / 32768.0;
          float32[i] = val;
          sumSquares += val * val;
        }

        const rms = Math.sqrt(sumSquares / float32.length);
        if (rms < 0.003) {
          return { text: '', confidence: null, latencyMs: Date.now() - startTime };
        }

        const resultPromise = transcriber(float32, {
          language: 'english',
          task: 'transcribe',
          num_beams: 1,
          temperature: 0.0,
          max_new_tokens: 96
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Whisper transcription timed out after ${timeoutMs}ms.`)), timeoutMs);
        });

        const output: any = await Promise.race([resultPromise, timeoutPromise]);
        const recognizedText = (output?.text || '').trim();

        // Extract real confidence if probability is available, else null
        const realConfidence = typeof output?.confidence === 'number' ? output.confidence : null;

        return {
          text: recognizedText,
          confidence: realConfidence,
          latencyMs: Date.now() - startTime
        };
      }
    } catch (fallbackErr) {
      console.warn('Whisper inference error:', fallbackErr);
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
    timeoutMs: number,
    startTime: number
  ): Promise<TranscriptionJobResult> {
    const tempWav = join(tmpdir(), `pulpit_audio_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.wav`);
    this.writeWavFile(tempWav, segment.samples, 16000);

    const optimalThreads = computeOptimalWhisperThreads();
    const args = [
      '-m', modelPath,
      '-f', tempWav,
      '-t', String(optimalThreads),
      '--language', 'en',
      '--prompt', CANONICAL_PROMPT_BIAS,
      '--output-json',
      '--no-prints',
      '--no-timestamps',
      '--suppress-nst',
      '-nth', '0.65',
      '-et', '2.40'
    ];

    // Allow operators on older integrated GPUs to force pure CPU AVX2 mode
    if (process.env.WHISPER_NO_GPU === '1') {
      args.push('-ng');
    }

    return new Promise<TranscriptionJobResult>((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      const child = spawn(binPath, args);
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

        // In whisper.cpp, --output-json writes output to `${tempWav}.json`
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

  private writeWavFile(filePath: string, samples: Int16Array, sampleRate: number): void {
    const dataBytes = samples.length * 2;
    const buffer = Buffer.allocUnsafe(44 + dataBytes);
    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataBytes, 4);
    buffer.write('WAVE', 8);
    // fmt subchunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM format
    buffer.writeUInt16LE(1, 22); // Mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
    buffer.writeUInt16LE(2, 32); // block align
    buffer.writeUInt16LE(16, 34); // bits per sample
    // data subchunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataBytes, 40);

    // Zero-loop native C++ memcpy on little-endian CPUs (x86_64 / ARM64)
    if (endianness() === 'LE') {
      Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength).copy(buffer, 44);
    } else {
      for (let i = 0; i < samples.length; i++) {
        buffer.writeInt16LE(samples[i], 44 + i * 2);
      }
    }

    writeFileSync(filePath, buffer);
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
    return () => this.crashListeners.delete(listener);
  }

  public stop(): void {
    this.isRunning = false;
  }
}
