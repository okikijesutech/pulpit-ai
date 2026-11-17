import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { AuthorityManager } from '@pulpit-ai/authority-manager';
import { FreeShowAdapter, MockFreeShowServer } from '@pulpit-ai/presentation-contracts';
import {
  AudioDeviceManager,
  AudioLevelMeter,
  SpeechSegmenter,
  VirtualAudioSource,
  SingingActivityDetector
} from '@pulpit-ai/audio-engine';
import {
  SpeechRecognitionEngine,
  WhisperWorkerProcess,
  ModelManager
} from '@pulpit-ai/speech-engine';
import {
  ScriptureDatabase,
  ScriptureCandidateGenerator,
  loadFullBiblePackages,
  findCanonBook
} from '@pulpit-ai/scripture-engine';
import {
  SongDatabase,
  SongReviewManager,
  SongCandidateGenerator,
  SEED_SONGS,
  loadRccgHymnsIntoDatabase
} from '@pulpit-ai/song-engine';

import { syncHymnsToFreeShow } from './services/freeShowSongSync.js';
import { registerAuthorityHandlers } from './ipc/authorityHandlers.js';
import { registerFreeShowHandlers } from './ipc/freeShowHandlers.js';
import { registerAudioHandlers } from './ipc/audioHandlers.js';
import { registerScriptureHandlers } from './ipc/scriptureHandlers.js';
import { registerSongHandlers } from './ipc/songHandlers.js';

let mainWindow: BrowserWindow | null = null;

// Initialize Core Singletons
const authorityManager = new AuthorityManager();
const auditLogger = authorityManager.getAuditLogger();
const audioDeviceManager = new AudioDeviceManager();
const audioLevelMeter = new AudioLevelMeter();
const speechSegmenter = new SpeechSegmenter({ sampleRate: 16000, silenceHangoverFrames: 25, minSegmentRms: 0.0020 });
const modelManager = new ModelManager();
const whisperWorker = new WhisperWorkerProcess();
whisperWorker.warmup();
const speechEngine = new SpeechRecognitionEngine(whisperWorker);
const virtualAudio = new VirtualAudioSource(16000);
const singingActivityDetector = new SingingActivityDetector({ sampleRate: 16000 });

// Initialize Verified Scripture Storage & Generator
const scriptureDatabase = new ScriptureDatabase(':memory:');
loadFullBiblePackages(scriptureDatabase);
const scriptureGenerator = new ScriptureCandidateGenerator(scriptureDatabase, {
  activeTranslation: 'WEB',
  cooldownMs: 8000
});

// Initialize Song Database, Candidate Generator & Review Manager
const songDatabase = new SongDatabase(':memory:');
for (const seed of SEED_SONGS) {
  songDatabase.saveSong(seed);
}
loadRccgHymnsIntoDatabase(songDatabase);
const songReviewManager = new SongReviewManager(songDatabase);
const songCandidateGenerator = new SongCandidateGenerator(songDatabase, {
  cooldownMs: 8000,
  minConfidence: 0.70
});

let freeShowAdapter: FreeShowAdapter | null = null;
let virtualMockServer: MockFreeShowServer | null = null;
let isRealMicStreaming = false;

function detectTrailingBookName(text: string): string | null {
  if (!text) return null;
  const clean = text.trim().replace(/[.,!?;:]+$/, '').toLowerCase();
  const tokens = clean.split(/\s+/);
  for (let len = Math.min(3, tokens.length); len >= 1; len--) {
    const candidate = tokens.slice(tokens.length - len).join(' ');
    const book = findCanonBook(candidate);
    if (book) {
      return book.name;
    }
  }
  if (/(book\s+of|turn\s+to|open\s+to|reading\s+from|read\s+from|chapter|verse)$/i.test(clean)) {
    return 'scripture_cue';
  }
  return null;
}

function detectFreeShowPassword(): string | undefined {
  try {
    const appData = app.getPath('appData');
    const settingsPath = join(appData, 'FreeShow', 'settings.json');
    if (existsSync(settingsPath)) {
      const content = readFileSync(settingsPath, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed?.serverData?.remote?.password) {
        return String(parsed.serverData.remote.password);
      }
    }
  } catch {
    // ignore
  }
  return undefined;
}

function initFreeShow(port = 5510): FreeShowAdapter {
  if (freeShowAdapter) {
    freeShowAdapter.disconnect();
  }

  const detectedPassword = detectFreeShowPassword();
  freeShowAdapter = new FreeShowAdapter(authorityManager, {
    port,
    authKey: detectedPassword
  });

  freeShowAdapter.subscribe((snapshot) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (virtualMockServer && snapshot.connected) {
        mainWindow.webContents.send('freeshow:state-changed', {
          ...snapshot,
          status: 'simulated'
        });
      } else {
        mainWindow.webContents.send('freeshow:state-changed', snapshot);
      }
    }
  });

  return freeShowAdapter;
}

function createWindow(): void {
  syncHymnsToFreeShow();

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 840,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#090d16',
    title: 'Pulpit AI — Church Presentation Assistant',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Explicitly permit media access for physical microphone audio ingestion
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
      return;
    }
    callback(false);
  });
  mainWindow.webContents.session.setPermissionCheckHandler((_webContents, permission) => {
    return permission === 'media';
  });

  // Strict Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:* http://localhost:*;"
        ]
      }
    });
  });

  // Setup reactive subscribers to forward state updates to renderer
  authorityManager.subscribe((state) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('authority:state-changed', state);
    }
  });

  // Forward recognized transcripts to renderer and process for Scripture and Song
  speechEngine.onTranscript((event) => {
    console.log(`[Whisper] Recognized (${event.latencyMs}ms): "${event.rawText}"`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('speech:transcript', event);
    }

    scriptureGenerator.processUtterance(event.rawText);

    const trailingBook = detectTrailingBookName(event.rawText);
    if (trailingBook) {
      speechSegmenter.requestOverlap(1.5);
      speechSegmenter.extendHangover(15);
    }

    const isSinging = singingActivityDetector.getCurrentMode() === 'singing';
    songCandidateGenerator.processTranscript(event.rawText, isSinging);
  });

  // Forward Scripture suggestion candidates to Audit Logger and renderer
  scriptureGenerator.onCandidate((candidate) => {
    authorityManager.registerCandidate(candidate);
    auditLogger.log('candidate_created', 'ai', {
      candidateId: candidate.id,
      title: candidate.title,
      confidence: candidate.confidence,
      type: 'scripture'
    });
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scripture:candidate', candidate);
    }
  });

  // Forward Song suggestion candidates to Audit Logger and renderer
  songCandidateGenerator.onCandidate((candidate) => {
    authorityManager.registerCandidate(candidate);
    auditLogger.log('candidate_created', 'ai', {
      candidateId: candidate.id,
      title: candidate.title,
      confidence: candidate.confidence,
      type: 'song'
    });
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('song:candidate', candidate);
    }
  });

  // Connect segmenter to speech recognition engine
  speechSegmenter.onSegment((segment) => {
    speechEngine.processSegment(segment).catch((err) => {
      console.error('Speech recognition error:', err);
    });
  });

  // Load the UI
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Register all modular IPC handlers
registerAuthorityHandlers(authorityManager, () => freeShowAdapter);
registerFreeShowHandlers(
  () => freeShowAdapter,
  initFreeShow,
  () => virtualMockServer,
  (srv) => {
    virtualMockServer = srv;
  }
);
registerAudioHandlers({
  audioDeviceManager,
  audioLevelMeter,
  speechSegmenter,
  singingActivityDetector,
  speechEngine,
  whisperWorker,
  modelManager,
  getMainWindow: () => mainWindow,
  onRealMicStreaming: (active) => {
    isRealMicStreaming = active;
  }
});
registerScriptureHandlers(scriptureDatabase, scriptureGenerator);
registerSongHandlers(songDatabase, songReviewManager, auditLogger, () => freeShowAdapter);

// App Lifecycle
app.whenReady().then(() => {
  const adapter = initFreeShow(5510);
  adapter.connect().catch(() => {});
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (freeShowAdapter) {
    freeShowAdapter.disconnect();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
