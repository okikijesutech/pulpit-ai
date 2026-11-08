import { app, BrowserWindow, ipcMain } from 'electron';
import { join, dirname } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
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
  SongImportPipeline,
  SongCandidateGenerator,
  SEED_SONGS,
  ApprovalOptions,
  StagedImportSong,
  BackupManager,
  BackupArchive
} from '@pulpit-ai/song-engine';
import {
  AllowlistedAction,
  FreeShowCommand,
  FreeShowStateSnapshot,
  OperatorMode,
  SuggestionCandidate
} from '@pulpit-ai/shared-types';

let mainWindow: BrowserWindow | null = null;

// Initialize Core Singletons
const authorityManager = new AuthorityManager();
const auditLogger = authorityManager.getAuditLogger();
const audioDeviceManager = new AudioDeviceManager();
const audioLevelMeter = new AudioLevelMeter();
const speechSegmenter = new SpeechSegmenter({ sampleRate: 16000 });
const modelManager = new ModelManager();
const whisperWorker = new WhisperWorkerProcess();
whisperWorker.warmup();
const speechEngine = new SpeechRecognitionEngine(whisperWorker);
const virtualAudio = new VirtualAudioSource(16000);
const singingActivityDetector = new SingingActivityDetector({ sampleRate: 16000 });

// Initialize Verified Scripture Storage & Generator with full verified Bible data
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
const songReviewManager = new SongReviewManager(songDatabase);
const songCandidateGenerator = new SongCandidateGenerator(songDatabase, {
  cooldownMs: 8000,
  minConfidence: 0.70
});

let freeShowAdapter: FreeShowAdapter | null = null;
let virtualMockServer: MockFreeShowServer | null = null;
let isRealMicStreaming = false;

function syncHymnsToFreeShow(): void {
  try {
    const documentsPath = join(process.env.USERPROFILE || '', 'Documents', 'FreeShow', 'Shows');
    const appData = process.env.APPDATA || '';
    const showsJsonPath = join(appData, 'FreeShow', 'shows.json');

    if (!existsSync(documentsPath)) {
      mkdirSync(documentsPath, { recursive: true });
    }

    let showsIndex: Record<string, any> = {};
    if (existsSync(showsJsonPath)) {
      try {
        showsIndex = JSON.parse(readFileSync(showsJsonPath, 'utf8'));
      } catch {
        showsIndex = {};
      }
    }

    for (const song of SEED_SONGS) {
      const showId = song.id;
      const title = song.canonicalTitle;
      const primaryVersion = song.versions.find((v) => v.isDefault) || song.versions[0];
      if (!primaryVersion) continue;

      const slidesObj: Record<string, any> = {};
      const layoutSlides: { id: string }[] = [];

      primaryVersion.sections.forEach((sec, idx) => {
        const slideId = `slide_${sec.id || idx}`;
        layoutSlides.push({ id: slideId });

        const verseText = sec.lines.join('\n');
        slidesObj[slideId] = {
          group: sec.label,
          color: null,
          settings: {},
          notes: '',
          items: [
            {
              style: 'top: 60px; left: 60px; width: 1800px; height: 860px; display: flex; align-items: center; justify-content: center;',
              align: 'text-align: center;',
              lines: [
                {
                  align: 'text-align: center;',
                  text: [
                    {
                      value: verseText,
                      style: 'font-size: 75px; font-weight: bold; color: #ffffff;'
                    }
                  ]
                }
              ]
            },
            {
              style: 'top: 940px; left: 60px; width: 1800px; height: 80px;',
              align: 'text-align: left;',
              lines: [
                {
                  align: 'text-align: left;',
                  text: [
                    {
                      value: `${title} — ${sec.label}`,
                      style: 'font-size: 32px; color: rgba(255, 255, 255, 0.7);'
                    }
                  ]
                }
              ],
              decoration: true
            }
          ]
        };
      });

      const showData = [
        showId,
        {
          name: title,
          category: 'song',
          settings: { activeLayout: 'default', template: 'song' },
          timestamps: { created: Date.now(), modified: Date.now(), used: Date.now() },
          quickAccess: {},
          meta: { author: song.author, copyright: song.copyright },
          slides: slidesObj,
          layouts: {
            default: {
              name: 'Default',
              notes: '',
              slides: layoutSlides
            }
          },
          media: {}
        }
      ];

      const filePath = join(documentsPath, `${title}.show`);
      writeFileSync(filePath, JSON.stringify(showData), 'utf8');

      // Register both showId and title in FreeShow index for seamless lookup
      showsIndex[showId] = {
        name: title,
        category: 'song',
        timestamps: { created: Date.now(), modified: Date.now(), used: Date.now() },
        quickAccess: {}
      };
      showsIndex[title] = {
        name: title,
        category: 'song',
        timestamps: { created: Date.now(), modified: Date.now(), used: Date.now() },
        quickAccess: {}
      };
    }

    if (existsSync(dirname(showsJsonPath))) {
      writeFileSync(showsJsonPath, JSON.stringify(showsIndex), 'utf8');
    }
  } catch (err) {
    console.warn('FreeShow song sync warning:', err);
  }
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

    // Ingest raw speech through guarded Scripture candidate generator with guarded rolling context window
    scriptureGenerator.processUtterance(event.rawText);

    // PR 8: Detect if a Bible book name appears near the end of the segment and overlap into next segment
    const trailingBook = detectTrailingBookName(event.rawText);
    if (trailingBook) {
      console.log(`[Audio/Segmenter] Trailing book "${trailingBook}" detected near segment end. Requesting overlap into next segment.`);
      speechSegmenter.requestOverlap(1.5);
      speechSegmenter.extendHangover(15);
    }

    // Ingest raw speech into Song Candidate Generator
    const isSinging = singingActivityDetector.getCurrentMode() === 'singing';
    songCandidateGenerator.processTranscript(event.rawText, isSinging);
  });

  // Forward Scripture suggestion candidates to Audit Logger, Registry, and renderer
  scriptureGenerator.onCandidate((candidate) => {
    console.log(`[Scripture] Suggested reference: "${candidate.title}"`);
    // PR 3: Register candidate in main process authority registry with 2-minute validity
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

  // Forward Song suggestion candidates to Audit Logger, Registry, and renderer
  songCandidateGenerator.onCandidate((candidate) => {
    console.log(`[Song] Suggested hymn: "${candidate.title}"`);
    // PR 3: Register candidate in main process authority registry with 2-minute validity
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
    console.log(`[Audio] Speech segment detected: ${(segment.durationSeconds).toFixed(1)}s -> Whisper transcribing...`);
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
  return null;
}

function detectFreeShowPassword(): string | undefined {
  try {
    const appData = process.env.APPDATA || '';
    const settingsPath = join(appData, 'FreeShow', 'settings.json');
    if (existsSync(settingsPath)) {
      const content = readFileSync(settingsPath, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed?.serverData?.remote?.password) {
        return String(parsed.serverData.remote.password);
      }
    }
  } catch (err) {
    // ignore
  }
  return undefined;
}

function initFreeShow(port = 5510): FreeShowAdapter {
  if (freeShowAdapter) {
    freeShowAdapter.disconnect();
  }

  const detectedPassword = detectFreeShowPassword();
  // PR 2: Read authKey from operator settings or detected password (no hard-coded '1445')
  const authKey = process.env.FREESHOW_AUTH_KEY || detectedPassword || undefined;

  freeShowAdapter = new FreeShowAdapter(authorityManager, {
    host: '127.0.0.1',
    port,
    authKey
  });

  freeShowAdapter.subscribe((snapshot) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      // In dev, show persistent simulated status if connected through mock server; never report plain "connected"
      const effectiveSnapshot: FreeShowStateSnapshot = {
        ...snapshot,
        status: (virtualMockServer && snapshot.connected) ? 'simulated' : snapshot.status
      };
      mainWindow.webContents.send('freeshow:state-changed', effectiveSnapshot);
    }
  });

  return freeShowAdapter;
}

// Register IPC Handlers
ipcMain.handle('authority:get-state', () => {
  return authorityManager.getState();
});

ipcMain.handle('authority:set-lock', (_event, active: boolean) => {
  authorityManager.setManualLock(active);
});

ipcMain.handle('authority:set-mode', (_event, mode: OperatorMode) => {
  authorityManager.setOperatorMode(mode);
});

ipcMain.handle('freeshow:connect', async (_event, port = 5510) => {
  let adapter = initFreeShow(port);
  let connected = await adapter.connect();
  if (!connected && port === 5510) {
    // Fallback check on port 5505
    adapter = initFreeShow(5505);
    connected = await adapter.connect();
  }
  if (!connected) {
    // PR 2: Mock server: Don’t auto-start it in production.
    const isProduction = app.isPackaged || process.env.NODE_ENV === 'production';
    if (!isProduction) {
      // Automatically launch Virtual FreeShow Mock Server for seamless local dev testing
      if (!virtualMockServer) {
        virtualMockServer = new MockFreeShowServer({ port: 5510 });
        await virtualMockServer.start();
      }
      adapter = initFreeShow(5510);
      connected = await adapter.connect();
    }
  }
  return connected;
});

ipcMain.handle('freeshow:disconnect', () => {
  if (freeShowAdapter) {
    freeShowAdapter.disconnect();
  }
});

ipcMain.handle('freeshow:get-snapshot', () => {
  if (!freeShowAdapter) return null;
  const snapshot = freeShowAdapter.getSnapshot();
  if (virtualMockServer && snapshot.connected) {
    return { ...snapshot, status: 'simulated' as const };
  }
  return snapshot;
});

ipcMain.handle(
  'freeshow:dispatch-command',
  async (_event, { action, data }: { action: AllowlistedAction; data?: any }) => {
    if (!freeShowAdapter) {
      return { success: false, reason: 'FreeShow adapter not initialized' };
    }

    const command: FreeShowCommand = {
      action,
      data,
      source: 'operator',
      correlationId: `op_cmd_${Date.now()}`,
      createdAt: Date.now()
    };

    return await freeShowAdapter.dispatchCommand(command);
  }
);

ipcMain.handle(
  'authority:approve-candidate',
  async (_event, candidateId: string) => {
    if (!freeShowAdapter) {
      return { success: false, reason: 'FreeShow adapter not initialized' };
    }

    // PR 3: Approve strictly by candidateId. Looks up stored payload from registry.
    const approval = authorityManager.approveCandidate(candidateId);
    if (!approval.success || !approval.command) {
      return {
        success: false,
        reason: approval.reason || 'Approval blocked by Authority Manager'
      };
    }

    return await freeShowAdapter.dispatchCommand(approval.command);
  }
);

ipcMain.handle('audit:get-events', () => {
  return auditLogger.getEvents(50);
});

ipcMain.handle('audio:get-devices', () => {
  return audioDeviceManager.getDevices();
});

ipcMain.handle('audio:update-devices', (_event, devices: any[]) => {
  audioDeviceManager.updateAvailableDevices(devices);
  return audioDeviceManager.getDevices();
});

ipcMain.handle('audio:select-device', (_event, deviceId: string) => {
  const device = audioDeviceManager.selectActiveDevice(deviceId);
  speechSegmenter.setSourceId(deviceId);
  return device;
});

// Live Physical Microphone Streaming Handler (PR 6 & PR 8: Clean Audio & Singing Separation)
ipcMain.on('audio:stream-chunk', (_event, buffer: any, isMuted = false) => {
  isRealMicStreaming = true;
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (isMuted) {
    speechSegmenter.reset();
    mainWindow.webContents.send('audio:level-changed', {
      rmsLevel: 0,
      decibels: -100,
      isClipping: false,
      isSilent: true,
      state: 'muted'
    });
    return;
  }

  // Safely extract 16-bit PCM samples from Node.js Buffer or raw ArrayBuffer without byte-splitting
  let int16: Int16Array;
  if (Buffer.isBuffer(buffer)) {
    int16 = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
  } else if (buffer instanceof ArrayBuffer) {
    int16 = new Int16Array(buffer);
  } else if (ArrayBuffer.isView(buffer)) {
    const v = buffer as ArrayBufferView;
    int16 = new Int16Array(v.buffer, v.byteOffset, v.byteLength / 2);
  } else {
    int16 = new Int16Array(0);
  }
  const metrics = audioLevelMeter.analyze(int16, isMuted);
  const activityMetrics = singingActivityDetector.processFrame(int16);

  // PR 8: Send singing away from the speech path
  if (activityMetrics.isSinging) {
    speechSegmenter.setSingingActive(true);
  } else {
    speechSegmenter.setSingingActive(false);
    speechSegmenter.pushFrame(int16);
  }

  mainWindow.webContents.send('audio:level-changed', metrics);
  mainWindow.webContents.send('audio:activity-mode', activityMetrics);
});

// Explicit audio state report (e.g. disconnected hardware, muted)
ipcMain.on('audio:report-state', (_event, state: string) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (state === 'disconnected') {
    speechSegmenter.reset();
    mainWindow.webContents.send('audio:level-changed', AudioLevelMeter.disconnectedMetrics());
  } else if (state === 'muted') {
    speechSegmenter.reset();
    mainWindow.webContents.send('audio:level-changed', {
      rmsLevel: 0,
      decibels: -100,
      isClipping: false,
      isSilent: true,
      state: 'muted'
    });
  }
});

// Explicit model download permission and disk safety check (PR 7)
ipcMain.handle('models:check-download', async (_event, modelId: string) => {
  const modelsDir = join(app.getPath('userData'), 'models');
  return await modelManager.requestDownloadPermission(modelId, modelsDir);
});

// Live Physical Microphone Direct Speech Transcript Handler
ipcMain.on('speech:direct-transcript', (_event, { text, isSinging }: { text: string; isSinging?: boolean }) => {
  if (!text || text.trim().length === 0) return;
  if (isSinging) {
    const toneFrame = new Int16Array(480);
    for (let i = 0; i < 480; i++) {
      toneFrame[i] = Math.round(10000 * Math.sin((2 * Math.PI * 220 * i) / 16000));
    }
    for (let i = 0; i < 8; i++) {
      singingActivityDetector.processFrame(toneFrame);
    }
  }
  speechEngine.ingestDirectTranscript(text.trim(), 'physical_mic');
});

ipcMain.handle('audio:simulate-speech', async (_event, phrase: string) => {
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
  if (!isDev) {
    console.warn('[Security] audio:simulate-speech rejected in production environment.');
    return { success: false, reason: 'Simulation handlers are disabled in production' };
  }

  whisperWorker.registerMockTranscript('*', phrase);
  try {
    speechEngine.ingestDirectTranscript(phrase);
  } finally {
    // Clear mock registry after use so it cannot override real inference
    whisperWorker.clearMockTranscripts();
  }
  return { success: true };
});

ipcMain.handle('audio:simulate-singing', async (_event, lyrics: string) => {
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
  if (!isDev) {
    console.warn('[Security] audio:simulate-singing rejected in production environment.');
    return { success: false, reason: 'Simulation handlers are disabled in production' };
  }

  whisperWorker.registerMockTranscript('*', lyrics);
  try {
    // Synthesize harmonic tone frames to activate singing mode detector
    const toneFrame = new Int16Array(480);
    for (let i = 0; i < 480; i++) {
      toneFrame[i] = Math.round(10000 * Math.sin((2 * Math.PI * 220 * i) / 16000));
    }
    for (let i = 0; i < 8; i++) {
      singingActivityDetector.processFrame(toneFrame);
    }

    speechEngine.ingestDirectTranscript(lyrics);
  } finally {
    // Clear mock registry after use so it cannot override real inference
    whisperWorker.clearMockTranscripts();
  }
  return { success: true };
});

// Scripture Engine Handlers
ipcMain.handle('scripture:get-translations', () => {
  return scriptureDatabase.listTranslations();
});

ipcMain.handle('scripture:set-translation', (_event, translationId: string) => {
  scriptureGenerator.setActiveTranslation(translationId);
  return scriptureGenerator.getActiveTranslation();
});

ipcMain.handle(
  'scripture:lookup-passage',
  (_event, { translation, book, chapter, verseStart, verseEnd }) => {
    return scriptureDatabase.getPassage(translation, book, chapter, verseStart, verseEnd);
  }
);

// Song Library & Import Handlers
ipcMain.handle('songs:list', () => {
  return songDatabase.listSongs();
});

ipcMain.handle('songs:search', (_event, query: string) => {
  return songDatabase.searchSongs(query);
});

ipcMain.handle('songs:get', (_event, id: string) => {
  return songDatabase.getSong(id);
});

ipcMain.handle(
  'songs:stage-file',
  async (_event, { name, base64 }: { name: string; base64: string }) => {
    try {
      const buffer = Buffer.from(base64, 'base64');
      const importResult = await SongImportPipeline.importFile(name, buffer);
      if (!importResult.success) {
        return {
          success: false,
          errors: importResult.errors,
          warnings: importResult.warnings,
          quarantined: importResult.quarantined
        };
      }

      const stagedList: StagedImportSong[] = [];
      for (const draft of importResult.songs) {
        const staged = songReviewManager.stageDraft(draft);
        stagedList.push(staged);
        auditLogger.log('candidate_created', 'operator', {
          stagedId: staged.id,
          title: draft.title,
          duplicateStatus: staged.duplicateCheck.status
        });
      }

      return {
        success: true,
        staged: stagedList,
        warnings: importResult.warnings
      };
    } catch (err: any) {
      return {
        success: false,
        errors: [err.message || 'Unknown import error']
      };
    }
  }
);

ipcMain.handle(
  'songs:stage-text',
  async (_event, { text, title }: { text: string; title?: string }) => {
    try {
      const buffer = Buffer.from(text, 'utf8');
      const fileName = title ? `${title.replace(/\s+/g, '_')}.txt` : 'pasted_lyrics.txt';
      const importResult = await SongImportPipeline.importFile(fileName, buffer);
      if (!importResult.success || importResult.songs.length === 0) {
        return { success: false, errors: importResult.errors || ['Failed to parse lyrics'] };
      }

      const draft = importResult.songs[0];
      if (title && (!draft.title || draft.title === fileName)) {
        draft.title = title;
      }
      const staged = songReviewManager.stageDraft(draft);
      return { success: true, staged };
    } catch (err: any) {
      return { success: false, errors: [err.message || 'Failed to stage lyrics'] };
    }
  }
);

ipcMain.handle('songs:list-staged', () => {
  return songReviewManager.listStaged();
});

ipcMain.handle(
  'songs:approve-staged',
  (_event, { stagedId, options }: { stagedId: string; options: ApprovalOptions }) => {
    try {
      const song = songReviewManager.approveImport(stagedId, options);
      auditLogger.log('candidate_approved', 'operator', {
        action: 'approve_song_import',
        songId: song.id,
        title: song.canonicalTitle,
        actionTaken: options.action
      });
      return { success: true, song };
    } catch (err: any) {
      return { success: false, error: err.message || 'Approval failed' };
    }
  }
);

ipcMain.handle(
  'songs:reject-staged',
  (_event, { stagedId, reason }: { stagedId: string; reason: string }) => {
    const ok = songReviewManager.rejectImport(stagedId, reason);
    auditLogger.log('candidate_rejected', 'operator', {
      action: 'reject_song_import',
      stagedId,
      reason
    });
    return { success: ok };
  }
);

ipcMain.handle(
  'songs:project-section',
  async (
    _event,
    {
      songTitle,
      sectionLabel,
      sectionIndex
    }: { songTitle: string; sectionLabel: string; sectionIndex: number }
  ) => {
    if (!freeShowAdapter) {
      return { success: false, reason: 'FreeShow adapter not initialized' };
    }

    const showCommand: FreeShowCommand = {
      action: 'name_select_show',
      data: { name: songTitle },
      source: 'operator',
      correlationId: `song_show_${Date.now()}`,
      createdAt: Date.now()
    };
    const showResult = await freeShowAdapter.dispatchCommand(showCommand);
    if (!showResult.success) {
      return showResult;
    }

    const slideCommand: FreeShowCommand = {
      action: 'index_select_slide',
      data: { index: sectionIndex, name: sectionLabel },
      source: 'operator',
      correlationId: `song_slide_${Date.now()}`,
      createdAt: Date.now()
    };
    return await freeShowAdapter.dispatchCommand(slideCommand);
  }
);

// Backup & Disaster Recovery Handlers
ipcMain.handle('backup:create', () => {
  const auditEvents = auditLogger.getEvents(500);
  return BackupManager.createBackup(songDatabase, auditEvents, '0.1.0');
});

ipcMain.handle(
  'backup:restore',
  (_event, { archive, clearExisting }: { archive: BackupArchive; clearExisting?: boolean }) => {
    const res = BackupManager.restoreBackup(archive, songDatabase, clearExisting);
    if (res.success) {
      auditLogger.log('candidate_approved', 'operator', {
        action: 'database_restore',
        restoredSongCount: res.restoredSongCount
      });
    }
    return res;
  }
);

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
