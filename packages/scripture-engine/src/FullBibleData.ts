/**
 * Full Bible Data Loader & Integrity Resolver for Pulpit AI.
 *
 * Provides deterministic path resolution and verified loading for
 * the full 66-book Protestant Canon (World English Bible and King James Version).
 */

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { ScriptureDatabase } from './ScriptureDatabase.js';
import { TranslationPackage } from './types.js';

declare const __dirname: string | undefined;

/**
 * Resolves the absolute path to a packaged Scripture data file.
 * Evaluates candidate paths to work across development, monorepo workspaces,
 * packaged Electron applications, and test runners.
 *
 * @param filename Name of the data file (e.g. 'web.json', 'kjv.json').
 */
export function getBibleDataFilePath(filename: string): string {
  // Strategy 1: Relative to this module's directory (__dirname in CommonJS / Node)
  if (typeof __dirname !== 'undefined') {
    const parentDataCandidate = join(__dirname, '..', 'data', filename);
    if (existsSync(parentDataCandidate)) {
      return parentDataCandidate;
    }
    const directDataCandidate = join(__dirname, 'data', filename);
    if (existsSync(directDataCandidate)) {
      return directDataCandidate;
    }
  }

  // Strategy 2: Relative to current working directory (e.g. project root in tests or CLI)
  const cwdCandidate = join(process.cwd(), 'packages', 'scripture-engine', 'data', filename);
  if (existsSync(cwdCandidate)) {
    return cwdCandidate;
  }

  // Strategy 3: Electron resources directory (packaged application)
  if (typeof process !== 'undefined' && (process as any).resourcesPath) {
    const resCandidate = join((process as any).resourcesPath, 'data', filename);
    if (existsSync(resCandidate)) {
      return resCandidate;
    }
    const unpackedCandidate = join(
      (process as any).resourcesPath,
      'app.asar.unpacked',
      'packages',
      'scripture-engine',
      'data',
      filename
    );
    if (existsSync(unpackedCandidate)) {
      return unpackedCandidate;
    }
  }

  // Fallback to primary candidate path (so error message accurately reflects expected path)
  return join(process.cwd(), 'packages', 'scripture-engine', 'data', filename);
}

/**
 * Loads both standard full Bible translations (WEB and KJV) into the ScriptureDatabase
 * with cryptographic SHA-256 integrity verification. Refuses to load on any mismatch.
 */
export function loadFullBiblePackages(db: ScriptureDatabase): {
  web: TranslationPackage;
  kjv: TranslationPackage;
} {
  const webPath = getBibleDataFilePath('web.json');
  const kjvPath = getBibleDataFilePath('kjv.json');

  const web = db.loadPackageFromFile(webPath, { requireChecksum: true });
  const kjv = db.loadPackageFromFile(kjvPath, { requireChecksum: true });

  return { web, kjv };
}
