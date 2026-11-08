/**
 * RCCG Hymnal Package Index.
 */

import { SongDatabase } from '../SongDatabase.js';
import { RCCG_HYMNS } from './RccgHymnalData.js';

export * from './RccgHymnalData.js';

/**
 * Ingests all curated RCCG hymns into the SongDatabase.
 */
export function loadRccgHymnsIntoDatabase(db: SongDatabase): number {
  let count = 0;
  for (const hymn of RCCG_HYMNS) {
    db.saveSong(hymn);
    count++;
  }
  return count;
}
