import { ipcMain } from 'electron';
import {
  SongDatabase,
  SongReviewManager,
  SongImportPipeline,
  StagedImportSong,
  ApprovalOptions,
  BackupManager,
  BackupArchive
} from '@pulpit-ai/song-engine';
import { IPresentationEngine } from '@pulpit-ai/presentation-contracts';
import { PresentationCommand } from '@pulpit-ai/shared-types';
import {
  MAX_IPC_BASE64_FILE_CHARS,
  MAX_IPC_QUERY_CHARS,
  MAX_IPC_TEXT_CHARS,
  sanitizeFileName,
  validateStringLength
} from './ipcValidation.js';

export function registerSongHandlers(
  songDatabase: SongDatabase,
  songReviewManager: SongReviewManager,
  auditLogger: any,
  getPresentationEngine: () => IPresentationEngine | null
): void {
  ipcMain.handle('songs:list', () => {
    return songDatabase.listSongs();
  });

  ipcMain.handle('songs:search', (_event, query: string) => {
    if (typeof query !== 'string' || !query.trim()) return [];
    return songDatabase.searchSongs(query.trim().slice(0, MAX_IPC_QUERY_CHARS));
  });

  ipcMain.handle('songs:get', (_event, id: string) => {
    if (typeof id !== 'string' || !id.trim() || id.length > 128) return null;
    return songDatabase.getSong(id.trim());
  });

  ipcMain.handle(
    'songs:stage-file',
    async (_event, { name, base64 }: { name: string; base64: string }) => {
      try {
        const safeName = sanitizeFileName(name);
        const safeBase64 = validateStringLength(base64, MAX_IPC_BASE64_FILE_CHARS, 'base64');
        const buffer = Buffer.from(safeBase64, 'base64');
        const importResult = await SongImportPipeline.importFile(safeName, buffer);
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
        const safeText = validateStringLength(text, MAX_IPC_TEXT_CHARS, 'text');
        const safeTitle = typeof title === 'string' ? title.trim().slice(0, 160) : undefined;
        const buffer = Buffer.from(safeText, 'utf8');
        const fileName = safeTitle ? `${sanitizeFileName(safeTitle.replace(/\s+/g, '_'))}.txt` : 'pasted_lyrics.txt';
        const importResult = await SongImportPipeline.importFile(fileName, buffer);
        if (!importResult.success || importResult.songs.length === 0) {
          return { success: false, errors: importResult.errors || ['Failed to parse lyrics'] };
        }

        const draft = importResult.songs[0];
        if (safeTitle && (!draft.title || draft.title === fileName)) {
          draft.title = safeTitle;
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
      const engine = getPresentationEngine();
      if (!engine) {
        return { success: false, reason: 'Presentation engine not initialized' };
      }

      const showCommand: PresentationCommand = {
        action: 'name_select_show',
        data: { name: songTitle },
        source: 'operator',
        correlationId: `song_show_${Date.now()}`,
        createdAt: Date.now()
      };
      const showResult = await engine.dispatchCommand(showCommand);
      if (!showResult.success) {
        return showResult;
      }

      const slideCommand: PresentationCommand = {
        action: 'index_select_slide',
        data: { index: sectionIndex, name: sectionLabel },
        source: 'operator',
        correlationId: `song_slide_${Date.now()}`,
        createdAt: Date.now()
      };
      return await engine.dispatchCommand(slideCommand);
    }
  );

  ipcMain.handle('backup:create', () => {
    const auditEvents = auditLogger.getEvents(500);
    return BackupManager.createBackup(songDatabase, auditEvents, '1.0.0');
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
}
