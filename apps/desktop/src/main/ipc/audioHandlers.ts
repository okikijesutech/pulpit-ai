import { ipcMain, app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import {
  AudioDeviceManager,
  AudioLevelMeter,
  SpeechSegmenter,
  SingingActivityDetector
} from '@pulpit-ai/audio-engine';
import {
  SpeechRecognitionEngine,
  WhisperWorkerProcess,
  ModelManager
} from '@pulpit-ai/speech-engine';

export interface AudioHandlerDeps {
  audioDeviceManager: AudioDeviceManager;
  audioLevelMeter: AudioLevelMeter;
  speechSegmenter: SpeechSegmenter;
  singingActivityDetector: SingingActivityDetector;
  speechEngine: SpeechRecognitionEngine;
  whisperWorker: WhisperWorkerProcess;
  modelManager: ModelManager;
  getMainWindow: () => BrowserWindow | null;
  onRealMicStreaming?: (active: boolean) => void;
}

export function registerAudioHandlers(deps: AudioHandlerDeps): void {
  const {
    audioDeviceManager,
    audioLevelMeter,
    speechSegmenter,
    singingActivityDetector,
    speechEngine,
    whisperWorker,
    modelManager,
    getMainWindow,
    onRealMicStreaming
  } = deps;

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

  // Live Physical Microphone Streaming Handler (Clean Audio & Singing Separation)
  ipcMain.on('audio:stream-chunk', (_event, buffer: any, isMuted = false) => {
    onRealMicStreaming?.(true);
    const mainWindow = getMainWindow();
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

    // Send singing away from the speech path
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
    const mainWindow = getMainWindow();
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

  // Explicit model download permission and disk safety check
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
      const toneFrame = new Int16Array(480);
      for (let i = 0; i < 480; i++) {
        toneFrame[i] = Math.round(10000 * Math.sin((2 * Math.PI * 220 * i) / 16000));
      }
      for (let i = 0; i < 8; i++) {
        singingActivityDetector.processFrame(toneFrame);
      }

      speechEngine.ingestDirectTranscript(lyrics);
    } finally {
      whisperWorker.clearMockTranscripts();
    }
    return { success: true };
  });
}
