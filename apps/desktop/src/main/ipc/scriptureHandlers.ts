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
    scriptureGenerator.setActiveTranslation(translationId);
    return scriptureGenerator.getActiveTranslation();
  });

  ipcMain.handle(
    'scripture:lookup-passage',
    (_event, { translation, book, chapter, verseStart, verseEnd }) => {
      return scriptureDatabase.getPassage(translation, book, chapter, verseStart, verseEnd);
    }
  );
}
