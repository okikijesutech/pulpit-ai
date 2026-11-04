import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURES_DIR = join(__dirname, '../tests/fixtures');
mkdirSync(FIXTURES_DIR, { recursive: true });

export interface FixtureMetadata {
  id: string;
  filename: string;
  category: 'accented_preaching' | 'quiet_preaching' | 'noisy_preaching' | 'choir' | 'instrument' | 'silence';
  durationSeconds: number;
  groundTruthTranscript: string;
  expectedReference: string | null;
  expectedMode: 'speech' | 'singing' | 'silence';
  expectedBook?: string;
  expectedChapter?: number;
  expectedVerse?: number;
}

export function createWavBuffer(samples: Int16Array, sampleRate = 16000): Buffer {
  const byteRate = sampleRate * 2; // 1 channel * 2 bytes/sample
  const blockAlign = 2; // 1 channel * 2 bytes/sample
  const subChunk2Size = samples.length * 2;
  const chunkSize = 36 + subChunk2Size;

  const header = Buffer.alloc(44);
  // RIFF chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(chunkSize, 4);
  header.write('WAVE', 8);

  // "fmt " sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(1, 22); // NumChannels (1 = Mono)
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34); // BitsPerSample (16 bits)

  // "data" sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(subChunk2Size, 40);

  const sampleBuffer = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
  return Buffer.concat([header, sampleBuffer]);
}

export function parseWav(buffer: Buffer): {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  samples: Int16Array;
} {
  const sampleRate = buffer.readUInt32LE(24);
  const channels = buffer.readUInt16LE(22);
  const bitsPerSample = buffer.readUInt16LE(34);

  // Locate data chunk
  let offset = 12;
  while (offset < buffer.length - 8) {
    const chunkId = buffer.toString('utf8', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkId === 'data') {
      const pcmBytes = buffer.subarray(offset + 8, offset + 8 + chunkSize);
      const samples = new Int16Array(
        pcmBytes.buffer.slice(pcmBytes.byteOffset, pcmBytes.byteOffset + pcmBytes.byteLength)
      );
      return { sampleRate, channels, bitsPerSample, samples };
    }
    offset += 8 + chunkSize;
  }

  // Fallback to offset 44
  const pcmBytes = buffer.subarray(44);
  const samples = new Int16Array(
    pcmBytes.buffer.slice(pcmBytes.byteOffset, pcmBytes.byteOffset + pcmBytes.byteLength)
  );
  return { sampleRate, channels, bitsPerSample, samples };
}

// Synthesis helpers
function generateSpeechSignal(
  durationSeconds: number,
  sampleRate = 16000,
  options: {
    fundamentalHz?: number;
    amplitude?: number;
    rhythmHz?: number;
    accentPitchShift?: number;
  } = {}
): Int16Array {
  const count = Math.floor(sampleRate * durationSeconds);
  const samples = new Int16Array(count);
  const baseF0 = options.fundamentalHz ?? 140;
  const amp = options.amplitude ?? 0.6;
  const rhythm = options.rhythmHz ?? 3.5;

  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    // Syllable phase (3.5 syllables per second)
    const syllablePhase = (t * rhythm) % 1.0;
    const isVowel = syllablePhase < 0.65; // 65% vowel, 35% consonant / closure

    let sampleVal = 0;
    if (isVowel) {
      // Conversational preaching pitch contour fluctuates significantly across syllables (±20%)
      const pitchMod = 1.0 + 0.18 * Math.sin(2 * Math.PI * 1.8 * t) + 0.12 * Math.cos(2 * Math.PI * 5.2 * t);
      const f0 = baseF0 * pitchMod;
      const fundamental = Math.sin(2 * Math.PI * f0 * t);
      const formant1 = 0.5 * Math.sin(2 * Math.PI * (f0 * 4.5) * t);
      const formant2 = 0.25 * Math.sin(2 * Math.PI * (f0 * 11.0) * t);
      const vowelEnv = Math.sin(Math.PI * (syllablePhase / 0.65));
      sampleVal = (fundamental + formant1 + formant2) * 0.5 * vowelEnv;
    } else {
      // Unvoiced consonant / fricative noise (burst of turbulence)
      const noise = (Math.random() * 2 - 1) * 0.25;
      sampleVal = noise;
    }

    const val = sampleVal * amp;
    samples[i] = Math.round(Math.max(-1, Math.min(1, val)) * 32767);
  }
  return samples;
}

function generateNoisySpeechSignal(
  durationSeconds: number,
  sampleRate = 16000,
  noiseAmp = 0.008
): Int16Array {
  const speech = generateSpeechSignal(durationSeconds, sampleRate, { fundamentalHz: 150, amplitude: 0.55 });
  const result = new Int16Array(speech.length);
  for (let i = 0; i < speech.length; i++) {
    const noise = (Math.random() * 2 - 1) * noiseAmp * 32767;
    const combined = speech[i] + noise;
    result[i] = Math.round(Math.max(-32768, Math.min(32767, combined)));
  }
  return result;
}

function generateChoirWorshipSignal(durationSeconds: number, sampleRate = 16000): Int16Array {
  const count = Math.floor(sampleRate * durationSeconds);
  const samples = new Int16Array(count);
  // Sustained vocal melody at 220Hz (A3) with warm vocal formants and 5Hz vibrato (typical worship singing)
  const f0 = 220;
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    // Pitch stability within ±1.2% (classic vocal vibrato)
    const vibrato = 1 + 0.012 * Math.sin(2 * Math.PI * 5.0 * t);
    const pitch = f0 * vibrato;

    // Rich harmonic spectrum of sustained human vocal singing
    const fundamental = Math.sin(2 * Math.PI * pitch * t);
    const harmonic2 = 0.55 * Math.sin(2 * Math.PI * (pitch * 2) * t);
    const harmonic3 = 0.35 * Math.sin(2 * Math.PI * (pitch * 3) * t);
    const harmonic4 = 0.15 * Math.sin(2 * Math.PI * (pitch * 4) * t);

    const val = (fundamental + harmonic2 + harmonic3 + harmonic4) * 0.45;
    samples[i] = Math.round(Math.max(-1, Math.min(1, val)) * 32767);
  }
  return samples;
}

function generateInstrumentPadSignal(durationSeconds: number, sampleRate = 16000): Int16Array {
  const count = Math.floor(sampleRate * durationSeconds);
  const samples = new Int16Array(count);
  // Sustained organ pipe / synthesizer pad at 330Hz (E4)
  const f0 = 330;
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    const tone1 = Math.sin(2 * Math.PI * f0 * t);
    const tone2 = 0.6 * Math.sin(2 * Math.PI * (f0 * 2) * t);
    const tone3 = 0.3 * Math.sin(2 * Math.PI * (f0 * 3) * t);
    const val = (tone1 + tone2 + tone3) * 0.4;
    samples[i] = Math.round(Math.max(-1, Math.min(1, val)) * 32767);
  }
  return samples;
}

function generateSilenceSignal(durationSeconds: number, sampleRate = 16000): Int16Array {
  return new Int16Array(Math.floor(sampleRate * durationSeconds));
}

// Generate the suite of fixtures
export const FIXTURE_DEFINITIONS: FixtureMetadata[] = [
  {
    id: 'preaching_accented_john316',
    filename: 'preaching_accented_john316.wav',
    category: 'accented_preaching',
    durationSeconds: 3.0,
    groundTruthTranscript: 'Turn in your Bibles to John chapter 3 verse 16',
    expectedReference: 'John 3:16',
    expectedMode: 'speech',
    expectedBook: 'John',
    expectedChapter: 3,
    expectedVerse: 16
  },
  {
    id: 'preaching_accented_romans828',
    filename: 'preaching_accented_romans828.wav',
    category: 'accented_preaching',
    durationSeconds: 2.5,
    groundTruthTranscript: 'We know that all things work together Romans chapter 8 verse 28',
    expectedReference: 'Romans 8:28',
    expectedMode: 'speech',
    expectedBook: 'Romans',
    expectedChapter: 8,
    expectedVerse: 28
  },
  {
    id: 'preaching_quiet_psalm23',
    filename: 'preaching_quiet_psalm23.wav',
    category: 'quiet_preaching',
    durationSeconds: 2.5,
    groundTruthTranscript: 'The Lord is my shepherd Psalm 23 verse 1',
    expectedReference: 'Psalms 23:1',
    expectedMode: 'speech',
    expectedBook: 'Psalms',
    expectedChapter: 23,
    expectedVerse: 1
  },
  {
    id: 'preaching_noisy_matthew53',
    filename: 'preaching_noisy_matthew53.wav',
    category: 'noisy_preaching',
    durationSeconds: 3.0,
    groundTruthTranscript: 'Blessed are the poor in spirit Matthew chapter 5 verse 3',
    expectedReference: 'Matthew 5:3',
    expectedMode: 'speech',
    expectedBook: 'Matthew',
    expectedChapter: 5,
    expectedVerse: 3
  },
  {
    id: 'choir_worship_amazing_grace',
    filename: 'choir_worship_amazing_grace.wav',
    category: 'choir',
    durationSeconds: 3.0,
    groundTruthTranscript: '',
    expectedReference: null,
    expectedMode: 'singing'
  },
  {
    id: 'instrument_organ_pad',
    filename: 'instrument_organ_pad.wav',
    category: 'instrument',
    durationSeconds: 2.5,
    groundTruthTranscript: '',
    expectedReference: null,
    expectedMode: 'singing' // Harmonic musical content
  },
  {
    id: 'ambient_silence',
    filename: 'ambient_silence.wav',
    category: 'silence',
    durationSeconds: 2.0,
    groundTruthTranscript: '',
    expectedReference: null,
    expectedMode: 'silence'
  }
];

export function generateAllFixtures(): void {
  for (const def of FIXTURE_DEFINITIONS) {
    let samples: Int16Array;
    switch (def.id) {
      case 'preaching_accented_john316':
        samples = generateSpeechSignal(def.durationSeconds, 16000, {
          fundamentalHz: 135,
          amplitude: 0.65,
          accentPitchShift: 1.25
        });
        break;
      case 'preaching_accented_romans828':
        samples = generateSpeechSignal(def.durationSeconds, 16000, {
          fundamentalHz: 145,
          amplitude: 0.6,
          accentPitchShift: 1.2
        });
        break;
      case 'preaching_quiet_psalm23':
        samples = generateSpeechSignal(def.durationSeconds, 16000, {
          fundamentalHz: 130,
          amplitude: 0.025, // Quiet speech
          accentPitchShift: 1.1
        });
        break;
      case 'preaching_noisy_matthew53':
        samples = generateNoisySpeechSignal(def.durationSeconds, 16000, 0.007);
        break;
      case 'choir_worship_amazing_grace':
        samples = generateChoirWorshipSignal(def.durationSeconds, 16000);
        break;
      case 'instrument_organ_pad':
        samples = generateInstrumentPadSignal(def.durationSeconds, 16000);
        break;
      case 'ambient_silence':
        samples = generateSilenceSignal(def.durationSeconds, 16000);
        break;
      default:
        samples = generateSilenceSignal(def.durationSeconds, 16000);
    }

    const wavBuffer = createWavBuffer(samples, 16000);
    const targetPath = join(FIXTURES_DIR, def.filename);
    writeFileSync(targetPath, wavBuffer);
    console.log(`Generated fixture: ${def.filename} (${(wavBuffer.length / 1024).toFixed(1)} KB)`);
  }

  const manifestPath = join(FIXTURES_DIR, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(FIXTURE_DEFINITIONS, null, 2), 'utf8');
  console.log(`Fixture manifest written to ${manifestPath}`);
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAllFixtures();
}
