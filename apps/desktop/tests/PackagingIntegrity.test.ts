import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

describe('Packaging and Release Integrity Tests', () => {
  const desktopRoot = join(__dirname, '..');
  const distMain = join(desktopRoot, 'dist', 'main', 'index.js');
  const distPreload = join(desktopRoot, 'dist', 'preload', 'index.js');
  const distRendererHtml = join(desktopRoot, 'dist', 'renderer', 'index.html');
  const builderConfigPath = join(desktopRoot, 'electron-builder.json');

  it('verifies electron-builder.json packaging configuration is valid and production-ready', () => {
    expect(existsSync(builderConfigPath)).toBe(true);
    const content = JSON.parse(readFileSync(builderConfigPath, 'utf8'));

    expect(content.appId).toBe('org.pulpitai.desktop');
    expect(content.productName).toBe('Pulpit AI');
    expect(content.asar).toBe(true);
    expect(content.win).toBeDefined();
    expect(content.win.target.some((t: any) => t.target === 'nsis')).toBe(true);
    expect(content.win.target.some((t: any) => t.target === 'portable')).toBe(true);
    expect(content.win.target[0].arch).toContain('x64');
  });

  it('verifies compiled main process and preload script exist', () => {
    expect(existsSync(distMain)).toBe(true);
    expect(existsSync(distPreload)).toBe(true);

    const mainContent = readFileSync(distMain, 'utf8');
    expect(mainContent).toContain('createWindow');
    expect(mainContent).toContain('authorityManager');

    const preloadContent = readFileSync(distPreload, 'utf8');
    expect(preloadContent).toContain('contextBridge.exposeInMainWorld');
  });

  it('verifies compiled Vite renderer distribution is lightweight and within hardware bounds', () => {
    expect(existsSync(distRendererHtml)).toBe(true);

    const htmlContent = readFileSync(distRendererHtml, 'utf8');
    expect(htmlContent).toContain('<div id="root">');

    const htmlSize = statSync(distRendererHtml).size;
    // HTML shell should be lightweight (< 5 KB)
    expect(htmlSize).toBeLessThan(5 * 1024);
  });
});
