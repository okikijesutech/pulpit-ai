/**
 * FreeShow API command types, payloads, and connection state.
 */

/**
 * Strict allowlist of authorized FreeShow action identifiers.
 * No arbitrary commands outside this list may ever be dispatched.
 */
export const ALLOWLISTED_FREESHOW_ACTIONS = [
  'next_slide',
  'previous_slide',
  'index_select_slide',
  'name_select_slide',
  'start_show',
  'name_select_show',
  'start_scripture',
  'scripture_next',
  'scripture_previous',
  'clear_all',
  'clear_slide',
  'clear_background',
  'clear_overlays',
  'restore_output',
  'get_output',
  'get_output_slide_text',
  'get_output_group_name'
] as const;

export type AllowlistedAction = (typeof ALLOWLISTED_FREESHOW_ACTIONS)[number];

export interface FreeShowCommand {
  /** The allowlisted action name */
  action: AllowlistedAction;
  /** Optional JSON payload parameterizing the action */
  data?: Record<string, unknown>;
  /** Provenance of the command: human operator or AI assistant */
  source: 'operator' | 'ai';
  /** Unique correlation ID for tracking and audit logs */
  correlationId: string;
  /** Timestamp when the command was generated */
  createdAt: number;
}

export type FreeShowConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface FreeShowStateSnapshot {
  connected: boolean;
  status: FreeShowConnectionStatus;
  currentShowId?: string;
  currentSlideIndex?: number;
  currentSlideText?: string;
  isOutputCleared?: boolean;
  lastHeartbeat: number;
}
