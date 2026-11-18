import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { formatSherpaHotwordsFile } from './LiturgicalHotwords.js';
import {
  StreamingTokenSegmenter,
  EarlyBookCueEvent,
  StreamingUtteranceEvent
} from './StreamingTokenSegmenter.js';

export interface SherpaModelPaths {
  encoder: string;
  decoder: string;
  joiner: string;
  tokens: string;
  sileroVad?: string;
}

export interface SileroVadBackend {
  /** Returns probability [0.0 .. 1.0] that the 16 kHz audio frame contains human speech */
  getSpeechProbability(samplesFloat32: Float32Array, sampleRate: number): number;
  reset?(): void;
}

export interface SherpaRecognizerBackend {
  acceptWaveform(sampleRate: number, samplesFloat32: Float32Array): void;
  decode(): void;
  getText(): string;
  isEndpoint(): boolean;
  reset(): void;
}

export interface SherpaStreamingEngineOptions {
  sampleRate?: number;
  /** Minimum Silero VAD speech probability [0..1] to route audio to Zipformer (default 0.45) */
  vadSpeechThreshold?: number;
  /** Trailing hangover frames after speech drops below threshold (default 12 frames = 360ms) */
  vadHangoverFrames?: number;
  /** Pluggable Silero VAD backend (native ONNX in UtilityProcess or mock in tests) */
  vadBackend?: SileroVadBackend;
  /** Pluggable sherpa-onnx Zipformer streaming recognizer backend */
  recognizerBackend?: SherpaRecognizerBackend;
}

/**
 * Resolves cross-platform directories for sherpa-onnx Zipformer INT8 & Silero VAD v5 ONNX models.
 */
export function resolveSherpaModelPaths(customModelsDir?: string): SherpaModelPaths | null {
  const home = homedir();
  const platformAppData =
    process.platform === 'darwin'
      ? join(home, 'Library', 'Application Support')
      : process.platform === 'win32'
        ? process.env.APPDATA || join(home, 'AppData', 'Roaming')
        : process.env.XDG_CONFIG_HOME || join(home, '.config');

  const candidateDirs = [
    customModelsDir,
    process.env.SHERPA_MODEL_DIR,
    join(process.cwd(), 'models', 'sherpa-zipformer'),
    join(process.cwd(), 'packages', 'speech-engine', 'models', 'sherpa-zipformer'),
    join(platformAppData, 'Pulpit AI', 'models', 'sherpa-zipformer'),
    join(home, '.pulpit-ai', 'models', 'sherpa-zipformer')
  ].filter((d): d is string => Boolean(d));

  for (const dir of candidateDirs) {
    if (!existsSync(dir)) continue;

    const encoder = [
      join(dir, 'encoder-epoch-99-avg-1.int8.onnx'),
      join(dir, 'encoder.int8.onnx'),
      join(dir, 'encoder.onnx')
    ].find((p) => existsSync(p));

    const decoder = [
      join(dir, 'decoder-epoch-99-avg-1.int8.onnx'),
      join(dir, 'decoder-epoch-99-avg-1.onnx'),
      join(dir, 'decoder.onnx')
    ].find((p) => existsSync(p));

    const joiner = [
      join(dir, 'joiner-epoch-99-avg-1.int8.onnx'),
      join(dir, 'joiner-epoch-99-avg-1.onnx'),
      join(dir, 'joiner.onnx')
    ].find((p) => existsSync(p));

    const tokens = join(dir, 'tokens.txt');

    if (encoder && decoder && joiner && existsSync(tokens)) {
      const sileroVad = [
        join(dir, 'silero_vad.onnx'),
        join(dir, '..', 'silero_vad.onnx')
      ].find((p) => existsSync(p));

      return { encoder, decoder, joiner, tokens, sileroVad };
    }
  }

  return null;
}

/**
 * Writes the calibrated 3-tier Aho-Corasick hotwords file for sherpa-onnx Zipformer decoding.
 */
export function ensureCalibratedHotwordsFile(targetDir?: string): string {
  const dir = targetDir || join(tmpdir(), 'pulpit-ai-sherpa');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const filePath = join(dir, 'hotwords.txt');
  writeFileSync(filePath, formatSherpaHotwordsFile(), 'utf8');
  return filePath;
}

/**
 * Phase 2 Real-Time Streaming Engine combining Silero VAD v5 speech gating,
 * sherpa-onnx Streaming Zipformer transducer decoding, and StreamingTokenSegmenter.
 *
 * Runs inside an isolated Electron UtilityProcess in production so native ONNX
 * faults can never crash the main Electron process or FreeShow projection.
 */
export class SherpaStreamingEngine {
  private readonly sampleRate: number;
  private readonly vadThreshold: number;
  private readonly vadHangoverFrames: number;
  private readonly vadBackend?: SileroVadBackend;
  private readonly recognizerBackend?: SherpaRecognizerBackend;
  private readonly segmenter: StreamingTokenSegmenter;

  private hangoverRemaining = 0;
  private lastPartialText = '';
  private partialListeners: Set<(text: string) => void> = new Set();

  constructor(options: SherpaStreamingEngineOptions = {}) {
    this.sampleRate = options.sampleRate ?? 16000;
    this.vadThreshold = options.vadSpeechThreshold ?? 0.45;
    this.vadHangoverFrames = options.vadHangoverFrames ?? 12;
    this.vadBackend = options.vadBackend;
    this.recognizerBackend = options.recognizerBackend;
    this.segmenter = new StreamingTokenSegmenter();
  }

  public isAvailable(): boolean {
    return Boolean(this.recognizerBackend);
  }

  public getSegmenter(): StreamingTokenSegmenter {
    return this.segmenter;
  }

  /**
   * Processes a live 16-bit PCM frame (typically 30 ms = 480 samples at 16 kHz).
   * Converts safely to Float32Array (avoiding Electron 21+ external ArrayBuffer errors),
   * gates via Silero VAD v5 (allowing preaching over organ pads while rejecting silence),
   * and feeds active frames into the Streaming Zipformer transducer.
   */
  public processPcmFrame(
    pcm16: Int16Array,
    now = Date.now()
  ): {
    vadSpeechProbability: number;
    routedToAsr: boolean;
    partialText: string;
    emittedUtterance: StreamingUtteranceEvent | null;
  } {
    if (!this.recognizerBackend || pcm16.length === 0) {
      return { vadSpeechProbability: 0, routedToAsr: false, partialText: '', emittedUtterance: null };
    }

    // Deep-copy into standard Float32Array (required by Electron 21+ V8 external buffer policy)
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0;
    }

    let vadProb = 1.0;
    if (this.vadBackend) {
      vadProb = this.vadBackend.getSpeechProbability(float32, this.sampleRate);
    }

    const speechDetected = vadProb >= this.vadThreshold;
    if (speechDetected) {
      this.hangoverRemaining = this.vadHangoverFrames;
    } else if (this.hangoverRemaining > 0) {
      this.hangoverRemaining--;
    }

    const routedToAsr = speechDetected || this.hangoverRemaining > 0;
    if (!routedToAsr) {
      const timedOut = this.segmenter.checkSilenceTimeout(now);
      if (timedOut) {
        this.recognizerBackend.reset();
        this.lastPartialText = '';
      }
      return {
        vadSpeechProbability: vadProb,
        routedToAsr: false,
        partialText: this.lastPartialText,
        emittedUtterance: timedOut
      };
    }

    this.recognizerBackend.acceptWaveform(this.sampleRate, float32);
    this.recognizerBackend.decode();

    const text = this.recognizerBackend.getText().trim();
    const endpoint = this.recognizerBackend.isEndpoint();

    if (text && text !== this.lastPartialText) {
      this.lastPartialText = text;
      for (const fn of this.partialListeners) {
        fn(text);
      }
    }

    const emittedUtterance = this.segmenter.pushPartial(text, endpoint, now);
    if (endpoint) {
      this.recognizerBackend.reset();
      this.lastPartialText = '';
    }

    return {
      vadSpeechProbability: vadProb,
      routedToAsr: true,
      partialText: text,
      emittedUtterance
    };
  }

  public reset(): void {
    this.hangoverRemaining = 0;
    this.lastPartialText = '';
    this.vadBackend?.reset?.();
    this.recognizerBackend?.reset();
    this.segmenter.reset();
  }

  public onPartialTranscript(listener: (text: string) => void): () => void {
    this.partialListeners.add(listener);
    return () => this.partialListeners.delete(listener);
  }

  public onEarlyBookCue(listener: (ev: EarlyBookCueEvent) => void): () => void {
    return this.segmenter.onEarlyBookCue(listener);
  }

  public onUtterance(listener: (ev: StreamingUtteranceEvent) => void): () => void {
    return this.segmenter.onUtterance(listener);
  }
}
