/**
 * Cross-platform strict TypeScript verifier across all 10 monorepo projects.
 * Enforces --noUnusedLocals and --noUnusedParameters on every package and Electron target.
 *
 * Run via: pnpm run typecheck:strict
 */

import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const packageDirs = readdirSync(join(root, 'packages'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(root, 'packages', d.name));

const checks: Array<{ name: string; cwd: string; cmd: string }> = [
  ...packageDirs.map((dir) => ({
    name: `packages/${dir.split(/[\\/]/).pop()}`,
    cwd: dir,
    cmd: 'npx tsc --noEmit --noUnusedLocals --noUnusedParameters'
  })),
  {
    name: 'apps/desktop (renderer)',
    cwd: join(root, 'apps', 'desktop'),
    cmd: 'npx tsc --noEmit --noUnusedLocals --noUnusedParameters'
  },
  {
    name: 'apps/desktop (main)',
    cwd: join(root, 'apps', 'desktop'),
    cmd: 'npx tsc -p tsconfig.main.json --noEmit --noUnusedLocals --noUnusedParameters'
  }
];

let failed = false;
for (const check of checks) {
  process.stdout.write(`Checking ${check.name}... `);
  try {
    execSync(check.cmd, { cwd: check.cwd, stdio: 'pipe' });
    console.log('OK');
  } catch (err: any) {
    failed = true;
    console.log('FAILED');
    if (err.stdout) console.error(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
  }
}

if (failed) {
  process.exit(1);
}
console.log('\nAll 10 projects passed strict TypeScript verification (0 unused locals/params).');
