import { ipcMain } from 'electron';
import { AuthorityManager } from '@pulpit-ai/authority-manager';
import { FreeShowAdapter } from '@pulpit-ai/presentation-contracts';
import { OperatorMode } from '@pulpit-ai/shared-types';

export function registerAuthorityHandlers(
  authorityManager: AuthorityManager,
  getFreeShowAdapter: () => FreeShowAdapter | null
): void {
  const auditLogger = authorityManager.getAuditLogger();

  ipcMain.handle('authority:get-state', () => {
    return authorityManager.getState();
  });

  ipcMain.handle('authority:set-lock', (_event, active: boolean, reason?: string) => {
    authorityManager.setManualLock(active, reason);
    return { success: true };
  });

  ipcMain.handle('authority:set-mode', (_event, mode: OperatorMode) => {
    authorityManager.setOperatorMode(mode);
    return { success: true };
  });

  ipcMain.handle('authority:approve-candidate', async (_event, candidateId: string) => {
    const freeShowAdapter = getFreeShowAdapter();
    if (!freeShowAdapter) {
      return { success: false, reason: 'FreeShow adapter not initialized' };
    }

    const approval = authorityManager.approveCandidate(candidateId);
    if (!approval.success || !approval.command) {
      return {
        success: false,
        reason: approval.reason || 'Approval blocked by Authority Manager'
      };
    }

    return await freeShowAdapter.dispatchCommand(approval.command);
  });

  ipcMain.handle('audit:get-events', () => {
    return auditLogger.getEvents(50);
  });
}
