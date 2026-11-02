import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';
import { AuthorityManager } from '@pulpit-ai/authority-manager';
import { FreeShowAdapter } from '@pulpit-ai/presentation-contracts';
import {
  AudioDeviceManager,
  AudioLevelMeter,
  SpeechSegmenter,
  VirtualAudioSource
} from '@pulpit-ai/audio-engine';
import {
  SpeechRecognitionEngine,
  WhisperWorkerProcess
} from '@pulpit-ai/speech-engine';
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

let freeShowAdapter: FreeShowAdapter | null = null;
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

  // Forward recognized transcripts to renderer
  speechEngine.onTranscript((event) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('speech:transcript', event);
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

    mainWindow.webContents.send('audio:level-changed', metrics);
  }, 100);
}

function initFreeShow(port = 5505): FreeShowAdapter {
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

ipcMain.handle('freeshow:connect', async (_event, port = 5505) => {
  const adapter = initFreeShow(port);
  const connected = await adapter.connect();
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
  whisperWorker.registerMockTranscript('sim_speech', phrase);

  // Synthesize and segment a 2-second speech audio stream
  const frameCount = 30;
  for (let i = 0; i < frameCount; i++) {
    speechSegmenter.pushFrame(virtualAudio.generateSyntheticSpeechFrame(0.03));
  }
  // Feed 15 silence frames to trigger hangover emission
  for (let i = 0; i < 15; i++) {
    speechSegmenter.pushFrame(new Int16Array(480));
  }
});

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
