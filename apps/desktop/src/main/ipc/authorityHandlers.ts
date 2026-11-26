import { ipcMain } from 'electron';
import { AuthorityManager } from '@pulpit-ai/authority-manager';
import { IPresentationEngine } from '@pulpit-ai/presentation-contracts';
import { OperatorMode } from '@pulpit-ai/shared-types';
import { isValidOperatorMode, validateStringLength } from './ipcValidation.js';

export function registerAuthorityHandlers(
  authorityManager: AuthorityManager,
  getPresentationEngine: () => IPresentationEngine | null
): void {
  const auditLogger = authorityManager.getAuditLogger();

  ipcMain.handle('authority:get-state', () => {
    return authorityManager.getState();
  });

  ipcMain.handle('authority:set-lock', (_event, active: boolean, reason?: string) => {
    if (typeof active !== 'boolean') {
      return { success: false, reason: 'Lock flag must be a boolean' };
    }
    const safeReason = typeof reason === 'string' ? reason.slice(0, 256) : undefined;
    authorityManager.setManualLock(active, safeReason);
    return { success: true };
  });

  ipcMain.handle('authority:set-mode', (_event, mode: OperatorMode) => {
    if (!isValidOperatorMode(mode)) {
      return { success: false, reason: 'Invalid operator mode' };
    }
    authorityManager.setOperatorMode(mode);
    return { success: true };
  });

  ipcMain.handle('authority:approve-candidate', async (_event, candidateId: string) => {
    if (typeof candidateId !== 'string' || !candidateId.trim() || candidateId.length > 128) {
      return { success: false, reason: 'Invalid candidate ID' };
    }
    const safeCandidateId = validateStringLength(candidateId.trim(), 128, 'candidateId');
    const engine = getPresentationEngine();
    if (!engine) {
      return { success: false, reason: 'Presentation engine not initialized' };
    }

    const approval = authorityManager.approveCandidate(safeCandidateId);
    if (!approval.success || !approval.command) {
      return {
        success: false,
        reason: approval.reason || 'Approval blocked by Authority Manager'
      };
    }

    return await engine.dispatchCommand(approval.command);
  });

  ipcMain.handle('audit:get-events', () => {
    return auditLogger.getEvents(50);
  });
}
