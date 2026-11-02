import { createServer, Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';

export interface MockServerOptions {
  port?: number;
  authKey?: string;
}

export class MockFreeShowServer {
  private httpServer: HttpServer | null = null;
  private io: SocketIOServer | null = null;
  private port: number;
  private authKey?: string;
  private currentSlideIndex = 0;
  private currentShowId = 'show_mock_1';
  private currentSlideText = 'Welcome to Church';
  private isOutputCleared = false;
  private receivedCommands: Array<{ action: string; data?: any; timestamp: number }> = [];

  constructor(options: MockServerOptions = {}) {
    this.port = options.port ?? 0; // 0 chooses an available dynamic port for testing
    this.authKey = options.authKey;
  }

  public async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.httpServer = createServer((req, res) => {
        // Handle REST fallback endpoint: /?action=ACTION&data=JSON
        const url = new URL(req.url ?? '/', `http://localhost:${this.port}`);
        const action = url.searchParams.get('action');
        const dataStr = url.searchParams.get('data');

        if (action) {
          let data: any = undefined;
          if (dataStr) {
            try {
              data = JSON.parse(dataStr);
            } catch {
              data = dataStr;
            }
          }
          this.handleAction(action, data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, action }));
          return;
        }

        res.writeHead(404);
        res.end();
      });

      this.io = new SocketIOServer(this.httpServer, {
        cors: { origin: '*' }
      });

      this.io.on('connection', (socket) => {
        // Emit initial state snapshot to connecting client
        socket.emit('data', {
          slide_number: this.currentSlideIndex,
          show_id: this.currentShowId,
          slide_text: this.currentSlideText,
          is_cleared: this.isOutputCleared
        });

        // Listen for action payloads
        socket.on('action', (payload: { action: string; data?: any }, callback) => {
          this.handleAction(payload.action, payload.data);
          if (typeof callback === 'function') {
            callback({ success: true, action: payload.action });
          }
        });

        // Listen for FreeShow 'data' command payloads
        socket.on('data', (raw: any) => {
          let payload = raw;
          if (typeof payload === 'string') {
            try { payload = JSON.parse(payload); } catch {}
          }
          if (payload && payload.action && payload.action !== 'data') {
            const last = this.receivedCommands[this.receivedCommands.length - 1];
            if (!last || last.action !== payload.action || Date.now() - last.timestamp > 50) {
              this.handleAction(payload.action, payload.data ?? payload);
            }
          }
        });

        // Allow direct event by action name (e.g. socket.emit("next_slide"))
        socket.onAny((event, ...args) => {
          if (event !== 'action' && event !== 'disconnect' && event !== 'data') {
            const data = args[0];
            const callback = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : undefined;
            this.handleAction(event, data);
            if (callback) {
              callback({ success: true, action: event });
            }
          }
        });
      });

      this.httpServer.listen(this.port, '127.0.0.1', () => {
        const addr = this.httpServer!.address();
        if (typeof addr === 'object' && addr) {
          this.port = addr.port;
          resolve(this.port);
        } else {
          reject(new Error('Failed to obtain server address'));
        }
      });
    });
  }

  private handleAction(action: string, data?: any): void {
    this.receivedCommands.push({ action, data, timestamp: Date.now() });

    switch (action) {
      case 'next_slide':
        this.currentSlideIndex++;
        this.currentSlideText = `Slide ${this.currentSlideIndex} text`;
        break;
      case 'previous_slide':
        if (this.currentSlideIndex > 0) this.currentSlideIndex--;
        this.currentSlideText = `Slide ${this.currentSlideIndex} text`;
        break;
      case 'clear_all':
      case 'clear_slide':
        this.isOutputCleared = true;
        break;
      case 'restore_output':
        this.isOutputCleared = false;
        break;
      case 'start_scripture':
        this.currentShowId = data?.reference ? `Scripture: ${data.reference}` : 'Scripture';
        this.currentSlideText = data?.text || data?.fullText || (data?.reference ? `Scripture: ${data.reference}` : 'Scripture');
        this.isOutputCleared = false;
        break;
      case 'start_show':
        if (data?.name) this.currentShowId = data.name;
        this.currentSlideIndex = 0;
        break;
    }

    // Broadcast updated state to all connected clients
    this.broadcastState();
  }

  public broadcastState(): void {
    if (!this.io) return;
    this.io.emit('data', {
      slide_number: this.currentSlideIndex,
      show_id: this.currentShowId,
      slide_text: this.currentSlideText,
      is_cleared: this.isOutputCleared
    });
  }

  public simulateOperatorSlideChange(index: number, text: string): void {
    this.currentSlideIndex = index;
    this.currentSlideText = text;
    this.broadcastState();
  }

  public getReceivedCommands(): Array<{ action: string; data?: any; timestamp: number }> {
    return [...this.receivedCommands];
  }

  public clearReceivedCommands(): void {
    this.receivedCommands = [];
  }

  public getPort(): number {
    return this.port;
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.io) {
        this.io.close();
        this.io = null;
      }
      if (this.httpServer) {
        this.httpServer.close(() => {
          this.httpServer = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
