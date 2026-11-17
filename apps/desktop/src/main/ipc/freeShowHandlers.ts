import { ipcMain, app } from 'electron';
import { FreeShowAdapter, MockFreeShowServer } from '@pulpit-ai/presentation-contracts';
import { AllowlistedAction, FreeShowCommand } from '@pulpit-ai/shared-types';

export function registerFreeShowHandlers(
  getFreeShowAdapter: () => FreeShowAdapter | null,
  initFreeShow: (port?: number) => FreeShowAdapter,
  getVirtualMockServer: () => MockFreeShowServer | null,
  setVirtualMockServer: (server: MockFreeShowServer | null) => void
): void {
  ipcMain.handle('freeshow:connect', async (_event, port = 5510) => {
    let adapter = initFreeShow(port);
    let connected = await adapter.connect();
    if (!connected && port === 5510) {
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
    const adapter = getFreeShowAdapter();
    if (adapter) {
      adapter.disconnect();
    }
    return { success: true };
  });

  ipcMain.handle('freeshow:get-snapshot', () => {
    const adapter = getFreeShowAdapter();
    if (!adapter) return null;
    const snapshot = adapter.getSnapshot();
    const mockServer = getVirtualMockServer();
    if (mockServer && snapshot.connected) {
      return { ...snapshot, status: 'simulated' as const };
    }
    return snapshot;
  });

  ipcMain.handle(
    'freeshow:dispatch-command',
    async (_event, { action, data }: { action: AllowlistedAction; data?: any }) => {
      const adapter = getFreeShowAdapter();
      if (!adapter) {
        return { success: false, reason: 'FreeShow adapter not initialized' };
      }

      const command: FreeShowCommand = {
        action,
        data,
        source: 'operator',
        correlationId: `op_cmd_${Date.now()}`,
        createdAt: Date.now()
      };

      return await adapter.dispatchCommand(command);
    }
  );
}
