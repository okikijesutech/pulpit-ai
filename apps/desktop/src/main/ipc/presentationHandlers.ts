import { ipcMain } from 'electron';
import { IPresentationEngine } from '@pulpit-ai/presentation-contracts';
import { NativeDisplayManager } from '../presentation/NativeDisplayManager.js';

export function registerPresentationHandlers(
  getEngine: () => IPresentationEngine,
  displayManager: NativeDisplayManager
): void {
  ipcMain.handle('presentation:get-displays', () => {
    return displayManager.getAvailableDisplays();
  });

  ipcMain.handle('presentation:toggle-projector', (_event, params?: { targetDisplayId?: number; windowed?: boolean }) => {
    const win = displayManager.openProjectorWindow(params?.targetDisplayId, params?.windowed);
    return { success: Boolean(win) };
  });

  ipcMain.handle('presentation:toggle-foldback', (_event, params?: { targetDisplayId?: number }) => {
    const win = displayManager.openFoldbackWindow(params?.targetDisplayId);
    return { success: Boolean(win) };
  });

  ipcMain.handle('presentation:toggle-preview', () => {
    return displayManager.toggleWindowedPreview();
  });

  // Presentation dispatch handler: supports both NativePresentationEngine and FreeShowAdapter
  ipcMain.handle('presentation:dispatch-command', async (_event, payload: any) => {
    const engine = getEngine();
    return engine.dispatchCommand(payload);
  });
}
