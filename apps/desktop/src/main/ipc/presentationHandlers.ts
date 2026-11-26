import { ipcMain } from 'electron';
import { IPresentationEngine } from '@pulpit-ai/presentation-contracts';
import { PresentationCommand } from '@pulpit-ai/shared-types';
import { NativeDisplayManager } from '../presentation/NativeDisplayManager.js';
import { isAllowlistedAction, validateSafeObject } from './ipcValidation.js';

export function registerPresentationHandlers(
  getEngine: () => IPresentationEngine,
  displayManager: NativeDisplayManager,
  getEngineMode: () => 'native' | 'freeshow',
  setEngineMode: (mode: 'native' | 'freeshow') => void
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

  ipcMain.handle('presentation:get-mode', () => {
    return getEngineMode();
  });

  ipcMain.handle('presentation:set-mode', (_event, mode: unknown) => {
    if (mode === 'native' || mode === 'freeshow') {
      setEngineMode(mode);
      return { success: true, mode };
    }
    return { success: false, reason: 'Invalid presentation mode' };
  });

  // Presentation dispatch handler: supports both NativePresentationEngine and FreeShowAdapter
  ipcMain.handle('presentation:dispatch-command', async (_event, payload: unknown) => {
    try {
      const safePayload = validateSafeObject(payload, 'Presentation command payload');
      if (!isAllowlistedAction(safePayload.action)) {
        return {
          success: false,
          status: 'rejected',
          reason: `Action '${String(safePayload.action)}' is not allowlisted.`
        };
      }
      const engine = getEngine();
      const command: PresentationCommand = {
        ...(safePayload as unknown as PresentationCommand),
        action: safePayload.action,
        source: 'operator' // Always force operator source for IPC renderer triggers
      };
      return await engine.dispatchCommand(command);
    } catch (err) {
      return {
        success: false,
        status: 'rejected',
        reason: err instanceof Error ? err.message : String(err)
      };
    }
  });
}
