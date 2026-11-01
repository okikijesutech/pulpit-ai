/**
 * Authority and Permission Types for Pulpit AI.
 * Enforces the non-negotiable rule: Human authority always takes priority.
 */

export type OperatorMode = 'suggestions' | 'manual' | 'automatic';

export interface AuthorityState {
  /** Current high-level operational mode. Defaults to 'suggestions'. */
  operatorMode: OperatorMode;
  /** Whether the system is actively capturing and transcribing audio. */
  listeningEnabled: boolean;
  /** Whether suggestions are allowed to be calculated and shown in UI. */
  suggestionsEnabled: boolean;
  /**
   * Whether AI is currently permitted to dispatch projection commands to FreeShow.
   * In 'suggestions' or 'manual' mode, this is ALWAYS false.
   */
  projectionPermission: boolean;
  /**
   * Physical emergency lock. When true, blocks ALL AI-originated commands,
   * regardless of confidence or mode.
   */
  manualLockActive: boolean;
  /** Observed FreeShow connection state. */
  freeShowConnected: boolean;
  /** Epoch timestamp of the last direct human action. */
  lastOperatorActionAt: number | null;
  /** Currently active audio source identifier. */
  activeSourceId: string | null;
}

export interface AuthorityDecision {
  allowed: boolean;
  reason: string;
  timestamp: number;
}
