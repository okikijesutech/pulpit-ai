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
        const rawRef = String(data?.reference || data?.referenceDisplay || 'Scripture');
        const text = String(data?.text || data?.fullText || '');
        const translation = String(data?.translation || 'WEB');

        this.activeSlide = {
          id: `scripture_${Date.now()}`,
          category: 'scripture',
          headerTitle: rawRef,
          primaryBody: text,
          citationSubtext: `${rawRef} (${translation})`,
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
        this.stateSnapshot.currentShowId = `Scripture: ${rawRef}`;
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
          headerTitle: 'Welcome to Worship',
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
        // Fallback for generic actions
        return { success: true, status: 'confirmed' };
      }
    }
  }
}
