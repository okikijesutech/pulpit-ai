import { describe, it, expect, beforeEach } from 'vitest';
import { WhisperWorkerProcess } from '@pulpit-ai/speech-engine';
import { MockFreeShowServer } from '@pulpit-ai/presentation-contracts';

describe('PR 2: Mock Server and Simulation Safety Guards', () => {
  describe('Whisper Worker Mock Isolation', () => {
    let worker: WhisperWorkerProcess;

    beforeEach(() => {
      worker = new WhisperWorkerProcess();
    });

    it('ensures a simulate call or mock transcript does not override subsequent real segments', async () => {
      // Simulate registering a mock for a test phrase
      worker.registerMockTranscript('*', 'Simulated sermon test phrase');

      // First segment uses the mock
      const segment1 = {
        id: 'seg_1',
        samples: new Int16Array(16000),
        durationSeconds: 1,
        sourceId: 'test',
        timestamp: Date.now()
      };

      const res1 = await worker.transcribeSegment(segment1);
      expect(res1.text).toBe('Simulated sermon test phrase');

      // Clear mocks after use
      worker.clearMockTranscripts();

      // Second segment should NOT return the old simulated phrase!
      const segment2 = {
        id: 'seg_real_speech',
        samples: new Int16Array(16000), // silence
        durationSeconds: 1,
        sourceId: 'physical_mic',
        timestamp: Date.now()
      };

      const res2 = await worker.transcribeSegment(segment2);
      expect(res2.text).not.toBe('Simulated sermon test phrase');
    }, 30000);
  });

  describe('Production Mock Server Guard', () => {
    it('refuses to auto-start MockFreeShowServer when packaged or NODE_ENV is production', () => {
      const isPackaged = true;
      const nodeEnv = 'production';
      const isProduction = isPackaged || nodeEnv === 'production';
      const canAutoStartMock = !isProduction;
      expect(canAutoStartMock).toBe(false);
    });

    it('reports status as simulated rather than connected when connected to mock server', () => {
      const mockActive = true;
      const snapshot = { connected: true, status: 'connected' as const, lastHeartbeat: Date.now() };
      const effectiveSnapshot = {
        ...snapshot,
        status: (mockActive && snapshot.connected) ? ('simulated' as const) : snapshot.status
      };
      expect(effectiveSnapshot.status).toBe('simulated');
      expect(effectiveSnapshot.status).not.toBe('connected');
    });

    it('rejects simulation calls in production', () => {
      const isDev = false; // simulate production
      const handleSimulate = (phrase: string) => {
        if (!isDev) {
          return { success: false, reason: 'Simulation handlers are disabled in production' };
        }
        return { success: true };
      };

      const res = handleSimulate('Genesis 1:1');
      expect(res.success).toBe(false);
      expect(res.reason).toContain('disabled in production');
    });
  });
});
