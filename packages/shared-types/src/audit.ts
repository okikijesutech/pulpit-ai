/**
 * Audit Logging and Safety Event Types.
 * Every authority transition and projection command is permanently auditable.
 */

export type AuditAction =
  | 'candidate_created'
  | 'candidate_approved'
  | 'candidate_rejected'
  | 'candidate_dismissed'
  | 'manual_lock_engaged'
  | 'manual_lock_released'
  | 'mode_changed'
  | 'command_requested'
  | 'command_authorized'
  | 'command_rejected_by_authority'
  | 'command_dispatched'
  | 'command_failed'
  | 'freeshow_connected'
  | 'freeshow_disconnected'
  | 'worker_failure';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'security';

export interface AuditEvent {
  id: string;
  timestamp: number;
  action: AuditAction;
  actor: 'operator' | 'ai' | 'system';
  details: Record<string, unknown>;
  severity: AuditSeverity;
}
