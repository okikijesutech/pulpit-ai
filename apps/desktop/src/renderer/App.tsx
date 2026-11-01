import React, { useEffect, useState } from 'react';
import {
  AllowlistedAction,
  AuditEvent,
  AuthorityState,
  FreeShowStateSnapshot,
  OperatorMode,
  SuggestionCandidate
} from '@pulpit-ai/shared-types';
import { Header } from './components/Header.js';
import { ManualLockBanner } from './components/ManualLockBanner.js';
import { LiveOutputPanel } from './components/LiveOutputPanel.js';
import { SuggestionsQueue } from './components/SuggestionsQueue.js';
import { ManualControlsPanel } from './components/ManualControlsPanel.js';
import { AuditTrailPanel } from './components/AuditTrailPanel.js';

export const App: React.FC = () => {
  const [authorityState, setAuthorityState] = useState<AuthorityState>({
    operatorMode: 'suggestions',
    listeningEnabled: true,
    suggestionsEnabled: true,
    projectionPermission: false,
    manualLockActive: false,
    freeShowConnected: false,
    lastOperatorActionAt: null,
    activeSourceId: null
  });

  const [freeShowSnapshot, setFreeShowSnapshot] = useState<FreeShowStateSnapshot>({
    connected: false,
    status: 'disconnected',
    lastHeartbeat: 0
  });

  const [candidates, setCandidates] = useState<SuggestionCandidate[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    // Initial fetch
    if (window.pulpitAPI) {
      window.pulpitAPI.getAuthorityState().then(setAuthorityState).catch(console.error);
      window.pulpitAPI.getFreeShowSnapshot().then((snap) => {
        if (snap) setFreeShowSnapshot(snap);
      }).catch(console.error);
      window.pulpitAPI.getAuditEvents().then(setAuditEvents).catch(console.error);

      // Reactive event subscriptions
      const unsubAuth = window.pulpitAPI.onAuthorityStateChange((state) => {
        setAuthorityState(state);
      });

      const unsubFS = window.pulpitAPI.onFreeShowStateChange((snap) => {
        setFreeShowSnapshot(snap);
      });

      const unsubAudit = window.pulpitAPI.onAuditEvent((ev) => {
        setAuditEvents((prev) => [ev, ...prev].slice(0, 50));
      });

      return () => {
        unsubAuth();
        unsubFS();
        unsubAudit();
      };
    }
  }, []);

  const handleToggleLock = async () => {
    if (window.pulpitAPI) {
      const nextLock = !authorityState.manualLockActive;
      await window.pulpitAPI.setManualLock(nextLock);
      const state = await window.pulpitAPI.getAuthorityState();
      setAuthorityState(state);
      const events = await window.pulpitAPI.getAuditEvents();
      setAuditEvents(events);
    }
  };

  const handleModeChange = async (mode: OperatorMode) => {
    if (window.pulpitAPI) {
      await window.pulpitAPI.setOperatorMode(mode);
      const state = await window.pulpitAPI.getAuthorityState();
      setAuthorityState(state);
      const events = await window.pulpitAPI.getAuditEvents();
      setAuditEvents(events);
    }
  };

  const handleConnectFreeShow = async () => {
    if (window.pulpitAPI) {
      await window.pulpitAPI.connectFreeShow(5505);
      const snap = await window.pulpitAPI.getFreeShowSnapshot();
      if (snap) setFreeShowSnapshot(snap);
      const state = await window.pulpitAPI.getAuthorityState();
      setAuthorityState(state);
    }
  };

  const handleDisconnectFreeShow = async () => {
    if (window.pulpitAPI) {
      await window.pulpitAPI.disconnectFreeShow();
      const snap = await window.pulpitAPI.getFreeShowSnapshot();
      if (snap) setFreeShowSnapshot(snap);
      const state = await window.pulpitAPI.getAuthorityState();
      setAuthorityState(state);
    }
  };

  const handleDispatchCommand = async (action: AllowlistedAction, data?: any) => {
    if (window.pulpitAPI) {
      const res = await window.pulpitAPI.dispatchOperatorCommand(action, data);
      if (!res.success) {
        alert(`Command rejected: ${res.reason}`);
      }
      const events = await window.pulpitAPI.getAuditEvents();
      setAuditEvents(events);
    }
  };

  const handleApproveCandidate = async (candidate: SuggestionCandidate) => {
    if (window.pulpitAPI) {
      const res = await window.pulpitAPI.approveCandidate(candidate);
      if (res.success) {
        // Remove approved candidate from queue
        setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
      } else {
        alert(`Approval rejected: ${res.reason}`);
      }
      const events = await window.pulpitAPI.getAuditEvents();
      setAuditEvents(events);
    }
  };

  const handleDismissCandidate = (id: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddMockCandidate = () => {
    const mockCand: SuggestionCandidate = {
      id: `cand_${Date.now()}`,
      type: 'scripture',
      title: 'Psalm 23:1',
      contentPreview: 'The LORD is my shepherd; I shall not want.',
      confidence: 0.98,
      evidence: 'Pastor spoke: "open your Bibles to Psalm twenty-three verse one"',
      detectedAt: Date.now(),
      status: 'pending',
      actionPayload: {
        action: 'start_scripture',
        data: { reference: 'Psalm 23:1' },
        source: 'ai',
        correlationId: `mock_${Date.now()}`,
        createdAt: Date.now()
      }
    };
    setCandidates((prev) => [mockCand, ...prev]);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <Header
        authorityState={authorityState}
        freeShowSnapshot={freeShowSnapshot}
        onModeChange={handleModeChange}
        onConnectFreeShow={handleConnectFreeShow}
        onDisconnectFreeShow={handleDisconnectFreeShow}
      />

      <ManualLockBanner
        isLocked={authorityState.manualLockActive}
        onToggleLock={handleToggleLock}
      />

      <main className="flex-1 p-6 grid grid-cols-12 gap-6 min-h-0">
        {/* Left Column: Live Screen and Manual Controls */}
        <div className="col-span-4 flex flex-col gap-6 min-h-0">
          <div className="flex-1 min-h-0">
            <LiveOutputPanel snapshot={freeShowSnapshot} />
          </div>
          <div>
            <ManualControlsPanel
              onDispatch={handleDispatchCommand}
              onAddMockCandidate={handleAddMockCandidate}
              disabled={!freeShowSnapshot.connected}
            />
          </div>
        </div>

        {/* Center Column: Suggested Content Queue */}
        <div className="col-span-5 flex flex-col min-h-0">
          <SuggestionsQueue
            candidates={candidates}
            isLocked={authorityState.manualLockActive}
            onApprove={handleApproveCandidate}
            onDismiss={handleDismissCandidate}
          />
        </div>

        {/* Right Column: Live Security & Authority Audit Trail */}
        <div className="col-span-3 flex flex-col min-h-0">
          <AuditTrailPanel events={auditEvents} />
        </div>
      </main>
    </div>
  );
};

export default App;
