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
        this.socket.on('data', (payload: any) => {
          this.stateSnapshot.lastHeartbeat = Date.now();
          if (payload) {
            if (typeof payload.slide_number === 'number') {
              this.stateSnapshot.currentSlideIndex = payload.slide_number;
            }
            if (typeof payload.show_id === 'string') {
              this.stateSnapshot.currentShowId = payload.show_id;
            }
            if (typeof payload.slide_text === 'string') {
              this.stateSnapshot.currentSlideText = payload.slide_text;
            }
            if (typeof payload.is_cleared === 'boolean') {
              this.stateSnapshot.isOutputCleared = payload.is_cleared;
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
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          reason: 'Command dispatch timed out awaiting FreeShow response.'
        });
      }, 3000);

      this.socket!.emit(
        'action',
        { action: command.action, data: command.data },
        (response: any) => {
          clearTimeout(timeout);
          if (response && response.success !== false) {
            resolve({ success: true });
          } else {
            resolve({
              success: false,
              reason: response?.error || 'FreeShow returned an error.'
            });
          }
        }
      );
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
