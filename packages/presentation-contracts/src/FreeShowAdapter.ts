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

  private extractFreeShowText(data: any): string | null {
    if (!data) return null;
    // Temp items (scriptures, quick texts)
    if (data.tempItems && Array.isArray(data.tempItems)) {
      const parts: string[] = [];
      for (const item of data.tempItems) {
        if (item.lines && Array.isArray(item.lines)) {
          for (const line of item.lines) {
            if (Array.isArray(line.items)) {
              const text = line.items.map((i: any) => i.text || '').join('').trim();
              if (text) parts.push(text);
            } else if (typeof line.text === 'string' && line.text.trim()) {
              parts.push(line.text.trim());
            }
          }
        }
      }
      if (parts.length > 0) return parts.join('\n');
    }
    // Regular slide items
    if (data.items && Array.isArray(data.items)) {
      const parts: string[] = [];
      for (const item of data.items) {
        if (item.lines && Array.isArray(item.lines)) {
          for (const line of item.lines) {
            if (Array.isArray(line.items)) {
              const text = line.items.map((i: any) => i.text || '').join('').trim();
              if (text) parts.push(text);
            } else if (typeof line.text === 'string' && line.text.trim()) {
              parts.push(line.text.trim());
            }
          }
        }
      }
      if (parts.length > 0) return parts.join('\n');
    }
    return null;
  }

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

          // Authenticate with FreeShow Remote Server protocol (port 5510) if authKey is configured
          if (this.authKey) {
            this.socket!.emit('REMOTE', {
              id: this.socket!.id || '',
              channel: 'ACCESS',
              data: this.authKey
            });
          }

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

        // Listen for FreeShow Remote protocol events (port 5510)
        this.socket.on('REMOTE', (msg: any) => {
          this.stateSnapshot.lastHeartbeat = Date.now();
          if (!msg || typeof msg !== 'object') return;

          if (msg.channel === 'ACCESS' && msg.data === true) {
            this.updateStatus('connected');
          } else if (msg.channel === 'OUT' && msg.data) {
            const projectedText = this.extractFreeShowText(msg.data);
            if (projectedText) {
              this.stateSnapshot.currentSlideText = projectedText;
              this.stateSnapshot.isOutputCleared = false;
            }
            if (typeof msg.data.slide === 'number') {
              this.stateSnapshot.currentSlideIndex = msg.data.slide;
            }
          } else if (msg.channel === 'SHOW' && msg.data && typeof msg.data.name === 'string') {
            this.stateSnapshot.currentShowId = msg.data.name;
          }
          this.notify();
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
  ): Promise<{ success: boolean; status?: 'confirmed' | 'sent_unconfirmed' | 'rejected'; reason?: string }> {
    // 1. Central Authority Check
    const decision = this.authorityManager.authorizeCommand(command);
    if (!decision.allowed) {
      return {
        success: false,
        status: 'rejected',
        reason: decision.reason
      };
    }

    // 2. Validate scripture command reference (strictly no 43.3.16 or John 3:16 fallbacks)
    let refDisplay: string | undefined = undefined;
    if (command.action === 'start_scripture') {
      const rawRef = command.data?.reference;
      const displayRef = command.data?.referenceDisplay;
      const book = command.data?.book;

      if (displayRef && typeof displayRef === 'string' && displayRef.trim().length > 0) {
        refDisplay = displayRef.trim();
      } else if (rawRef && typeof rawRef === 'string' && rawRef.trim().length > 0) {
        refDisplay = rawRef.trim();
      } else if (book && typeof book === 'string' && book.trim().length > 0) {
        refDisplay = `${book} ${command.data?.chapter}:${command.data?.verseStart ?? command.data?.verse}`;
      } else {
        return {
          success: false,
          status: 'rejected',
          reason: 'Command rejected: start_scripture requires a valid, explicit reference.'
        };
      }
    }

    // 3. Ensure connection is active
    if (!this.socket || !this.socket.connected) {
      return {
        success: false,
        status: 'rejected',
        reason: 'FreeShow socket is not connected.'
      };
    }

    // 4. Dispatch to FreeShow
    return new Promise((resolve) => {
      let resolved = false;
      let outputListener: ((msg: any) => void) | null = null;
      let dataListener: ((raw: any) => void) | null = null;
      let unconfirmedTimer: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (outputListener && this.socket) {
          this.socket.off('REMOTE', outputListener);
          outputListener = null;
        }
        if (dataListener && this.socket) {
          this.socket.off('data', dataListener);
          dataListener = null;
        }
        if (unconfirmedTimer) {
          clearTimeout(unconfirmedTimer);
          unconfirmedTimer = null;
        }
      };

      const finish = (res: { success: boolean; status?: 'confirmed' | 'sent_unconfirmed' | 'rejected'; reason?: string }) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(res);
        }
      };

      // Failsafe timer: if server does not acknowledge or emit matching output event within 1200ms,
      // report sent_unconfirmed (NEVER report fake success after 300ms)
      unconfirmedTimer = setTimeout(() => {
        finish({
          success: false,
          status: 'sent_unconfirmed',
          reason: 'sent_unconfirmed: Command was dispatched to FreeShow but no acknowledgment or matching output event was received.'
        });
      }, 1200);

      const text = String(command.data?.text ?? command.data?.fullText ?? refDisplay ?? '');

      // Listen for matching FreeShow output event (port 5510 Remote protocol)
      outputListener = (msg: any) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.channel === 'OUT' && msg.data) {
          const projectedText = this.extractFreeShowText(msg.data) || '';
          if (refDisplay && (projectedText.includes(refDisplay) || (command.data?.text && projectedText.includes(String(command.data.text))))) {
            finish({ success: true, status: 'confirmed' });
          } else if (command.action === 'clear_all' || command.action === 'clear_slide') {
            finish({ success: true, status: 'confirmed' });
          }
        }
      };
      this.socket!.on('REMOTE', outputListener);

      // Listen for mock/REST data event broadcast
      dataListener = (raw: any) => {
        if (!raw) return;
        if (refDisplay && (String(raw.show_id || '').includes(refDisplay) || String(raw.slide_text || '').includes(refDisplay))) {
          finish({ success: true, status: 'confirmed' });
        } else if ((command.action === 'clear_all' || command.action === 'clear_slide') && raw.is_cleared) {
          finish({ success: true, status: 'confirmed' });
        } else if (command.action === 'next_slide' || command.action === 'previous_slide' || command.action === 'restore_output') {
          finish({ success: true, status: 'confirmed' });
        }
      };
      this.socket!.on('data', dataListener);

      // Dispatch to FreeShow Remote Server protocol (port 5510)
      let remoteChannel: string | null = null;
      let remoteData: any = undefined;

      switch (command.action) {
        case 'start_scripture':
          remoteChannel = 'API:start_scripture';
          remoteData = { reference: refDisplay, play: true };
          break;
        case 'next_slide':
          remoteChannel = 'API:next_slide';
          break;
        case 'previous_slide':
          remoteChannel = 'API:previous_slide';
          break;
        case 'clear_all':
        case 'clear_slide':
          remoteChannel = 'API:clear_all';
          break;
        case 'restore_output':
          remoteChannel = 'API:restore_output';
          break;
        case 'start_show':
          remoteChannel = 'API:start_show';
          remoteData = command.data;
          break;
      }

      // Emit REMOTE command exactly ONCE
      if (remoteChannel) {
        this.socket!.emit('REMOTE', {
          id: this.socket!.id || '',
          channel: remoteChannel,
          data: remoteData
        });
      }

      // Emit action with callback for port 5505 / mock server
      this.socket!.emit('action', { action: command.action, data: command.data }, (response: any) => {
        if (response && response.success !== false) {
          finish({ success: true, status: 'confirmed' });
        } else if (response && response.success === false) {
          finish({
            success: false,
            status: 'rejected',
            reason: response?.error || 'FreeShow returned an error.'
          });
        }
      });

      // Update local state snapshot for operator preview
      if (command.action === 'start_scripture' && refDisplay) {
        this.stateSnapshot.currentShowId = `Scripture: ${refDisplay}`;
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
