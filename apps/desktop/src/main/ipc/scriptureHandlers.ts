import { ipcMain } from 'electron';
import { ScriptureDatabase, ScriptureCandidateGenerator } from '@pulpit-ai/scripture-engine';

export function registerScriptureHandlers(
  scriptureDatabase: ScriptureDatabase,
  scriptureGenerator: ScriptureCandidateGenerator
): void {
  ipcMain.handle('scripture:get-translations', () => {
    return scriptureDatabase.listTranslations();
  });

  ipcMain.handle('scripture:set-translation', (_event, translationId: string) => {
    if (typeof translationId !== 'string' || !translationId.trim() || translationId.length > 32) {
      return scriptureGenerator.getActiveTranslation();
    }
    scriptureGenerator.setActiveTranslation(translationId.trim());
    return scriptureGenerator.getActiveTranslation();
  });

  ipcMain.handle(
    'scripture:lookup-passage',
    (_event, payload: { translation?: string; book?: string; chapter?: number; verseStart?: number; verseEnd?: number }) => {
      if (
        !payload ||
        typeof payload.translation !== 'string' ||
        typeof payload.book !== 'string' ||
        typeof payload.chapter !== 'number' ||
        typeof payload.verseStart !== 'number' ||
        !Number.isInteger(payload.chapter) ||
        !Number.isInteger(payload.verseStart)
      ) {
        return { found: false, error: 'Invalid scripture lookup parameters' };
      }
      const safeEnd =
        typeof payload.verseEnd === 'number' && Number.isInteger(payload.verseEnd)
          ? payload.verseEnd
          : undefined;
      return scriptureDatabase.getPassage(
        payload.translation.slice(0, 32),
        payload.book.slice(0, 64),
        payload.chapter,
        payload.verseStart,
        safeEnd
      );
    }
  );
}
