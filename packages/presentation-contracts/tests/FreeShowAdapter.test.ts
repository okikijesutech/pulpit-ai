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

    // Stop mock server
    await mockServer.stop();
    await new Promise((r) => setTimeout(r, 100));

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
});
