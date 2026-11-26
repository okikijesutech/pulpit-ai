import {
  PresentationAction,
  PresentationCommand,
  PresentationEngineStatus,
  PresentationStateSnapshot,
  CommandDispatchResult,
  ActiveSlideContent
} from '@pulpit-ai/shared-types';
import { AuthorityManager } from '@pulpit-ai/authority-manager';
import { IPresentationEngine, PresentationStateListener } from './IPresentationEngine.js';

export interface NativePresentationEngineOptions {
  onSlideChanged?: (slide: ActiveSlideContent | null, isCleared: boolean) => void;
  onOverlayChanged?: (overlay: Record<string, unknown> | null) => void;
}

/**
 * Autonomous Native Presentation Engine for Pulpit AI.
 *
 * Replaces external presentation software with direct local GPU slide rendering
 * across multi-screen auditorium projectors and stage confidence foldback monitors.
 */
export class NativePresentationEngine implements IPresentationEngine {
  private readonly authorityManager: AuthorityManager;
  private readonly options: NativePresentationEngineOptions;
  private status: PresentationEngineStatus = 'disconnected';
  private stateSnapshot: PresentationStateSnapshot;
  private listeners: Set<PresentationStateListener> = new Set();
  private activeSlide: ActiveSlideContent | null = null;
  private isOutputCleared = false;
  private slideHistory: ActiveSlideContent[] = [];
  private historyIndex = -1;

  constructor(
    authorityManager: AuthorityManager,
    options: NativePresentationEngineOptions = {}
  ) {
    this.authorityManager = authorityManager;
    this.options = options;

    this.stateSnapshot = {
      connected: false,
      status: 'disconnected',
      isOutputCleared: false,
      lastHeartbeat: Date.now()
    };
  }

  public async connect(): Promise<boolean> {
    this.status = 'native_active';
    this.stateSnapshot = {
      ...this.stateSnapshot,
      connected: true,
      status: 'native_active',
      lastHeartbeat: Date.now()
    };

    this.authorityManager.setFreeShowConnected(true);
    this.notify();
    return true;
  }

  public disconnect(): void {
    this.status = 'disconnected';
    this.stateSnapshot = {
      ...this.stateSnapshot,
      connected: false,
      status: 'disconnected',
      lastHeartbeat: Date.now()
    };

    this.authorityManager.setFreeShowConnected(false);
    this.notify();
  }

  public getStatus(): PresentationEngineStatus {
    return this.status;
  }

  public getSnapshot(): Readonly<PresentationStateSnapshot> {
    return { ...this.stateSnapshot };
  }

  public subscribe(listener: PresentationStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snap = this.getSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(snap);
      } catch (err) {
        console.error('Error in NativePresentationEngine listener:', err);
      }
    }
  }

  private emitSlide(): void {
    this.stateSnapshot.currentSlideText = this.isOutputCleared ? '' : (this.activeSlide?.primaryBody || '');
    this.stateSnapshot.activeSlide = this.isOutputCleared ? null : this.activeSlide;
    this.stateSnapshot.isOutputCleared = this.isOutputCleared;
    this.stateSnapshot.lastHeartbeat = Date.now();

    this.options.onSlideChanged?.(this.isOutputCleared ? null : this.activeSlide, this.isOutputCleared);
    this.notify();
  }

  /**
   * Dispatches and executes an authorized presentation command natively.
   */
  public async dispatchCommand(command: PresentationCommand): Promise<CommandDispatchResult> {
    // 1. Central Authority Authorization Gate
    const decision = this.authorityManager.authorizeCommand(command);
    if (!decision.allowed) {
      return {
        success: false,
        status: 'rejected',
        reason: decision.reason
      };
    }

    const { action, data } = command;

    switch (action as PresentationAction) {
      case 'start_scripture': {
        const rawRef = data?.reference || data?.referenceDisplay;
        const text = data?.text || data?.fullText;
        if (!rawRef || typeof rawRef !== 'string' || !rawRef.trim() || !text || typeof text !== 'string' || !text.trim()) {
          return {
            success: false,
            status: 'rejected',
            reason: 'Command rejected: start_scripture requires explicit reference and text.'
          };
        }
        const refStr = rawRef.trim();
        const textStr = text.trim();
        const translation = String(data?.translation || 'WEB');

        this.activeSlide = {
          id: `scripture_${Date.now()}`,
          category: 'scripture',
          headerTitle: refStr,
          primaryBody: textStr,
          citationSubtext: `${refStr} (${translation})`,
          theme: {
            backgroundType: 'color',
            backgroundValue: '#090D16',
            textColor: '#FFFFFF',
            accentColor: '#60A5FA'
          },
          timestamp: Date.now()
        };

        this.isOutputCleared = false;
        this.slideHistory.push(this.activeSlide);
        this.historyIndex = this.slideHistory.length - 1;
        this.stateSnapshot.currentShowId = `Scripture: ${refStr}`;
        this.emitSlide();

        return { success: true, status: 'confirmed' };
      }

      case 'start_show':
      case 'name_select_show': {
        const songName = String(data?.name || data?.title || 'Song Selected');
        this.activeSlide = {
          id: `song_${Date.now()}`,
          category: 'song',
          headerTitle: songName,
          primaryBody: String(data?.subtitle || data?.author || songName),
          citationSubtext: songName,
          theme: {
            backgroundType: 'color',
            backgroundValue: '#090D16',
            textColor: '#FFFFFF',
            accentColor: '#A78BFA'
          },
          timestamp: Date.now()
        };
        this.isOutputCleared = false;
        this.slideHistory.push(this.activeSlide);
        this.historyIndex = this.slideHistory.length - 1;
        this.stateSnapshot.currentShowId = songName;
        this.emitSlide();
        return { success: true, status: 'confirmed' };
      }

      case 'index_select_slide':
      case 'name_select_slide': {
        const slideName = String(data?.name || data?.label || 'Verse');
        const lyricText = String(data?.text || data?.lyrics || data?.content || slideName);
        this.activeSlide = {
          id: `song_slide_${Date.now()}`,
          category: 'song',
          headerTitle: slideName,
          primaryBody: lyricText,
          citationSubtext: this.stateSnapshot.currentShowId || 'Hymn / Worship',
          theme: {
            backgroundType: 'color',
            backgroundValue: '#090D16',
            textColor: '#FFFFFF',
            accentColor: '#A78BFA'
          },
          timestamp: Date.now()
        };
        this.isOutputCleared = false;
        this.slideHistory.push(this.activeSlide);
        this.historyIndex = this.slideHistory.length - 1;
        this.emitSlide();
        return { success: true, status: 'confirmed' };
      }

      case 'clear_all':
      case 'clear_slide': {
        this.isOutputCleared = true;
        this.emitSlide();
        return { success: true, status: 'confirmed' };
      }

      case 'restore_output': {
        this.isOutputCleared = false;
        this.emitSlide();
        return { success: true, status: 'confirmed' };
      }

      case 'show_logo': {
        this.activeSlide = {
          id: `logo_${Date.now()}`,
          category: 'logo',
          primaryBody: '',
          headerTitle: String(data?.name || 'Welcome to Worship'),
          theme: {
            backgroundType: 'color',
            backgroundValue: '#000000',
            textColor: '#F8FAFC'
          },
          timestamp: Date.now()
        };
        this.isOutputCleared = false;
        this.emitSlide();
        return { success: true, status: 'confirmed' };
      }

      case 'show_announcement':
      case 'start_overlay': {
        this.options.onOverlayChanged?.(data || null);
        return { success: true, status: 'confirmed' };
      }

      case 'clear_overlays': {
        this.options.onOverlayChanged?.(null);
        return { success: true, status: 'confirmed' };
      }

      case 'start_timer': {
        const timerText = String(data?.time || data?.formatted || '00:00');
        this.options.onOverlayChanged?.({ timer: data || { formatted: timerText } });
        return { success: true, status: 'confirmed' };
      }

      case 'stop_timer': {
        this.options.onOverlayChanged?.({ timer: null });
        return { success: true, status: 'confirmed' };
      }

      case 'set_stage_message': {
        const msg = String(data?.message || data?.text || '');
        this.options.onOverlayChanged?.({ stageMessage: msg });
        return { success: true, status: 'confirmed' };
      }

      case 'clear_stage_message': {
        this.options.onOverlayChanged?.({ stageMessage: null });
        return { success: true, status: 'confirmed' };
      }

      case 'set_stage_layout': {
        this.options.onOverlayChanged?.({ stageLayout: data });
        return { success: true, status: 'confirmed' };
      }

      case 'show_media': {
        const assetName = String(data?.name || 'Media Asset');
        this.activeSlide = {
          id: `media_${Date.now()}`,
          category: 'logo',
          headerTitle: assetName,
          primaryBody: '',
          theme: {
            backgroundType: data?.dataUrl ? 'image' : 'color',
            backgroundValue: String(data?.dataUrl || '#000000'),
            textColor: '#FFFFFF'
          },
          timestamp: Date.now()
        };
        this.isOutputCleared = false;
        this.emitSlide();
        return { success: true, status: 'confirmed' };
      }

      case 'clear_background': {
        if (this.activeSlide?.theme) {
          this.activeSlide.theme.backgroundValue = '#000000';
          this.emitSlide();
        }
        return { success: true, status: 'confirmed' };
      }

      case 'freeze_output':
      case 'get_output':
      case 'get_output_slide_text':
      case 'get_output_group_name':
      case 'scripture_next':
      case 'scripture_previous': {
        return { success: true, status: 'confirmed' };
      }

      case 'next_slide': {
        if (this.historyIndex < this.slideHistory.length - 1) {
          this.historyIndex++;
          this.activeSlide = this.slideHistory[this.historyIndex];
          this.isOutputCleared = false;
          this.emitSlide();
        }
        return { success: true, status: 'confirmed' };
      }

      case 'previous_slide': {
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.activeSlide = this.slideHistory[this.historyIndex];
          this.isOutputCleared = false;
          this.emitSlide();
        }
        return { success: true, status: 'confirmed' };
      }

      default: {
        return {
          success: false,
          status: 'rejected',
          reason: `Action '${action}' is not supported by NativePresentationEngine`
        };
      }
    }
  }
}
