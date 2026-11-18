/**
 * Electron UtilityProcess Isolated Worker for Phase 2 Streaming Zipformer (sherpa-onnx) + Silero VAD v5.
 *
 * Executes completely outside the Electron Main Process and Renderer so native C++/ONNX faults
 * can NEVER crash the sanctuary desktop UI or FreeShow 60fps WebSocket connection.
 */

import { join } from 'node:path';
import {
  SherpaStreamingEngine,
  resolveSherpaModelPaths,
  ensureCalibratedHotwordsFile,
  SherpaRecognizerBackend,
  SileroVadBackend
} from '@pulpit-ai/speech-engine';

// Windows packaged app DLL resolution: prepend app.asar.unpacked sherpa-onnx native lib directory
if (process.platform === 'win32' && (process as any).resourcesPath) {
  const unpackedLib = join(
    (process as any).resourcesPath,
    'app.asar.unpacked',
    'node_modules',
    'sherpa-onnx-node',
    'lib'
  );
  process.env.PATH = `${unpackedLib};${process.env.PATH || ''}`;
}

interface WorkerOutboundMessage {
  type: 'status' | 'partial' | 'early_book_cue' | 'utterance' | 'error';
  available?: boolean;
  reason?: string;
  text?: string;
  bookName?: string;
  bookId?: string;
  timestamp?: number;
}

const parentPort = (process as any).parentPort;

function post(msg: WorkerOutboundMessage): void {
  if (parentPort && typeof parentPort.postMessage === 'function') {
    parentPort.postMessage(msg);
  }
}

let engine: SherpaStreamingEngine | null = null;

function initNativeSherpa(): void {
  const modelPaths = resolveSherpaModelPaths();
  if (!modelPaths) {
    post({
      type: 'status',
      available: false,
      reason: 'Sherpa Zipformer ONNX models not installed; Phase 1 whisper-server remains active.'
    });
    return;
  }

  let sherpaAddon: any;
  try {
    // Dynamic optional require so apps work cleanly even when optional native addon is absent
    sherpaAddon = require('sherpa-onnx-node');
  } catch {
    post({
      type: 'status',
      available: false,
      reason: 'Optional native sherpa-onnx-node addon not installed; Phase 1 whisper-server remains active.'
    });
    return;
  }

  try {
    const hotwordsPath = ensureCalibratedHotwordsFile();

    const recognizer = new sherpaAddon.OnlineRecognizer({
      featConfig: { sampleRate: 16000, featureDim: 80 },
      modelConfig: {
        transducer: {
          encoder: modelPaths.encoder,
          decoder: modelPaths.decoder,
          joiner: modelPaths.joiner
        },
        tokens: modelPaths.tokens,
        numThreads: 1, // Single core (<20% CPU on i5-6300U), protecting FreeShow 60fps
        provider: 'cpu',
        debug: 0
      },
      decodingMethod: 'modified_beam_search',
      maxActivePaths: 4,
      enableEndpoint: 1,
      rule1MinTrailingSilence: 2.4,
      rule2MinTrailingSilence: 0.8,
      rule3MinUtteranceLength: 20,
      hotwordsFile: hotwordsPath,
      hotwordsScore: 1.5
    });

    const stream = recognizer.createStream();

    const recognizerBackend: SherpaRecognizerBackend = {
      acceptWaveform: (sampleRate, samples) => stream.acceptWaveform({ sampleRate, samples }),
      decode: () => {
        while (recognizer.isReady(stream)) {
          recognizer.decode(stream);
        }
      },
      getText: () => recognizer.getResult(stream)?.text || '',
      isEndpoint: () => Boolean(recognizer.isEndpoint(stream)),
      reset: () => recognizer.reset(stream)
    };

    let vadBackend: SileroVadBackend | undefined;
    if (modelPaths.sileroVad && typeof sherpaAddon.Vad === 'function') {
      const vad = new sherpaAddon.Vad(
        {
          sileroVad: {
            model: modelPaths.sileroVad,
            threshold: 0.45,
            minSilenceDuration: 0.5,
            minSpeechDuration: 0.25,
            windowSize: 512
          },
          sampleRate: 16000,
          numThreads: 1,
          provider: 'cpu',
          debug: 0
        },
        30
      );
      vadBackend = {
        getSpeechProbability: (samples) => {
          vad.acceptWaveform(samples);
          return vad.isDetected() ? 0.9 : 0.1;
        },
        reset: () => vad.reset()
      };
    }

    engine = new SherpaStreamingEngine({
      sampleRate: 16000,
      vadBackend,
      recognizerBackend
    });

    engine.onPartialTranscript((text) => {
      post({ type: 'partial', text, timestamp: Date.now() });
    });

    engine.onEarlyBookCue((ev) => {
      post({
        type: 'early_book_cue',
        bookName: ev.book.name,
        bookId: ev.book.id,
        text: ev.windowText,
        timestamp: ev.timestamp
      });
    });

    engine.onUtterance((ev) => {
      post({ type: 'utterance', text: ev.text, timestamp: ev.timestamp });
    });

    post({ type: 'status', available: true, reason: 'Sherpa Zipformer streaming worker online' });
  } catch (err: any) {
    post({
      type: 'error',
      available: false,
      reason: `Sherpa initialization failed: ${err?.message || String(err)}`
    });
  }
}

if (parentPort && typeof parentPort.on === 'function') {
  parentPort.on('message', (e: { data?: any }) => {
    const msg = e?.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'audio_frame' && engine && msg.samples) {
      const pcm =
        msg.samples instanceof Int16Array
          ? msg.samples
          : new Int16Array(msg.samples.buffer || msg.samples);
      engine.processPcmFrame(pcm, msg.timestamp || Date.now());
    } else if (msg.type === 'reset' && engine) {
      engine.reset();
    } else if (msg.type === 'shutdown') {
      engine?.reset();
      process.exit(0);
    }
  });
}

initNativeSherpa();
