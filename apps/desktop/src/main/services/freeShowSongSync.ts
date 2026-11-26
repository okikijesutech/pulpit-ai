import { app } from 'electron';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { SEED_SONGS } from '@pulpit-ai/song-engine';

/**
 * Resolves cross-platform FreeShow Shows & AppData directories across Windows, macOS, and Linux.
 */
function resolveFreeShowPaths(): { documentsPath: string; showsJsonPath: string } {
  let docsBase: string;
  let appDataBase: string;

  try {
    docsBase = app.getPath('documents');
    appDataBase = app.getPath('appData');
  } catch {
    const home = homedir();
    docsBase = join(home, 'Documents');
    if (process.platform === 'darwin') {
      appDataBase = join(home, 'Library', 'Application Support');
    } else if (process.platform === 'win32') {
      appDataBase = process.env.APPDATA || join(home, 'AppData', 'Roaming');
    } else {
      appDataBase = process.env.XDG_CONFIG_HOME || join(home, '.config');
    }
  }

  return {
    documentsPath: join(docsBase, 'FreeShow', 'Shows'),
    showsJsonPath: join(appDataBase, 'FreeShow', 'shows.json')
  };
}

/**
 * Synchronizes seed hymns to FreeShow directory storage for local discovery.
 */
export function syncHymnsToFreeShow(): void {
  try {
    const { documentsPath, showsJsonPath } = resolveFreeShowPaths();

    // Check if FreeShow is actually installed or used on this system
    const parentDocs = dirname(documentsPath);
    const parentAppData = dirname(showsJsonPath);
    const isFreeShowPresent = existsSync(parentDocs) || existsSync(parentAppData);
    if (!isFreeShowPresent) {
      return; // FreeShow not installed; bypass external disk sync
    }

    if (!existsSync(documentsPath)) {
      mkdirSync(documentsPath, { recursive: true });
    }

    let showsIndex: Record<string, any> = {};
    if (existsSync(showsJsonPath)) {
      try {
        showsIndex = JSON.parse(readFileSync(showsJsonPath, 'utf8'));
      } catch {
        showsIndex = {};
      }
    }

    for (const song of SEED_SONGS) {
      const showId = song.id;
      const title = song.canonicalTitle;
      const primaryVersion = song.versions.find((v) => v.isDefault) || song.versions[0];
      if (!primaryVersion) continue;

      const slidesObj: Record<string, any> = {};
      const layoutSlides: { id: string }[] = [];

      primaryVersion.sections.forEach((sec, idx) => {
        const slideId = `slide_${sec.id || idx}`;
        layoutSlides.push({ id: slideId });

        const verseText = sec.lines.join('\n');
        slidesObj[slideId] = {
          group: sec.label,
          color: null,
          settings: {},
          notes: '',
          items: [
            {
              style:
                'top: 60px; left: 60px; width: 1800px; height: 860px; display: flex; align-items: center; justify-content: center;',
              align: 'text-align: center;',
              lines: [
                {
                  align: 'text-align: center;',
                  text: [
                    {
                      value: verseText,
                      style: 'font-size: 75px; font-weight: bold; color: #ffffff;'
                    }
                  ]
                }
              ]
            },
            {
              style: 'top: 940px; left: 60px; width: 1800px; height: 80px;',
              align: 'text-align: left;',
              lines: [
                {
                  align: 'text-align: left;',
                  text: [
                    {
                      value: `${title} • ${song.author || 'Public Domain'}`,
                      style: 'font-size: 24px; color: #94a3b8;'
                    }
                  ]
                }
              ],
              decoration: true
            }
          ]
        };
      });

      const showData = [
        showId,
        {
          name: title,
          category: 'song',
          settings: { activeLayout: 'default', template: 'song' },
          timestamps: { created: Date.now(), modified: Date.now(), used: Date.now() },
          quickAccess: {},
          meta: { author: song.author, copyright: song.copyright },
          slides: slidesObj,
          layouts: {
            default: {
              name: 'Default',
              notes: '',
              slides: layoutSlides
            }
          },
          media: {}
        }
      ];

      const filePath = join(documentsPath, `${title}.show`);
      writeFileSync(filePath, JSON.stringify(showData), 'utf8');

      // Register both showId and title in FreeShow index for seamless lookup
      showsIndex[showId] = {
        name: title,
        category: 'song',
        timestamps: { created: Date.now(), modified: Date.now(), used: Date.now() },
        quickAccess: {}
      };
      showsIndex[title] = {
        name: title,
        category: 'song',
        timestamps: { created: Date.now(), modified: Date.now(), used: Date.now() },
        quickAccess: {}
      };
    }

    if (existsSync(dirname(showsJsonPath))) {
      writeFileSync(showsJsonPath, JSON.stringify(showsIndex), 'utf8');
    }
  } catch (err) {
    console.warn('FreeShow song sync warning:', err);
  }
}
