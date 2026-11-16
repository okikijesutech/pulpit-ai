import React, { useEffect } from 'react';
import {
  AuditEvent,
  AudioInputDevice,
  AuthorityState,
  FreeShowStateSnapshot,
  SuggestionCandidate
} from '@pulpit-ai/shared-types';
import { Header } from './components/Header.js';
import { ManualLockBanner } from './components/ManualLockBanner.js';
import { LiveOutputPanel } from './components/LiveOutputPanel.js';
import { SuggestionsQueue } from './components/SuggestionsQueue.js';
import { ManualControlsPanel } from './components/ManualControlsPanel.js';
import { AuditTrailPanel } from './components/AuditTrailPanel.js';
import { LiveTranscriptPanel } from './components/LiveTranscriptPanel.js';
import { SongLibraryPanel } from './components/SongLibraryPanel.js';
import { SermonScripturePinboard } from './components/SermonScripturePinboard.js';
import { AppModals } from './components/AppModals.js';
import { useGlobalHotkeys } from './hooks/useGlobalHotkeys.js';
import { useAnnouncementTimer } from './hooks/useAnnouncementTimer.js';
import { AudioLevelMetrics, AudioActivityMetrics, RecognizedTranscriptEvent } from '../preload/index.js';
import { physicalMicService } from './services/MicrophoneAudioService.js';
import { useUIStore } from './stores/uiStore.js';
import { useAuthorityStore } from './stores/authorityStore.js';
import { useAudioStore } from './stores/audioStore.js';
import { usePresentationStore } from './stores/presentationStore.js';
import { ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  // Subscribe to view & security state from Zustand stores
  const currentView = useUIStore((s) => s.currentView);
  const isAuditLogVisible = useUIStore((s) => s.isAuditLogVisible);
  const toggleAuditLog = useUIStore((s) => s.toggleAuditLog);

  const authorityState = useAuthorityStore((s) => s.authorityState);
  const freeShowSnapshot = useAuthorityStore((s) => s.freeShowSnapshot);
  const toggleManualLock = useAuthorityStore((s) => s.toggleManualLock);
  const dispatchCommand = useAuthorityStore((s) => s.dispatchCommand);

  const micError = useAudioStore((s) => s.micError);

  const candidates = usePresentationStore((s) => s.candidates);
  const pinnedScriptures = usePresentationStore((s) => s.pinnedScriptures);
  const transcripts = usePresentationStore((s) => s.transcripts);
  const auditEvents = usePresentationStore((s) => s.auditEvents);
  const activeTranslation = usePresentationStore((s) => s.activeTranslation);
  const activeAnnouncement = usePresentationStore((s) => s.activeAnnouncement);
  const serviceCues = usePresentationStore((s) => s.serviceCues);
  const activeCueIndex = usePresentationStore((s) => s.activeCueIndex);

  // Initialize Global Hotkeys and Announcement Timers
  useGlobalHotkeys(true);
  useAnnouncementTimer();

  // Initial Data Fetch & IPC Event Subscriptions
  useEffect(() => {
    if (window.pulpitAPI) {
      window.pulpitAPI.getAuthorityState().then((state: AuthorityState) => {
        useAuthorityStore.getState().setAuthorityState(state);
      }).catch(console.error);

      window.pulpitAPI.getFreeShowSnapshot().then((snap: FreeShowStateSnapshot) => {
        if (snap) useAuthorityStore.getState().setFreeShowSnapshot(snap);
      }).catch(console.error);

      window.pulpitAPI.getAuditEvents().then((events: AuditEvent[]) => {
        usePresentationStore.getState().setAuditEvents(events);
      }).catch(console.error);

      // Real physical audio devices enumeration
      physicalMicService
        .enumerateDevices()
        .then((devs) => {
          if (devs.length > 0) {
            useAudioStore.getState().setAudioDevices(devs);
            useAudioStore.getState().setActiveDeviceId(devs[0].id);
            window.pulpitAPI.updateAudioDevices(devs).catch(console.error);
          } else {
            window.pulpitAPI
              .getAudioDevices()
              .then((stored: AudioInputDevice[]) => {
                useAudioStore.getState().setAudioDevices(stored);
                if (stored.length > 0) useAudioStore.getState().setActiveDeviceId(stored[0].id);
              })
              .catch(console.error);
          }
        })
        .catch(console.error);

      // Reactive event listeners: route directly to Zustand stores
      const unsubAuth = window.pulpitAPI.onAuthorityStateChange((state: AuthorityState) => {
        useAuthorityStore.getState().setAuthorityState(state);
      });

      const unsubFS = window.pulpitAPI.onFreeShowStateChange((snap: FreeShowStateSnapshot) => {
        useAuthorityStore.getState().setFreeShowSnapshot(snap);
      });

      const unsubAudit = window.pulpitAPI.onAuditEvent((ev: AuditEvent) => {
        usePresentationStore.getState().addAuditEvent(ev);
      });

      // High-frequency audio updates only touch useAudioStore, zero re-renders in App
      const unsubAudioLevel = window.pulpitAPI.onAudioLevelChange((metrics: AudioLevelMetrics) => {
        useAudioStore.getState().setAudioLevel(metrics);
      });

      const unsubAudioActivity = window.pulpitAPI.onAudioActivityMode((activity: AudioActivityMetrics) => {
        useAudioStore.getState().setAudioActivity(activity);
      });

      const unsubTranscript = window.pulpitAPI.onTranscriptEvent((event: RecognizedTranscriptEvent) => {
        usePresentationStore.getState().addTranscript(event);
      });

      const unsubScripture = window.pulpitAPI.onScriptureCandidate((candidate: SuggestionCandidate) => {
        usePresentationStore.getState().addCandidate(candidate);
      });

      const unsubSong = window.pulpitAPI.onSongCandidate((candidate: SuggestionCandidate) => {
        usePresentationStore.getState().addCandidate(candidate);
      });

      // Start hardware audio capture
      physicalMicService.start().catch((err) => {
        console.warn('Physical mic start error:', err);
      });

      const unsubMic = physicalMicService.subscribeStatus((status) => {
        if (status.isMuted !== undefined) useAudioStore.getState().setIsMicMuted(status.isMuted);
        if (status.gainDb !== undefined) useAudioStore.getState().setMicGainDb(status.gainDb);
        if (status.error) useAudioStore.getState().setMicError(status.error);
        else useAudioStore.getState().setMicError(null);
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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gradient-to-br from-[#060913] via-[#090e1c] to-[#05070e] text-slate-100">
      {/* Sleek, Non-Sliding Cockpit Header (Fixed 56px, Zero Scroll) */}
      <Header />

      {/* Manual Safety Lock State Banner */}
      <ManualLockBanner
        isLocked={authorityState.manualLockActive}
        onToggleLock={toggleManualLock}
      />

      {/* Hardware Disconnection Banner */}
      {micError && (
        <div className="bg-rose-950/90 border-b border-rose-600/70 px-4 py-1.5 flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center space-x-2">
            <span className="font-bold px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] uppercase shadow-sm">
              NO AUDIO
            </span>
            <span className="font-medium text-[11px]">{micError}</span>
          </div>
          <button
            onClick={() => useAudioStore.getState().reconnectMic()}
            className="text-[11px] font-semibold underline hover:text-white"
          >
            Reconnect Mic
          </button>
        </div>
      )}

      {/* Development / Mock Simulation Banner */}
      {freeShowSnapshot.status === 'simulated' && (
        <div className="bg-amber-950/80 border-b border-amber-600/60 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center space-x-2">
            <span className="font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] uppercase shadow-sm">
              SIMULATED
            </span>
            <span className="font-medium text-[11px]">
              Virtual FreeShow Mock Server is active (port 5510). Projection commands are simulated locally.
            </span>
          </div>
          <span className="text-[10px] text-amber-400/80 font-mono hidden sm:inline uppercase tracking-widest">
            Dev Test Rig
          </span>
        </div>
      )}

      {/* View Router: Live Presentation Desk vs Song Library */}
      {currentView === 'songs' ? (
        <SongLibraryPanel
          freeShowConnected={freeShowSnapshot.connected}
          manualLockActive={authorityState.manualLockActive}
        />
      ) : (
        <main className="flex-1 p-3 sm:p-4 lg:p-4 xl:p-5 grid grid-cols-12 gap-3 sm:gap-4 lg:gap-4 xl:gap-5 min-h-0 min-w-0 overflow-y-auto lg:overflow-hidden">
          {/* Left Column (4 cols): Live Screen confidence monitor and Tactile Manual Controls */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-2.5 sm:gap-3 min-h-0 min-w-0 overflow-y-auto custom-scrollbar">
            <div className="flex-1 min-h-[160px] sm:min-h-0">
              <LiveOutputPanel
                snapshot={freeShowSnapshot}
                onOpenSlideMatrix={() => useUIStore.getState().openSlideMatrix()}
              />
            </div>
            <div className="flex-shrink-0">
              <ManualControlsPanel
                onDispatch={dispatchCommand}
                disabled={!freeShowSnapshot.connected}
                onOpenBibleExplorer={() => useUIStore.getState().openBibleExplorer()}
                onOpenAnnouncements={() => useUIStore.getState().openAnnouncementModal()}
                onOpenSlideMatrix={() => useUIStore.getState().openSlideMatrix()}
                onOpenStanzaMatrix={() => useUIStore.getState().openStanzaMatrix()}
                onOpenServiceOrder={() => useUIStore.getState().openServiceOrder()}
                currentCueTitle={serviceCues[activeCueIndex]?.title}
                currentCueNumber={activeCueIndex + 1}
                totalCues={serviceCues.length}
                onAdvanceCue={() => usePresentationStore.getState().advanceServiceCue()}
                activeAnnouncement={activeAnnouncement}
                onClearAnnouncement={() => usePresentationStore.getState().clearOverlay()}
              />
            </div>
          </div>

          {/* Center Column: Sermon Scripture Pinboard, Live Transcript & Suggested Content Queue */}
          <div
            className={`col-span-12 ${
              isAuditLogVisible ? 'lg:col-span-5' : 'lg:col-span-8'
            } flex flex-col gap-2.5 sm:gap-3 min-h-0 min-w-0 transition-all`}
          >
            <div className="flex-shrink-0">
              <SermonScripturePinboard
                pinnedScriptures={pinnedScriptures}
                onReProject={(ref) => usePresentationStore.getState().directProjectScripture(ref)}
                onClear={() => usePresentationStore.getState().clearPinnedScriptures()}
                onRemovePin={(id) => usePresentationStore.getState().removePinnedScripture(id)}
                freeShowConnected={freeShowSnapshot.connected}
                isLocked={authorityState.manualLockActive}
              />
            </div>

            <div className="flex-1 min-h-[160px] lg:min-h-0">
              <LiveTranscriptPanel transcripts={transcripts} />
            </div>

            <div className="flex-1 min-h-[200px] lg:min-h-0">
              <SuggestionsQueue
                candidates={candidates}
                isLocked={authorityState.manualLockActive}
                onApprove={(c) => usePresentationStore.getState().approveCandidate(c)}
                onDismiss={(id) => usePresentationStore.getState().dismissCandidate(id)}
                onManualLookup={(ref) => {
                  if (window.pulpitAPI) window.pulpitAPI.simulateSpeechInput(ref);
                }}
                onDirectProject={(ref, text) => usePresentationStore.getState().directProjectScripture(ref, text)}
                onQueueManualScripture={(ref, preview, attr) => {
                  usePresentationStore.getState().addCandidate({
                    id: `cand_manual_${Date.now()}`,
                    type: 'scripture',
                    title: ref,
                    contentPreview: preview,
                    confidence: 1.0,
                    evidence: `Manual Omnibar Entry (${attr})`,
                    detectedAt: Date.now(),
                    status: 'pending',
                    actionPayload: {
                      action: 'start_scripture',
                      data: { reference: ref, attribution: attr },
                      source: 'operator',
                      correlationId: `manual_${Date.now()}`,
                      createdAt: Date.now()
                    }
                  });
                }}
                activeTranslation={activeTranslation}
                freeShowConnected={freeShowSnapshot.connected}
              />
            </div>
          </div>

          {/* Right Column (3 cols): Central Authority Audit Log (Collapsible) */}
          {isAuditLogVisible && (
            <div className="col-span-12 lg:col-span-3 flex flex-col min-h-[180px] lg:min-h-0 min-w-0 animate-in fade-in slide-in-from-right-2 duration-150">
              <AuditTrailPanel events={auditEvents} onClose={toggleAuditLog} />
            </div>
          )}
        </main>
      )}

      {/* Floating Edge Tab to easily reopen Audit Log when collapsed */}
      {!isAuditLogVisible && currentView === 'live' && (
        <button
          onClick={toggleAuditLog}
          className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-slate-900/90 hover:bg-indigo-950/90 border-l border-y border-slate-800 hover:border-indigo-500/50 py-3 px-1.5 rounded-l-xl shadow-xl flex-col items-center gap-1.5 text-slate-400 hover:text-indigo-200 transition-all cursor-pointer group"
          title="Open Authority Security Audit Log (Hotkey: L)"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-mono font-bold uppercase [writing-mode:vertical-rl] tracking-widest text-slate-400 group-hover:text-white">
            Audit Log
          </span>
          <span className="text-[9px] font-mono font-bold px-1 rounded bg-black/50 text-indigo-300">
            {auditEvents.length}
          </span>
        </button>
      )}

      {/* Encapsulated Application Overlays & Modals */}
      <AppModals />
    </div>
  );
};

export default App;
