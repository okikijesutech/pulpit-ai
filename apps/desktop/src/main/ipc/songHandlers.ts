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
import { FreeShowAdapter } from '@pulpit-ai/presentation-contracts';
import { FreeShowCommand } from '@pulpit-ai/shared-types';

export function registerSongHandlers(
  songDatabase: SongDatabase,
  songReviewManager: SongReviewManager,
  auditLogger: any,
  getFreeShowAdapter: () => FreeShowAdapter | null
): void {
  ipcMain.handle('songs:list', () => {
    return songDatabase.listSongs();
  });

  ipcMain.handle('songs:search', (_event, query: string) => {
    return songDatabase.searchSongs(query);
  });

  ipcMain.handle('songs:get', (_event, id: string) => {
    return songDatabase.getSong(id);
  });

  ipcMain.handle(
    'songs:stage-file',
    async (_event, { name, base64 }: { name: string; base64: string }) => {
      try {
        const buffer = Buffer.from(base64, 'base64');
        const importResult = await SongImportPipeline.importFile(name, buffer);
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
        const buffer = Buffer.from(text, 'utf8');
        const fileName = title ? `${title.replace(/\s+/g, '_')}.txt` : 'pasted_lyrics.txt';
        const importResult = await SongImportPipeline.importFile(fileName, buffer);
        if (!importResult.success || importResult.songs.length === 0) {
          return { success: false, errors: importResult.errors || ['Failed to parse lyrics'] };
        }

        const draft = importResult.songs[0];
        if (title && (!draft.title || draft.title === fileName)) {
          draft.title = title;
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
      const freeShowAdapter = getFreeShowAdapter();
      if (!freeShowAdapter) {
        return { success: false, reason: 'FreeShow adapter not initialized' };
      }

      const showCommand: FreeShowCommand = {
        action: 'name_select_show',
        data: { name: songTitle },
        source: 'operator',
        correlationId: `song_show_${Date.now()}`,
        createdAt: Date.now()
      };
      const showResult = await freeShowAdapter.dispatchCommand(showCommand);
      if (!showResult.success) {
        return showResult;
      }

      const slideCommand: FreeShowCommand = {
        action: 'index_select_slide',
        data: { index: sectionIndex, name: sectionLabel },
        source: 'operator',
        correlationId: `song_slide_${Date.now()}`,
        createdAt: Date.now()
      };
      return await freeShowAdapter.dispatchCommand(slideCommand);
    }
  );

  ipcMain.handle('backup:create', () => {
    const auditEvents = auditLogger.getEvents(500);
    return BackupManager.createBackup(songDatabase, auditEvents, '0.1.0');
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
