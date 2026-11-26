import { BrowserWindow, screen, powerSaveBlocker, app } from 'electron';
import { join } from 'node:path';
import { ActiveSlideContent } from '@pulpit-ai/shared-types';

export interface DisplayInfo {
  id: number;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
  isPrimary: boolean;
}

export class NativeDisplayManager {
  private projectorWindow: BrowserWindow | null = null;
  private foldbackWindow: BrowserWindow | null = null;
  private previewWindow: BrowserWindow | null = null;
  private powerSaveBlockerId: number | null = null;
  private lastSlide: ActiveSlideContent | null = null;
  private lastCleared = false;
  private lastOverlay: Record<string, unknown> | null = null;

  constructor() {
    this.enablePowerSaveBlocker();
  }

  private enablePowerSaveBlocker(): void {
    try {
      if (this.powerSaveBlockerId === null || !powerSaveBlocker.isStarted(this.powerSaveBlockerId)) {
        this.powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
      }
    } catch (err) {
      console.warn('Could not engage powerSaveBlocker:', err);
    }
  }

  public getAvailableDisplays(): DisplayInfo[] {
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();

    return displays.map((d, index) => ({
      id: d.id,
      label: d.id === primary.id ? `Display ${index + 1} (Primary Screen)` : `Display ${index + 1} (External Projector/TV)`,
      bounds: d.bounds,
      isPrimary: d.id === primary.id
    }));
  }

  private getAppUrl(view: 'projector' | 'foldback'): string {
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      return `${process.env.VITE_DEV_SERVER_URL}?view=${view}`;
    }
    return `file://${join(__dirname, '../renderer/index.html')}?view=${view}`;
  }

  /**
   * Opens or routes the Sanctuary Projector output.
   * If single display or windowed=true, opens a floating 16:9 preview window.
   * If targetDisplayId points to an external screen, opens borderless fullscreen.
   */
  public openProjectorWindow(targetDisplayId?: number, windowed = false): BrowserWindow {
    if (this.projectorWindow && !this.projectorWindow.isDestroyed()) {
      this.projectorWindow.focus();
      return this.projectorWindow;
    }

    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    let targetDisplay = displays.find((d) => d.id === targetDisplayId);

    // If no explicit display specified, pick the first non-primary display if available
    if (!targetDisplay) {
      targetDisplay = displays.find((d) => d.id !== primary.id) || primary;
    }

    const isExternal = targetDisplay.id !== primary.id && !windowed;

    this.projectorWindow = new BrowserWindow({
      x: isExternal ? targetDisplay.bounds.x : undefined,
      y: isExternal ? targetDisplay.bounds.y : undefined,
      width: isExternal ? targetDisplay.bounds.width : 1024,
      height: isExternal ? targetDisplay.bounds.height : 576,
      fullscreen: isExternal,
      frame: !isExternal,
      autoHideMenuBar: true,
      backgroundColor: '#000000',
      title: 'Pulpit AI — Sanctuary Projector Output',
      webPreferences: {
        preload: join(__dirname, '../../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    this.projectorWindow.loadURL(this.getAppUrl('projector'));

    this.projectorWindow.webContents.on('did-finish-load', () => {
      this.broadcastSlide(this.lastSlide, this.lastCleared);
      if (this.lastOverlay) {
        this.broadcastOverlay(this.lastOverlay);
      }
    });

    this.projectorWindow.on('closed', () => {
      this.projectorWindow = null;
    });

    return this.projectorWindow;
  }

  /**
   * Opens Stage Confidence Foldback Display.
   */
  public openFoldbackWindow(targetDisplayId?: number): BrowserWindow {
    if (this.foldbackWindow && !this.foldbackWindow.isDestroyed()) {
      this.foldbackWindow.focus();
      return this.foldbackWindow;
    }

    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    const targetDisplay = displays.find((d) => d.id === targetDisplayId) || displays.find((d) => d.id !== primary.id) || primary;
    const isExternal = targetDisplay.id !== primary.id;

    this.foldbackWindow = new BrowserWindow({
      x: isExternal ? targetDisplay.bounds.x : undefined,
      y: isExternal ? targetDisplay.bounds.y : undefined,
      width: isExternal ? targetDisplay.bounds.width : 1024,
      height: isExternal ? targetDisplay.bounds.height : 576,
      fullscreen: isExternal,
      frame: !isExternal,
      autoHideMenuBar: true,
      backgroundColor: '#000000',
      title: 'Pulpit AI — Stage Foldback Confidence Monitor',
      webPreferences: {
        preload: join(__dirname, '../../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    this.foldbackWindow.loadURL(this.getAppUrl('foldback'));

    this.foldbackWindow.webContents.on('did-finish-load', () => {
      this.broadcastSlide(this.lastSlide, this.lastCleared);
    });

    this.foldbackWindow.on('closed', () => {
      this.foldbackWindow = null;
    });

    return this.foldbackWindow;
  }

  /**
   * Toggles the floating 16:9 windowed preview for single-screen / development mode.
   */
  public toggleWindowedPreview(): boolean {
    if (this.previewWindow && !this.previewWindow.isDestroyed()) {
      this.previewWindow.close();
      this.previewWindow = null;
      return false;
    }

    this.previewWindow = new BrowserWindow({
      width: 854,
      height: 480,
      minWidth: 480,
      minHeight: 270,
      backgroundColor: '#000000',
      title: 'Pulpit AI — Windowed Projector Preview (16:9)',
      alwaysOnTop: true,
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, '../../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    this.previewWindow.setAspectRatio(16 / 9);

    this.previewWindow.loadURL(this.getAppUrl('projector'));

    this.previewWindow.webContents.on('did-finish-load', () => {
      this.broadcastSlide(this.lastSlide, this.lastCleared);
      if (this.lastOverlay) {
        this.broadcastOverlay(this.lastOverlay);
      }
    });

    this.previewWindow.on('closed', () => {
      this.previewWindow = null;
    });

    return true;
  }

  public broadcastSlide(slide: ActiveSlideContent | null, isCleared: boolean): void {
    this.lastSlide = slide;
    this.lastCleared = isCleared;

    const payload = { slide, isCleared };
    const windows = [this.projectorWindow, this.foldbackWindow, this.previewWindow];

    for (const win of windows) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('presentation:slide-render', payload);
      }
    }
  }

  public broadcastOverlay(overlay: Record<string, unknown> | null): void {
    this.lastOverlay = overlay;
    const windows = [this.projectorWindow, this.foldbackWindow, this.previewWindow];

    for (const win of windows) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('presentation:overlay-render', overlay);
      }
    }
  }

  public closeAllWindows(): void {
    if (this.projectorWindow && !this.projectorWindow.isDestroyed()) this.projectorWindow.close();
    if (this.foldbackWindow && !this.foldbackWindow.isDestroyed()) this.foldbackWindow.close();
    if (this.previewWindow && !this.previewWindow.isDestroyed()) this.previewWindow.close();
  }
}
