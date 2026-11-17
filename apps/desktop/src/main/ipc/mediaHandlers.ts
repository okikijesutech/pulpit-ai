import { ipcMain, dialog } from 'electron';
import { readFileSync, statSync } from 'node:fs';
import { basename, extname } from 'node:path';

export interface PickedMediaFile {
  name: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
}

const MAX_MEDIA_FILE_BYTES = 15 * 1024 * 1024; // 15 MB safety cap

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif'
};

export function registerMediaHandlers(): void {
  ipcMain.handle('media:pick-files', async (): Promise<{
    canceled: boolean;
    files: PickedMediaFile[];
    errors: string[];
  }> => {
    const result = await dialog.showOpenDialog({
      title: 'Select Church Logo, Flyer, or Background Graphic',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Images & Graphics',
          extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif']
        }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, files: [], errors: [] };
    }

    const files: PickedMediaFile[] = [];
    const errors: string[] = [];

    for (const filePath of result.filePaths) {
      try {
        const ext = extname(filePath).toLowerCase();
        const mimeType = MIME_BY_EXT[ext];
        if (!mimeType) {
          errors.push(`Unsupported format: ${basename(filePath)}`);
          continue;
        }

        const stats = statSync(filePath);
        if (stats.size > MAX_MEDIA_FILE_BYTES) {
          errors.push(`${basename(filePath)} exceeds 15 MB limit`);
          continue;
        }

        const buf = readFileSync(filePath);
        const dataUrl = `data:${mimeType};base64,${buf.toString('base64')}`;

        files.push({
          name: basename(filePath, ext),
          filePath,
          mimeType,
          sizeBytes: stats.size,
          dataUrl
        });
      } catch (err: any) {
        errors.push(`Failed to read ${basename(filePath)}: ${err?.message || 'Unknown error'}`);
      }
    }

    return { canceled: false, files, errors };
  });
}
