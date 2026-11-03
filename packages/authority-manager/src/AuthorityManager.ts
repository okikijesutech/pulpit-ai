import {
  ALLOWLISTED_FREESHOW_ACTIONS,
  AuthorityDecision,
  AuthorityState,
  FreeShowCommand,
  OperatorMode,
  SuggestionCandidate
} from '@pulpit-ai/shared-types';
import { AuditLogger } from './AuditLogger.js';
import { CandidateRegistry, CandidateRegistryOptions } from './CandidateRegistry.js';

export type StateListener = (state: Readonly<AuthorityState>) => void;

export interface AuthorityManagerOptions {
  candidateTtlMs?: number;
}

export class AuthorityManager {
  private state: AuthorityState;
  private readonly auditLogger: AuditLogger;
  private readonly candidateRegistry: CandidateRegistry;
  private listeners: Set<StateListener> = new Set();

  constructor(auditLogger?: AuditLogger, options?: AuthorityManagerOptions) {
    this.auditLogger = auditLogger ?? new AuditLogger();
    this.candidateRegistry = new CandidateRegistry({ ttlMs: options?.candidateTtlMs });
    this.state = {
      operatorMode: 'suggestions', // Non-negotiable default
      listeningEnabled: true,
      suggestionsEnabled: true,
      projectionPermission: false, // Strict default: false
      manualLockActive: false,
      freeShowConnected: false,
      lastOperatorActionAt: null,
      activeSourceId: null
    };
  }

  /**
   * Returns a snapshot of the current authority state.
   */
  public getState(): Readonly<AuthorityState> {
    return { ...this.state };
  }

  /**
   * Returns the audit logger instance.
   */
  public getAuditLogger(): AuditLogger {
    return this.auditLogger;
  }

  /**
   * Subscribes to authority state transitions.
   */
  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('Error in authority state listener:', err);
      }
    }
  }

  /**
   * Toggles or engages the emergency manual safety lock.
   * When engaged, this blocks 100% of AI commands instantly.
   */
  public setManualLock(active: boolean, reason = 'Operator action'): void {
    if (this.state.manualLockActive === active) return;

    this.state.manualLockActive = active;
    this.recalculatePermissions();

    this.auditLogger.log(
      active ? 'manual_lock_engaged' : 'manual_lock_released',
      'operator',
      { reason, state: this.state },
      active ? 'warning' : 'info'
    );

    this.notify();
  }

  /**
   * Changes the high-level operational mode.
   */
  public setOperatorMode(mode: OperatorMode): void {
    if (this.state.operatorMode === mode) return;

    const previousMode = this.state.operatorMode;
    this.state.operatorMode = mode;
    this.recalculatePermissions();

    this.auditLogger.log('mode_changed', 'operator', {
      from: previousMode,
      to: mode
    });

    this.notify();
  }

  /**
   * Updates the observed FreeShow connection state.
   */
  public setFreeShowConnected(connected: boolean): void {
    if (this.state.freeShowConnected === connected) return;

    this.state.freeShowConnected = connected;
    this.recalculatePermissions();

    this.auditLogger.log(
      connected ? 'freeshow_connected' : 'freeshow_disconnected',
      'system',
      { connected },
      connected ? 'info' : 'warning'
    );

    this.notify();
  }

  /**
   * Enables or disables audio listening & recognition.
   */
  public setListeningEnabled(enabled: boolean): void {
    if (this.state.listeningEnabled === enabled) return;
    this.state.listeningEnabled = enabled;
    this.notify();
  }

  /**
   * Enables or disables showing suggestions in the UI.
   */
  public setSuggestionsEnabled(enabled: boolean): void {
    if (this.state.suggestionsEnabled === enabled) return;
    this.state.suggestionsEnabled = enabled;
    this.notify();
  }

  /**
   * Records that the human operator took a direct action (e.g. clicked slide).
   */
  public recordOperatorAction(): void {
    this.state.lastOperatorActionAt = Date.now();
    this.notify();
  }

  /**
   * Central gatekeeper: Evaluates whether a FreeShow command is authorized to dispatch.
   * STRICT FAIL-CLOSED RULE: If permission is absent or ambiguous, command is REJECTED.
   */
  public authorizeCommand(command: FreeShowCommand): AuthorityDecision {
    const timestamp = Date.now();

    // 1. Validate allowlisted action
    if (!ALLOWLISTED_FREESHOW_ACTIONS.includes(command.action)) {
      this.auditLogger.log(
        'command_rejected_by_authority',
        command.source,
        { command, reason: `Action '${command.action}' is not in the allowlist.` },
        'security'
      );
      return {
        allowed: false,
        reason: `Disallowed action '${command.action}'. Action must be explicitly allowlisted.`,
        timestamp
      };
    }

    // 2. Human Operator commands always take priority
    if (command.source === 'operator') {
      if (!this.state.freeShowConnected) {
        return {
          allowed: false,
          reason: 'FreeShow is currently disconnected.',
          timestamp
        };
      }
      this.recordOperatorAction();
      this.auditLogger.log('command_authorized', 'operator', { command });
      return { allowed: true, reason: 'Operator direct command', timestamp };
    }

    // 3. AI-originated commands validation
    if (this.state.manualLockActive) {
      this.auditLogger.log(
        'command_rejected_by_authority',
        'ai',
        { command, reason: 'Manual Safety Lock is active' },
        'warning'
      );
      return {
        allowed: false,
        reason: 'Manual Safety Lock is active. AI projection is blocked.',
        timestamp
      };
    }

    if (!this.state.freeShowConnected) {
      this.auditLogger.log(
        'command_rejected_by_authority',
        'ai',
        { command, reason: 'FreeShow disconnected' },
        'warning'
      );
      return {
        allowed: false,
        reason: 'FreeShow is disconnected.',
        timestamp
      };
    }

    if (this.state.operatorMode === 'manual') {
      this.auditLogger.log(
        'command_rejected_by_authority',
        'ai',
        { command, reason: 'System is in Manual Control Mode' },
        'info'
      );
      return {
        allowed: false,
        reason: 'Operator is in Manual Mode. AI projection is blocked.',
        timestamp
      };
    }

    if (this.state.operatorMode === 'suggestions') {
      this.auditLogger.log(
        'command_rejected_by_authority',
        'ai',
        { command, reason: 'AI projection disabled in suggestions mode' },
        'info'
      );
      return {
        allowed: false,
        reason: 'Suggestions mode is active. AI cannot project without explicit operator approval.',
        timestamp
      };
    }

    if (this.state.operatorMode === 'automatic') {
      // In automatic mode, verify projectionPermission flag
      if (!this.state.projectionPermission) {
        return {
          allowed: false,
          reason: 'Automatic projection permission is not active.',
          timestamp
        };
      }

      this.auditLogger.log('command_authorized', 'ai', { command });
      return { allowed: true, reason: 'Automatic projection permitted', timestamp };
    }

    // Default fail-closed fallback
    return {
      allowed: false,
      reason: 'Unknown authority state. Failing closed.',
      timestamp
    };
  }

  /**
   * Registers a generated candidate in the central authority registry.
   */
  public registerCandidate(candidate: SuggestionCandidate, registeredAt?: number): void {
    this.candidateRegistry.registerCandidate(candidate, registeredAt);
  }

  /**
   * Returns the candidate registry instance.
   */
  public getCandidateRegistry(): CandidateRegistry {
    return this.candidateRegistry;
  }

  /**
   * Approves a candidate strictly by ID (PR 3: Approve by id, not by payload).
   * Looks up the stored payload, and makes approval single-use with an expiry (~2 minutes).
   * Unknown, used, expired, or forged IDs/payloads are rejected and audited.
   */
  public approveCandidate(
    candidateId: string,
    now?: number
  ): { success: boolean; command?: FreeShowCommand; reason?: string } {
    // 1. Validate that input is strictly a candidateId string (reject forged payload objects)
    if (typeof candidateId !== 'string' || candidateId.trim().length === 0) {
      this.auditLogger.log(
        'candidate_rejected',
        'operator',
        { candidateId, reason: 'Approval rejected: Expected candidateId string, received object or invalid ID (forged payload rejected)' },
        'security'
      );
      return {
        success: false,
        reason: 'Approval rejected: Forged payload or invalid candidate ID format.'
      };
    }

    // 2. Emergency manual lock check
    if (this.state.manualLockActive) {
      this.auditLogger.log(
        'candidate_rejected',
        'operator',
        { candidateId, reason: 'Manual Safety Lock is active' },
        'warning'
      );
      return {
        success: false,
        reason: 'Manual Safety Lock is active. AI projection is blocked.'
      };
    }

    // 3. Consume candidate from server-side registry (checks existence, replay, and 2-min expiry)
    const consumeResult = this.candidateRegistry.consumeCandidate(candidateId, now);
    if (!consumeResult.success || !consumeResult.candidate) {
      const isSecurity = consumeResult.code === 'UNKNOWN_OR_FORGED';
      this.auditLogger.log(
        'candidate_rejected',
        'operator',
        { candidateId, reason: consumeResult.reason, code: consumeResult.code },
        isSecurity ? 'security' : 'warning'
      );
      return {
        success: false,
        reason: consumeResult.reason || 'Candidate approval rejected'
      };
    }

    const candidate = consumeResult.candidate;
    candidate.status = 'approved';
    this.auditLogger.log('candidate_approved', 'operator', { candidateId: candidate.id });

    // 4. Return the command tagged with source = 'operator' using the GENUINE stored actionPayload
    const timestamp = now ?? Date.now();
    const approvedCommand: FreeShowCommand = {
      ...candidate.actionPayload,
      source: 'operator',
      correlationId: `corr_appr_${candidate.id}_${timestamp}`,
      createdAt: timestamp
    };

    return {
      success: true,
      command: approvedCommand
    };
  }

  /**
   * Internal permission recalculation based on current state.
   */
  private recalculatePermissions(): void {
    // Projection permission is ONLY possible if FreeShow is connected,
    // manual lock is inactive, and mode is explicitly automatic.
    this.state.projectionPermission =
      this.state.freeShowConnected &&
      !this.state.manualLockActive &&
      this.state.operatorMode === 'automatic';
  }
}
