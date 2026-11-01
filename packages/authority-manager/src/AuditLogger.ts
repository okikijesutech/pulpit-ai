import { AuditAction, AuditEvent, AuditSeverity } from '@pulpit-ai/shared-types';

export class AuditLogger {
  private events: AuditEvent[] = [];
  private readonly maxEvents: number;

  constructor(maxEvents = 1000) {
    this.maxEvents = maxEvents;
  }

  /**
   * Records a security-relevant or operational event.
   */
  public log(
    action: AuditAction,
    actor: 'operator' | 'ai' | 'system',
    details: Record<string, unknown> = {},
    severity: AuditSeverity = 'info'
  ): AuditEvent {
    const event: AuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      action,
      actor,
      details,
      severity
    };

    this.events.unshift(event);

    // Enforce bounded memory retention
    if (this.events.length > this.maxEvents) {
      this.events.length = this.maxEvents;
    }

    return event;
  }

  /**
   * Retrieves recent audit records in reverse chronological order.
   */
  public getEvents(limit = 100): AuditEvent[] {
    return this.events.slice(0, limit);
  }

  /**
   * Clears the in-memory audit log (primarily for testing).
   */
  public clear(): void {
    this.events = [];
  }
}
