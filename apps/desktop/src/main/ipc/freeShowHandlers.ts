import { ipcMain, app } from 'electron';
import { IPresentationEngine, FreeShowAdapter, MockFreeShowServer } from '@pulpit-ai/presentation-contracts';
import { AllowlistedAction, PresentationCommand } from '@pulpit-ai/shared-types';
import { isAllowlistedAction, isValidLocalPort } from './ipcValidation.js';

export function registerFreeShowHandlers(
  getPresentationEngine: () => IPresentationEngine | null,
  initFreeShow: (port?: number) => FreeShowAdapter,
  getVirtualMockServer: () => MockFreeShowServer | null,
  setVirtualMockServer: (server: MockFreeShowServer | null) => void
): void {
  ipcMain.handle('freeshow:connect', async (_event, port = 5510) => {
    const safePort = isValidLocalPort(port) ? port : 5510;
    let adapter = initFreeShow(safePort);
    let connected = await adapter.connect();
    if (!connected && safePort === 5510) {
      adapter = initFreeShow(5505);
      connected = await adapter.connect();
    }
    if (!connected) {
      const isProduction = app.isPackaged || process.env.NODE_ENV === 'production';
      if (!isProduction) {
        let mockServer = getVirtualMockServer();
        if (!mockServer) {
          mockServer = new MockFreeShowServer({ port: 5510 });
          await mockServer.start();
          setVirtualMockServer(mockServer);
        }
        adapter = initFreeShow(5510);
        connected = await adapter.connect();
      }
    }
    return connected;
  });

  ipcMain.handle('freeshow:disconnect', () => {
    const engine = getPresentationEngine();
    if (engine) {
      engine.disconnect();
    }
    return { success: true };
  });

  ipcMain.handle('freeshow:get-snapshot', () => {
    const engine = getPresentationEngine();
    if (!engine) return null;
    const snapshot = engine.getSnapshot();
    const mockServer = getVirtualMockServer();
    if (mockServer && snapshot.connected && snapshot.status !== 'native_active') {
      return { ...snapshot, status: 'simulated' as const };
    }
    return snapshot;
  });

  ipcMain.handle(
    'freeshow:dispatch-command',
    async (_event, payload: { action: AllowlistedAction; data?: any }) => {
      if (!payload || !isAllowlistedAction(payload.action)) {
        return { success: false, reason: 'Blocked: Action is not on the strict FreeShow allowlist' };
      }

      const engine = getPresentationEngine();
      if (!engine) {
        return { success: false, reason: 'Presentation engine not initialized' };
      }

      const command: PresentationCommand = {
        action: payload.action,
        data: payload.data,
        source: 'operator',
        correlationId: `op_cmd_${Date.now()}`,
        createdAt: Date.now()
      };

      return await engine.dispatchCommand(command);
    }
  );
}
