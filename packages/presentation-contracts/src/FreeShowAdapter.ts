import { io, Socket } from 'socket.io-client';
import {
  FreeShowCommand,
  FreeShowConnectionStatus,
  FreeShowStateSnapshot
} from '@pulpit-ai/shared-types';
import { AuthorityManager } from '@pulpit-ai/authority-manager';

export interface FreeShowAdapterOptions {
  host?: string;
  port?: number;
  authKey?: string;
  reconnectIntervalMs?: number;
  maxReconnectAttempts?: number;
}

export type FreeShowStateListener = (snapshot: FreeShowStateSnapshot) => void;

export class FreeShowAdapter {
  private socket: Socket | null = null;
  private readonly authorityManager: AuthorityManager;
  private host: string;
  private port: number;
  private authKey?: string;
  private status: FreeShowConnectionStatus = 'disconnected';
  private stateSnapshot: FreeShowStateSnapshot;
  private listeners: Set<FreeShowStateListener> = new Set();
  private reconnectIntervalMs: number;
  private isManuallyClosed = false;

  constructor(authorityManager: AuthorityManager, options: FreeShowAdapterOptions = {}) {
    this.authorityManager = authorityManager;
    this.host = options.host ?? 'localhost';
    this.port = options.port ?? 5510;
    this.authKey = options.authKey;
    this.reconnectIntervalMs = options.reconnectIntervalMs ?? 3000;

    this.stateSnapshot = {
      connected: false,
      status: 'disconnected',
      lastHeartbeat: 0
    };
  }

  public getStatus(): FreeShowConnectionStatus {
    return this.status;
  }

  public getSnapshot(): Readonly<FreeShowStateSnapshot> {
    return { ...this.stateSnapshot };
  }

  public subscribe(listener: FreeShowStateListener): () => void {
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
        console.error('Error in FreeShowAdapter listener:', err);
      }
    }
  }

  private updateStatus(newStatus: FreeShowConnectionStatus): void {
    if (this.status === newStatus) return;

    this.status = newStatus;
    const isConnected = newStatus === 'connected';
    this.stateSnapshot.status = newStatus;
    this.stateSnapshot.connected = isConnected;

    // Immediately inform the Central Authority Manager
    this.authorityManager.setFreeShowConnected(isConnected);

    this.notify();
  }

  public async connect(): Promise<boolean> {
    this.isManuallyClosed = false;
    this.updateStatus('connecting');

    const url = `http://${this.host}:${this.port}`;

    return new Promise((resolve) => {
      try {
        this.socket = io(url, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: this.reconnectIntervalMs,
          timeout: 5000,
          auth: this.authKey ? { token: this.authKey } : undefined
        });

        this.socket.on('connect', () => {
          this.stateSnapshot.lastHeartbeat = Date.now();
          this.updateStatus('connected');
          resolve(true);
        });

        this.socket.on('disconnect', () => {
          if (!this.isManuallyClosed) {
            this.updateStatus('reconnecting');
          } else {
            this.updateStatus('disconnected');
          }
        });

        this.socket.on('connect_error', () => {
          if (!this.isManuallyClosed && this.status !== 'reconnecting') {
            this.updateStatus('error');
          }
          resolve(false);
        });

        // Listen for incoming FreeShow telemetry
        this.socket.on('data', (rawPayload: any) => {
          this.stateSnapshot.lastHeartbeat = Date.now();
          let payload = rawPayload;
          if (typeof payload === 'string') {
            try {
              payload = JSON.parse(payload);
            } catch {
              payload = { slide_text: rawPayload };
            }
          }
          if (payload && typeof payload === 'object') {
            const slideNum = payload.slide_number ?? payload.slideIndex ?? payload.slide ?? payload.index;
            if (typeof slideNum === 'number') {
              this.stateSnapshot.currentSlideIndex = slideNum;
            }
            const showId = payload.show_id ?? payload.show ?? payload.name;
            if (typeof showId === 'string') {
              this.stateSnapshot.currentShowId = showId;
            }
            const slideText = payload.slide_text ?? payload.text ?? payload.content;
            if (typeof slideText === 'string') {
              this.stateSnapshot.currentSlideText = slideText;
            }
            const isCleared = payload.is_cleared ?? payload.cleared ?? payload.hidden;
            if (typeof isCleared === 'boolean') {
              this.stateSnapshot.isOutputCleared = isCleared;
            }
          }
          this.notify();
        });
      } catch (err) {
        console.error('Failed to initialize socket connection:', err);
        this.updateStatus('error');
        resolve(false);
      }
    });
  }

  /**
   * Dispatches a command to FreeShow.
   * NON-NEGOTIABLE SAFETY GATE:
   * 1. Checks AuthorityManager.authorizeCommand(command) immediately before sending.
   * 2. If rejected, command is DROPPED. It never touches the socket.
   */
  public async dispatchCommand(
    command: FreeShowCommand
  ): Promise<{ success: boolean; reason?: string }> {
    // 1. Central Authority Check
    const decision = this.authorityManager.authorizeCommand(command);
    if (!decision.allowed) {
      return {
        success: false,
        reason: decision.reason
      };
    }

    // 2. Ensure connection is active
    if (!this.socket || !this.socket.connected) {
      return {
        success: false,
        reason: 'FreeShow socket is not connected.'
      };
    }

    // 3. Dispatch to FreeShow
    return new Promise((resolve) => {
      let resolved = false;
      const done = (res: { success: boolean; reason?: string }) => {
        if (!resolved) {
          resolved = true;
          resolve(res);
        }
      };

      // Failsafe timer: if server doesn't provide an ack callback, treat as delivered within 300ms
      const timer = setTimeout(() => {
        done({ success: true });
      }, 300);

      const payload = {
        action: command.action,
        data: command.data
      };

      // Emit action with callback
      this.socket!.emit('action', payload, (response: any) => {
        clearTimeout(timer);
        if (response && response.success !== false) {
          done({ success: true });
        } else {
          done({
            success: false,
            reason: response?.error || 'FreeShow returned an error.'
          });
        }
      });

      // Optimistically update snapshot so presentation display reflects approved projection
      if (command.action === 'start_scripture') {
        const ref = String(command.data?.reference ?? 'Scripture');
        const text = String(command.data?.text ?? command.data?.fullText ?? ref);
        this.stateSnapshot.currentShowId = `Scripture: ${ref}`;
        this.stateSnapshot.currentSlideText = text;
        this.stateSnapshot.isOutputCleared = false;
        this.notify();
      } else if (command.action === 'clear_all' || command.action === 'clear_slide') {
        this.stateSnapshot.isOutputCleared = true;
        this.notify();
      } else if (command.action === 'restore_output') {
        this.stateSnapshot.isOutputCleared = false;
        this.notify();
      }
    });
  }

  public disconnect(): void {
    this.isManuallyClosed = true;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.updateStatus('disconnected');
  }
}
