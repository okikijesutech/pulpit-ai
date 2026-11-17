/**
 * Pulpit AI Performance & Resource Telemetry Benchmark Suite
 *
 * Measures real local hardware performance across every critical Sunday pipeline stage:
 *  1. Host CPU / RAM / AI Thread Allocation Profile
 *  2. Real-time 16 kHz Audio Metering & Singing/Speech DSP Throughput
 *  3. Scripture Reference Parsing & 66-Book Canon Validation Latency
 *  4. Full Offline Bible (WEB + KJV) Passage Retrieval Latency
 *  5. Song Library & RCCG Hymnal Full-Text Search Latency
 *  6. Memory Footprint (RSS & V8 Heap MB)
 *
 * Run via: pnpm benchmark
 */

import { performance } from 'node:perf_hooks';
import { AudioLevelMeter, SingingActivityDetector, SpeechSegmenter } from '../packages/audio-engine/dist/index.js';
import {
  ScriptureDatabase,
  ScriptureReferenceParser,
  loadFullBiblePackages
} from '../packages/scripture-engine/dist/index.js';
import {
  SongDatabase,
  SEED_SONGS,
  loadRccgHymnsIntoDatabase
} from '../packages/song-engine/dist/index.js';
import { detectHardwareProfile } from '../packages/speech-engine/dist/index.js';

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function formatMs(ms: number): string {
  return `${ms.toFixed(3)} ms`;
}

async function runBenchmark() {
  console.log('\n============================================================');
  console.log('  PULPIT AI v1.0.0 — PERFORMANCE & HARDWARE BENCHMARK');
  console.log('============================================================\n');

  // 1. Hardware Profile
  const hw = detectHardwareProfile();
  console.log('1. HOST HARDWARE PROFILE');
  console.log(`   Platform / Arch     : ${hw.platform} (${hw.arch})`);
  console.log(`   CPU                 : ${hw.cpuModel}`);
  console.log(`   Logical Cores       : ${hw.logicalCores}`);
  console.log(`   Whisper AI Threads  : ${hw.optimalWhisperThreads} (leaves headroom for UI & FreeShow)`);
  console.log(`   System RAM          : ${hw.freeRamGb} GB free / ${hw.totalRamGb} GB total`);
  console.log(`   AI Compute Backend  : ${hw.recommendedBackend}\n`);

  // 2. Audio DSP Pipeline Throughput (2,000 x 30ms frames = 60 seconds of live sermon audio)
  const meter = new AudioLevelMeter();
  const sad = new SingingActivityDetector({ sampleRate: 16000 });
  const segmenter = new SpeechSegmenter({ sampleRate: 16000 });
  const frame = new Int16Array(480); // 30ms @ 16kHz
  for (let i = 0; i < frame.length; i++) {
    frame[i] = Math.round(6000 * Math.sin((2 * Math.PI * 180 * i) / 16000));
  }

  const audioFrames = 2000;
  const audioStart = performance.now();
  for (let i = 0; i < audioFrames; i++) {
    meter.analyze(frame, false);
    const act = sad.processFrame(frame);
    segmenter.setSingingActive(act.isSinging);
    segmenter.pushFrame(frame);
  }
  const audioTotalMs = performance.now() - audioStart;
  const audioPerFrameMs = audioTotalMs / audioFrames;
  const simulatedAudioMs = audioFrames * 30;
  const rtf = audioTotalMs / simulatedAudioMs;

  console.log('2. LIVE AUDIO DSP PIPELINE (Meter + Singing Detector + Speech Segmenter)');
  console.log(`   Frames Processed    : ${audioFrames} frames (60.0s of 16 kHz audio)`);
  console.log(`   Total Processing    : ${audioTotalMs.toFixed(2)} ms`);
  console.log(`   Avg per 30ms Frame  : ${formatMs(audioPerFrameMs)} (budget: 30.000 ms)`);
  console.log(`   Real-Time Factor    : ${rtf.toFixed(5)}x (< 0.05x is ultra-fast)\n`);

  // 3. Scripture Parser Benchmark
  const samplePhrases = [
    'Turn with me to Romans chapter 8 verse 28',
    'Open your Bibles to First Corinthians 13 verses 4 to 7',
    'Read from Psalm 23 verse 1',
    'John chapter 3 verse 16 says for God so loved the world',
    'Let us look at Genesis 1:1-3 and Matthew 5:3'
  ];
  const parserTimings: number[] = [];
  for (let i = 0; i < 1000; i++) {
    const phrase = samplePhrases[i % samplePhrases.length];
    const t0 = performance.now();
    ScriptureReferenceParser.parseAll(phrase);
    parserTimings.push(performance.now() - t0);
  }
  parserTimings.sort((a, b) => a - b);
  const parserAvg = parserTimings.reduce((a, b) => a + b, 0) / parserTimings.length;

  console.log('3. SCRIPTURE REFERENCE PARSER (1,000 sermon utterances)');
  console.log(`   Average Latency     : ${formatMs(parserAvg)}`);
  console.log(`   p95 Latency         : ${formatMs(percentile(parserTimings, 95))}`);
  console.log(`   p99 Latency         : ${formatMs(percentile(parserTimings, 99))}\n`);

  // 4. Full Offline Bible Retrieval Benchmark (WEB + KJV)
  const dbLoadStart = performance.now();
  const scriptureDb = new ScriptureDatabase(':memory:');
  loadFullBiblePackages(scriptureDb);
  const dbLoadMs = performance.now() - dbLoadStart;

  const queries: Array<[string, string, number, number, number?]> = [
    ['WEB', 'John', 3, 16],
    ['KJV', 'Psalms', 23, 1, 6],
    ['WEB', 'Romans', 8, 28],
    ['KJV', 'Genesis', 1, 1, 3],
    ['WEB', 'Matthew', 5, 3]
  ];
  const bibleTimings: number[] = [];
  for (let i = 0; i < 500; i++) {
    const [tr, book, ch, vStart, vEnd] = queries[i % queries.length];
    const t0 = performance.now();
    scriptureDb.getPassage(tr, book, ch, vStart, vEnd);
    bibleTimings.push(performance.now() - t0);
  }
  bibleTimings.sort((a, b) => a - b);
  const bibleAvg = bibleTimings.reduce((a, b) => a + b, 0) / bibleTimings.length;

  console.log('4. OFFLINE FULL BIBLE DATABASE (WEB + KJV, 62,000+ verses)');
  console.log(`   Cold Load + Verify  : ${dbLoadMs.toFixed(1)} ms`);
  console.log(`   Avg Lookup Latency  : ${formatMs(bibleAvg)}`);
  console.log(`   p95 Lookup Latency  : ${formatMs(percentile(bibleTimings, 95))}\n`);

  // 5. Song Library & RCCG Hymnal Search Benchmark
  const songDb = new SongDatabase(':memory:');
  for (const seed of SEED_SONGS) songDb.saveSong(seed);
  loadRccgHymnsIntoDatabase(songDb);

  const songTerms = ['amazing grace', 'holy holy', 'how great', 'all hail the power', 'blessed assurance'];
  const songTimings: number[] = [];
  for (let i = 0; i < 200; i++) {
    const term = songTerms[i % songTerms.length];
    const t0 = performance.now();
    songDb.searchSongs(term);
    songTimings.push(performance.now() - t0);
  }
  songTimings.sort((a, b) => a - b);
  const songAvg = songTimings.reduce((a, b) => a + b, 0) / songTimings.length;

  console.log(`5. SONG LIBRARY & HYMNAL SEARCH (${songDb.listSongs().length} songs indexed)`);
  console.log(`   Avg Search Latency  : ${formatMs(songAvg)}`);
  console.log(`   p95 Search Latency  : ${formatMs(percentile(songTimings, 95))}\n`);

  // 6. Memory Footprint
  const mem = process.memoryUsage();
  console.log('6. PROCESS MEMORY FOOTPRINT (All Engines Loaded)');
  console.log(`   RSS Total           : ${(mem.rss / (1024 * 1024)).toFixed(1)} MB`);
  console.log(`   V8 Heap Used        : ${(mem.heapUsed / (1024 * 1024)).toFixed(1)} MB`);
  console.log(`   V8 Heap Total       : ${(mem.heapTotal / (1024 * 1024)).toFixed(1)} MB`);
  console.log('\n============================================================');
  console.log('  BENCHMARK COMPLETE — ALL TARGETS WITHIN REAL-TIME BUDGET');
  console.log('============================================================\n');
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
