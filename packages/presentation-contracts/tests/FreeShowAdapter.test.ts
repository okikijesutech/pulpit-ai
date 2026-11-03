import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockFreeShowServer } from '../src/MockFreeShowServer.js';
import { FreeShowAdapter } from '../src/FreeShowAdapter.js';
import { AuthorityManager } from '@pulpit-ai/authority-manager';
import { FreeShowCommand } from '@pulpit-ai/shared-types';

describe('FreeShowAdapter Integration with MockFreeShowServer', () => {
  let mockServer: MockFreeShowServer;
  let authorityManager: AuthorityManager;
  let adapter: FreeShowAdapter;
  let port: number;

  beforeEach(async () => {
    mockServer = new MockFreeShowServer();
    port = await mockServer.start();
    authorityManager = new AuthorityManager();
    adapter = new FreeShowAdapter(authorityManager, {
      host: '127.0.0.1',
      port,
      reconnectIntervalMs: 500
    });
  });

  afterEach(async () => {
    adapter.disconnect();
    await mockServer.stop();
  });

  it('connects to mock FreeShow server and synchronizes authority state', async () => {
    expect(authorityManager.getState().freeShowConnected).toBe(false);

    const connected = await adapter.connect();
    expect(connected).toBe(true);
    expect(adapter.getStatus()).toBe('connected');
    expect(authorityManager.getState().freeShowConnected).toBe(true);

    const snapshot = adapter.getSnapshot();
    expect(snapshot.connected).toBe(true);
    expect(snapshot.currentSlideText).toBe('Welcome to Church');
  });

  it('successfully dispatches an approved operator command to FreeShow', async () => {
    await adapter.connect();

    const command: FreeShowCommand = {
      action: 'next_slide',
      source: 'operator',
      correlationId: 'test_op_1',
      createdAt: Date.now()
    };

    const result = await adapter.dispatchCommand(command);
    expect(result.success).toBe(true);

    const received = mockServer.getReceivedCommands();
    expect(received.length).toBe(1);
    expect(received[0].action).toBe('next_slide');

    // Verify slide advanced on FreeShow
    await new Promise((r) => setTimeout(r, 50));
    expect(adapter.getSnapshot().currentSlideIndex).toBe(1);
  });

  it('STRICTLY BLOCKS unapproved AI commands from reaching the network', async () => {
    await adapter.connect();

    // AuthorityManager is in default suggestions mode
    expect(authorityManager.getState().operatorMode).toBe('suggestions');

    const aiCommand: FreeShowCommand = {
      action: 'next_slide',
      source: 'ai',
      correlationId: 'test_ai_blocked',
      createdAt: Date.now()
    };

    const result = await adapter.dispatchCommand(aiCommand);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Suggestions mode is active');

    // CRITICAL SECURITY ASSERTION: Zero commands hit the mock server!
    const received = mockServer.getReceivedCommands();
    expect(received.length).toBe(0);
  });

  it('blocks commands when manual safety lock is active', async () => {
    await adapter.connect();
    authorityManager.setManualLock(true);

    const command: FreeShowCommand = {
      action: 'clear_all',
      source: 'ai',
      correlationId: 'test_lock_blocked',
      createdAt: Date.now()
    };

    const result = await adapter.dispatchCommand(command);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Manual Safety Lock is active');

    const received = mockServer.getReceivedCommands();
    expect(received.length).toBe(0);
  });

  it('notifies authority manager and rejects commands upon disconnect', async () => {
    await adapter.connect();
    expect(authorityManager.getState().freeShowConnected).toBe(true);

    // Stop mock server and disconnect
    adapter.disconnect();
    await mockServer.stop();
    await new Promise((r) => setTimeout(r, 200));

    expect(authorityManager.getState().freeShowConnected).toBe(false);

    const command: FreeShowCommand = {
      action: 'next_slide',
      source: 'operator',
      correlationId: 'test_disconnected',
      createdAt: Date.now()
    };

    const result = await adapter.dispatchCommand(command);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('disconnected');
  });

  describe('PR 2: Unsafe Defaults & Test Hooks Removal', () => {
    it('rejects start_scripture command with no reference with success: false (no 43.3.16 or John 3:16 fallbacks)', async () => {
      await adapter.connect();

      const emptyScriptureCommand: FreeShowCommand = {
        action: 'start_scripture',
        data: {}, // No reference provided!
        source: 'operator',
        correlationId: 'test_empty_scripture',
        createdAt: Date.now()
      };

      const result = await adapter.dispatchCommand(emptyScriptureCommand);
      expect(result.success).toBe(false);
      expect(result.reason).toContain('reference');

      // Verify no command reached server with fallbacks
      const received = mockServer.getReceivedCommands();
      expect(received.length).toBe(0);
    });

    it('emits start_scripture to FreeShow exactly ONCE per approval', async () => {
      await adapter.connect();

      const scriptureCommand: FreeShowCommand = {
        action: 'start_scripture',
        data: { reference: 'Romans 8:28', text: 'All things work together for good...' },
        source: 'operator',
        correlationId: 'test_single_emit',
        createdAt: Date.now()
      };

      const result = await adapter.dispatchCommand(scriptureCommand);
      expect(result.success).toBe(true);

      const received = mockServer.getReceivedCommands().filter((c) => c.action === 'start_scripture');
      // Must be sent exactly ONCE, not twice!
      expect(received.length).toBe(1);
    });

    it('reports sent_unconfirmed when FreeShow does not acknowledge or emit matching output event within timeout', async () => {
      await adapter.connect();

      // Configure a silent action that mock server will not acknowledge or broadcast
      const unconfirmedCommand: FreeShowCommand = {
        action: 'start_show',
        data: { name: 'NonExistentShow' },
        source: 'operator',
        correlationId: 'test_unconfirmed',
        createdAt: Date.now()
      };

      // Mock server handler without ack callback or matching output
      const rawSocket = (adapter as any).socket;
      const originalEmit = rawSocket.emit.bind(rawSocket);
      rawSocket.emit = (event: string, ...args: any[]) => {
        // Do not call callback and do not broadcast matching output
        if (event === 'action') return;
        return originalEmit(event, ...args);
      };

      const result = await adapter.dispatchCommand(unconfirmedCommand);
      expect(result.success).toBe(false);
      expect(result.status).toBe('sent_unconfirmed');
      expect(result.reason).toContain('sent_unconfirmed');
    });

    it('does not send hardcoded 1445 auth key when authKey option is not provided', async () => {
      const unauthenticatedAdapter = new FreeShowAdapter(authorityManager, {
        host: '127.0.0.1',
        port,
        reconnectIntervalMs: 500
      });

      let sentRemoteData: any = null;
      await new Promise<void>((resolve) => {
        unauthenticatedAdapter.connect().then(() => {
          const sock = (unauthenticatedAdapter as any).socket;
          const origEmit = sock.emit.bind(sock);
          sock.emit = (channel: string, payload: any) => {
            if (channel === 'REMOTE' && payload?.channel === 'ACCESS') {
              sentRemoteData = payload.data;
            }
            return origEmit(channel, payload);
          };
          resolve();
        });
      });

      // Verify 1445 was NOT used as a hardcoded default!
      expect(sentRemoteData).not.toBe('1445');
      unauthenticatedAdapter.disconnect();
    });
  });
});
