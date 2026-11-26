/**
 * Generic Presentation & Slide Engine Contracts.
 *
 * Provides decoupled types for native presentation and external drivers (FreeShow, ProPresenter).
 */

import { AllowlistedAction } from './freeshow.js';
import { DisplayTarget } from './multiscreen.js';

export type PresentationAction = AllowlistedAction;

export interface PresentationCommand {
  /** The allowlisted action name */
  action: PresentationAction;
  /** Optional JSON payload parameterizing the action */
  data?: Record<string, unknown>;
  /** Provenance of the command: human operator or AI assistant */
  source: 'operator' | 'ai';
  /** Unique correlation ID for tracking and audit logs */
  correlationId: string;
  /** Timestamp when the command was generated */
  createdAt: number;
}

export type PresentationEngineStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'simulated'
  | 'reconnecting'
  | 'error'
  | 'native_active';

export interface SlideFormattingTheme {
  backgroundType: 'color' | 'gradient' | 'image' | 'video';
  backgroundValue: string;
  textColor: string;
  accentColor?: string;
  textShadow?: string;
  fontFamily?: string;
  fontSizeRem?: number;
}

export interface ActiveSlideContent {
  id: string;
  category: 'scripture' | 'song' | 'announcement' | 'timer' | 'logo' | 'blank';
  headerTitle?: string;
  primaryBody: string;
  citationSubtext?: string;
  theme?: SlideFormattingTheme;
  timestamp: number;
}

export interface PresentationStateSnapshot {
  connected: boolean;
  status: PresentationEngineStatus;
  currentShowId?: string;
  currentSlideIndex?: number;
  currentSlideText?: string;
  isOutputCleared?: boolean;
  lastHeartbeat: number;
  activeTarget?: DisplayTarget;
  activeSlide?: ActiveSlideContent | null;
  displayCount?: number;
  isWindowedPreviewOpen?: boolean;
}

export interface DisplayWindowConfig {
  id: string;
  name: string;
  target: DisplayTarget;
  isFullscreen: boolean;
  displayId: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface CommandDispatchResult {
  success: boolean;
  status?: 'confirmed' | 'sent_unconfirmed' | 'rejected';
  reason?: string;
}
