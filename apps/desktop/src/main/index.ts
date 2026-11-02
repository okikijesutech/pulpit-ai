import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
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
  WhisperWorkerProcess
} from '@pulpit-ai/speech-engine';
import {
  ScriptureDatabase,
  ScriptureCandidateGenerator,
  WEB_PACKAGE,
  KJV_PACKAGE
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
const whisperWorker = new WhisperWorkerProcess();
const speechEngine = new SpeechRecognitionEngine(whisperWorker);
const virtualAudio = new VirtualAudioSource(16000);
const singingActivityDetector = new SingingActivityDetector({ sampleRate: 16000 });

// Initialize Verified Scripture Storage & Generator
const scriptureDatabase = new ScriptureDatabase(':memory:');
scriptureDatabase.loadPackage(WEB_PACKAGE);
scriptureDatabase.loadPackage(KJV_PACKAGE);
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
let levelMeterTimer: NodeJS.Timeout | null = null;

function createWindow(): void {
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

  // Strict Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:* http://localhost:*;"
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
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('speech:transcript', event);
    }
    // Ingest normalized speech into Scripture Candidate Generator
    scriptureGenerator.processTranscript(event.normalizedText);

    // Ingest normalized speech into Song Candidate Generator
    const isSinging = singingActivityDetector.getCurrentMode() === 'singing';
    songCandidateGenerator.processTranscript(event.normalizedText, isSinging);
  });

  // Forward Scripture suggestion candidates to Audit Logger and renderer
  scriptureGenerator.onCandidate((candidate) => {
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

  // Start periodic audio level meter broadcast (100ms)
  startLevelMeterBroadcast();

  // Load the UI
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (levelMeterTimer) {
      clearInterval(levelMeterTimer);
      levelMeterTimer = null;
    }
  });
}

function startLevelMeterBroadcast(): void {
  levelMeterTimer = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    // Simulate idle background room noise or active audio level
    const frame = virtualAudio.generateSyntheticSpeechFrame(0.05);
    const metrics = audioLevelMeter.analyze(frame);
    const activityMetrics = singingActivityDetector.processFrame(frame);

    mainWindow.webContents.send('audio:level-changed', metrics);
    mainWindow.webContents.send('audio:activity-mode', activityMetrics);
  }, 100);
}

function initFreeShow(port = 5510): FreeShowAdapter {
  if (freeShowAdapter) {
    freeShowAdapter.disconnect();
  }

  freeShowAdapter = new FreeShowAdapter(authorityManager, {
    host: '127.0.0.1',
    port
  });

  freeShowAdapter.subscribe((snapshot) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('freeshow:state-changed', snapshot);
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
    // Automatically launch Virtual FreeShow Mock Server for seamless local testing
    if (!virtualMockServer) {
      virtualMockServer = new MockFreeShowServer({ port: 5510 });
      await virtualMockServer.start();
    }
    adapter = initFreeShow(5510);
    connected = await adapter.connect();
  }
  return connected;
});

ipcMain.handle('freeshow:disconnect', () => {
  if (freeShowAdapter) {
    freeShowAdapter.disconnect();
  }
});

ipcMain.handle('freeshow:get-snapshot', () => {
  return freeShowAdapter ? freeShowAdapter.getSnapshot() : null;
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
  async (_event, candidate: SuggestionCandidate) => {
    if (!freeShowAdapter) {
      return { success: false, reason: 'FreeShow adapter not initialized' };
    }

    const approvedCommand = authorityManager.approveCandidate(candidate);
    if (!approvedCommand) {
      return {
        success: false,
        reason: 'Approval blocked by Authority Manager (Lock active or invalid state)'
      };
    }

    return await freeShowAdapter.dispatchCommand(approvedCommand);
  }
);

ipcMain.handle('audit:get-events', () => {
  return auditLogger.getEvents(50);
});

ipcMain.handle('audio:get-devices', () => {
  return audioDeviceManager.getDevices();
});

ipcMain.handle('audio:select-device', (_event, deviceId: string) => {
  const device = audioDeviceManager.selectActiveDevice(deviceId);
  speechSegmenter.setSourceId(deviceId);
  return device;
});

ipcMain.handle('audio:simulate-speech', async (_event, phrase: string) => {
  whisperWorker.registerMockTranscript('*', phrase);
  speechEngine.ingestDirectTranscript(phrase);
});

ipcMain.handle('audio:simulate-singing', async (_event, lyrics: string) => {
  whisperWorker.registerMockTranscript('*', lyrics);

  // Synthesize harmonic tone frames to activate singing mode detector
  const toneFrame = new Int16Array(480);
  for (let i = 0; i < 480; i++) {
    toneFrame[i] = Math.round(10000 * Math.sin((2 * Math.PI * 220 * i) / 16000));
  }
  for (let i = 0; i < 8; i++) {
    singingActivityDetector.processFrame(toneFrame);
  }

  speechEngine.ingestDirectTranscript(lyrics);
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
  initFreeShow(5505);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (levelMeterTimer) {
    clearInterval(levelMeterTimer);
  }
  if (freeShowAdapter) {
    freeShowAdapter.disconnect();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
