import React, { useEffect, useState } from 'react';
import {
  AllowlistedAction,
  AuditEvent,
  AudioInputDevice,
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
import {
  LiveTranscriptPanel,
  RecognizedTranscriptEvent
} from './components/LiveTranscriptPanel.js';
import { SongLibraryPanel } from './components/SongLibraryPanel.js';
import {
  SermonScripturePinboard,
  PinnedScripture
} from './components/SermonScripturePinboard.js';
import { BibleExplorerModal } from './components/BibleExplorerModal.js';
import { AudioLevelMetrics, AudioActivityMetrics } from '../preload/index.js';
import { physicalMicService } from './services/MicrophoneAudioService.js';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'live' | 'songs'>('live');
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

  const [audioDevices, setAudioDevices] = useState<AudioInputDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('default_mic');
  const [audioLevel, setAudioLevel] = useState<AudioLevelMetrics>({
    rmsLevel: 0,
    decibels: -100,
    isClipping: false,
    isSilent: true
  });
  const [audioActivity, setAudioActivity] = useState<AudioActivityMetrics | undefined>(undefined);

  const [candidates, setCandidates] = useState<SuggestionCandidate[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [transcripts, setTranscripts] = useState<RecognizedTranscriptEvent[]>([]);
  const [activeTranslation, setActiveTranslation] = useState<string>('WEB');
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isBibleExplorerOpen, setIsBibleExplorerOpen] = useState<boolean>(false);
  const [pinnedScriptures, setPinnedScriptures] = useState<PinnedScripture[]>([]);

  useEffect(() => {
    if (window.pulpitAPI) {
      // Initial fetch
      window.pulpitAPI.getAuthorityState().then(setAuthorityState).catch(console.error);
      window.pulpitAPI.getFreeShowSnapshot().then((snap) => {
        if (snap) setFreeShowSnapshot(snap);
      }).catch(console.error);
      window.pulpitAPI.getAuditEvents().then(setAuditEvents).catch(console.error);

      // PR 6: Enumerate real physical audio devices
      physicalMicService
        .enumerateDevices()
        .then((devs) => {
          if (devs.length > 0) {
            setAudioDevices(devs);
            setActiveDeviceId(devs[0].id);
            window.pulpitAPI.updateAudioDevices(devs).catch(console.error);
          } else {
            window.pulpitAPI
              .getAudioDevices()
              .then((stored) => {
                setAudioDevices(stored);
                if (stored.length > 0) setActiveDeviceId(stored[0].id);
              })
              .catch(console.error);
          }
        })
        .catch(console.error);

      // Reactive event subscriptions
      const unsubAuth = window.pulpitAPI.onAuthorityStateChange(setAuthorityState);
      const unsubFS = window.pulpitAPI.onFreeShowStateChange(setFreeShowSnapshot);
      const unsubAudit = window.pulpitAPI.onAuditEvent((ev) => {
        setAuditEvents((prev) => [ev, ...prev].slice(0, 50));
      });
      const unsubAudioLevel = window.pulpitAPI.onAudioLevelChange(setAudioLevel);
      const unsubAudioActivity = window.pulpitAPI.onAudioActivityMode(setAudioActivity);
      const unsubTranscript = window.pulpitAPI.onTranscriptEvent((event) => {
        setTranscripts((prev) => [event, ...prev].slice(0, 50));
      });
      const unsubScripture = window.pulpitAPI.onScriptureCandidate((candidate) => {
        setCandidates((prev) => [
          candidate,
          ...prev.filter((c) => (!candidate.supersedesId || c.id !== candidate.supersedesId) && c.title !== candidate.title)
        ]);
      });
      const unsubSong = window.pulpitAPI.onSongCandidate((candidate) => {
        setCandidates((prev) => [candidate, ...prev.filter((c) => c.title !== candidate.title)]);
      });

      // Start physical microphone audio capture
      physicalMicService.start().catch((err) => {
        console.warn('Physical mic start error:', err);
      });

      const unsubMic = physicalMicService.subscribeStatus((status) => {
        if (status.isMuted !== undefined) {
          setIsMicMuted(status.isMuted);
        }
        if (status.error) {
          setMicError(status.error);
        } else {
          setMicError(null);
        }
      });

      return () => {
        unsubMic();
        physicalMicService.stop();
        unsubAuth();
        unsubFS();
        unsubAudit();
        unsubAudioLevel();
        unsubAudioActivity();
        unsubTranscript();
        unsubScripture();
        unsubSong();
      };
    }
  }, []);

  const handleToggleMic = () => {
    const next = physicalMicService.toggleMuted();
    setIsMicMuted(next);
  };

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
      await window.pulpitAPI.connectFreeShow(5510);
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

  const handleSelectAudioDevice = async (deviceId: string) => {
    setActiveDeviceId(deviceId);
    await physicalMicService.switchDevice(deviceId);
  };

  const handleSelectTranslation = async (id: string) => {
    if (window.pulpitAPI) {
      const active = await window.pulpitAPI.setActiveTranslation(id);
      setActiveTranslation(active);
    }
  };

  const handleManualLookup = async (referenceStr: string) => {
    if (window.pulpitAPI) {
      // Simulate input through recognition pipeline to parse and verify against database
      await window.pulpitAPI.simulateSpeechInput(referenceStr);
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
      const res = await window.pulpitAPI.approveCandidate(candidate.id);
      if (res.success) {
        setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
        // PR Phase 1: Pin approved scriptures to Sermon Scripture Pinboard
        if (candidate.type === 'scripture') {
          setPinnedScriptures((prev) => [
            {
              id: `pin_${Date.now()}_${candidate.id}`,
              reference: candidate.title,
              translation: activeTranslation,
              textSnippet: candidate.contentPreview,
              timestamp: Date.now()
            },
            ...prev.filter((p) => p.reference !== candidate.title)
          ]);
        }
      } else {
        alert(`Approval rejected: ${res.reason}`);
      }
      const events = await window.pulpitAPI.getAuditEvents();
      setAuditEvents(events);
    }
  };

  const handleDirectProjectScripture = async (reference: string, fullText?: string) => {
    await handleDispatchCommand('start_scripture', {
      reference,
      text: fullText,
      translation: activeTranslation
    });
    setPinnedScriptures((prev) => [
      {
        id: `pin_${Date.now()}`,
        reference,
        translation: activeTranslation,
        textSnippet: fullText || reference,
        timestamp: Date.now()
      },
      ...prev.filter((p) => p.reference !== reference)
    ]);
  };

  const handleQueueManualScripture = (reference: string, previewText: string, attribution: string) => {
    const manualCand: SuggestionCandidate = {
      id: `cand_manual_${Date.now()}`,
      type: 'scripture',
      title: reference,
      contentPreview: previewText,
      confidence: 1.0,
      evidence: `Manual Explorer Selection (${attribution})`,
      detectedAt: Date.now(),
      status: 'pending',
      actionPayload: {
        action: 'start_scripture',
        data: { reference, attribution },
        source: 'operator',
        correlationId: `manual_${Date.now()}`,
        createdAt: Date.now()
      }
    };
    setCandidates((prev) => [manualCand, ...prev]);
  };

  const handleDismissCandidate = (id: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  };

  // Global Operator Keyboard Shortcuts (Space, Arrows, C, Esc, R, Enter, B)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Do not intercept hotkeys if user is currently typing in an input
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleDispatchCommand('next_slide');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleDispatchCommand('previous_slide');
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleDispatchCommand('clear_slide');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleDispatchCommand('clear_all');
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleDispatchCommand('restore_output');
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setIsBibleExplorerOpen((prev) => !prev);
      } else if (e.key === 'Enter') {
        if (candidates.length > 0 && !authorityState.manualLockActive) {
          e.preventDefault();
          handleApproveCandidate(candidates[0]);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [candidates, authorityState.manualLockActive, activeTranslation]);

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gradient-to-br from-[#060913] via-[#090e1c] to-[#05070e] text-slate-100">
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        authorityState={authorityState}
        freeShowSnapshot={freeShowSnapshot}
        audioDevices={audioDevices}
        activeDeviceId={activeDeviceId}
        audioLevel={audioLevel}
        audioActivity={audioActivity}
        activeTranslation={activeTranslation}
        isMicMuted={isMicMuted}
        onToggleMic={handleToggleMic}
        onModeChange={handleModeChange}
        onConnectFreeShow={handleConnectFreeShow}
        onDisconnectFreeShow={handleDisconnectFreeShow}
        onSelectAudioDevice={handleSelectAudioDevice}
        onSelectTranslation={handleSelectTranslation}
        onOpenBibleExplorer={() => setIsBibleExplorerOpen(true)}
      />

      <ManualLockBanner
        isLocked={authorityState.manualLockActive}
        onToggleLock={handleToggleLock}
      />

      {/* Hardware Disconnection / No Audio Banner */}
      {micError && (
        <div className="bg-rose-950/90 border-b border-rose-600/70 px-4 py-1.5 flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center space-x-2">
            <span className="font-bold px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] uppercase shadow-sm">
              NO AUDIO
            </span>
            <span className="font-medium text-[11px]">{micError}</span>
          </div>
          <button
            onClick={() => physicalMicService.start()}
            className="text-[11px] font-semibold underline hover:text-white"
          >
            Reconnect Mic
          </button>
        </div>
      )}

      {/* Persistent SIMULATED Banner in Development / Mock Mode */}
      {freeShowSnapshot.status === 'simulated' && (
        <div className="bg-amber-950/80 border-b border-amber-600/60 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center space-x-2">
            <span className="font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] uppercase shadow-sm">
              SIMULATED
            </span>
            <span className="font-medium text-[11px]">
              Virtual FreeShow Mock Server is active (port 5510). Projection commands are simulated locally; no physical projector will display output.
            </span>
          </div>
          <span className="text-[10px] text-amber-400/80 font-mono hidden sm:inline uppercase tracking-widest">
            Dev Test Rig
          </span>
        </div>
      )}

      {currentView === 'songs' ? (
        <SongLibraryPanel
          freeShowConnected={freeShowSnapshot.connected}
          manualLockActive={authorityState.manualLockActive}
        />
      ) : (
        <main className="flex-1 p-3 sm:p-4 lg:p-4 xl:p-5 grid grid-cols-12 gap-3 sm:gap-4 lg:gap-4 xl:gap-5 min-h-0 min-w-0 overflow-y-auto lg:overflow-hidden">
          {/* Left Column (4 cols): Live Screen and Manual Operator Controls */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-3 sm:gap-4 lg:gap-4 xl:gap-5 min-h-0 min-w-0">
            <div className="flex-1 min-h-[200px] sm:min-h-0">
              <LiveOutputPanel snapshot={freeShowSnapshot} />
            </div>
            <div className="flex-shrink-0">
              <ManualControlsPanel
                onDispatch={handleDispatchCommand}
                onAddMockCandidate={handleAddMockCandidate}
                disabled={!freeShowSnapshot.connected}
                onOpenBibleExplorer={() => setIsBibleExplorerOpen(true)}
              />
            </div>
          </div>

          {/* Center Column (5 cols): Sermon Scripture Pinboard, Live Transcript & Suggested Content Queue */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-2.5 sm:gap-3 min-h-0 min-w-0">
            {/* Pastoral Memory: Sermon Scripture History Pinboard */}
            <div className="flex-shrink-0">
              <SermonScripturePinboard
                pinnedScriptures={pinnedScriptures}
                onReProject={(ref) => handleDirectProjectScripture(ref)}
                onClear={() => setPinnedScriptures([])}
                freeShowConnected={freeShowSnapshot.connected}
                isLocked={authorityState.manualLockActive}
                onOpenExplorer={() => setIsBibleExplorerOpen(true)}
              />
            </div>

            <div className="flex-1 min-h-[160px] lg:min-h-0">
              <LiveTranscriptPanel transcripts={transcripts} />
            </div>
            <div className="flex-1 min-h-[200px] lg:min-h-0">
              <SuggestionsQueue
                candidates={candidates}
                isLocked={authorityState.manualLockActive}
                onApprove={handleApproveCandidate}
                onDismiss={handleDismissCandidate}
                onManualLookup={handleManualLookup}
              />
            </div>
          </div>

          {/* Right Column (3 cols): Live Security & Authority Audit Trail */}
          <div className="col-span-12 lg:col-span-3 flex flex-col min-h-[180px] lg:min-h-0 min-w-0">
            <AuditTrailPanel events={auditEvents} />
          </div>
        </main>
      )}

      {/* Manual Bible Explorer & Direct Verse Launcher Modal */}
      <BibleExplorerModal
        isOpen={isBibleExplorerOpen}
        onClose={() => setIsBibleExplorerOpen(false)}
        activeTranslation={activeTranslation}
        onSelectTranslation={handleSelectTranslation}
        onDirectProject={handleDirectProjectScripture}
        onQueueSuggestion={handleQueueManualScripture}
        freeShowConnected={freeShowSnapshot.connected}
        isLocked={authorityState.manualLockActive}
      />
    </div>
  );
};

export default App;
