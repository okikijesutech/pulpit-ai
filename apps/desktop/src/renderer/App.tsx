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
import { useCountdownTimer } from './hooks/useCountdownTimer.js';
import { AudioLevelMetrics, AudioActivityMetrics, RecognizedTranscriptEvent } from '../preload/index.js';
import { physicalMicService } from './services/MicrophoneAudioService.js';
import { useUIStore } from './stores/uiStore.js';
import { useAuthorityStore } from './stores/authorityStore.js';
import { useAudioStore } from './stores/audioStore.js';
import { usePresentationStore } from './stores/presentationStore.js';
import { ShieldCheck, AlertTriangle, X } from 'lucide-react';

export const App: React.FC = () => {
  // Subscribe to view & security state from Zustand stores
  const currentView = useUIStore((s) => s.currentView);
  const isAuditLogVisible = useUIStore((s) => s.isAuditLogVisible);
  const toggleAuditLog = useUIStore((s) => s.toggleAuditLog);
  const toastMessage = useUIStore((s) => s.toastMessage);
  const toastType = useUIStore((s) => s.toastType);
  const clearToast = useUIStore((s) => s.clearToast);

  const authorityState = useAuthorityStore((s) => s.authorityState);
  const freeShowSnapshot = useAuthorityStore((s) => s.freeShowSnapshot);
  const toggleManualLock = useAuthorityStore((s) => s.toggleManualLock);
  const dispatchCommand = useAuthorityStore((s) => s.dispatchCommand);

  const micError = useAudioStore((s) => s.micError);

  const candidates = usePresentationStore((s) => s.candidates);
  const pinnedScriptures = usePresentationStore((s) => s.pinnedScriptures);
  const auditEvents = usePresentationStore((s) => s.auditEvents);
  const activeAnnouncement = usePresentationStore((s) => s.activeAnnouncement);
  const serviceCues = usePresentationStore((s) => s.serviceCues);
  const activeCueIndex = usePresentationStore((s) => s.activeCueIndex);

  // Auto-dismiss non-blocking operator toasts after 5 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      clearToast();
    }, 5000);
    return () => clearTimeout(timer);
  }, [toastMessage, clearToast]);

  // Initialize Global Hotkeys, Announcement Timers & Countdown Timer
  useGlobalHotkeys(true);
  useAnnouncementTimer();
  useCountdownTimer();

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

      if (typeof window.pulpitAPI.getSpeechEngineStatus === 'function') {
        window.pulpitAPI.getSpeechEngineStatus().then((plan) => {
          useAudioStore.getState().setSpeechEngineStatus(plan);
        }).catch(console.error);
      }

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

      const unsubSpeechEngine =
        typeof window.pulpitAPI.onSpeechEngineStatusChange === 'function'
          ? window.pulpitAPI.onSpeechEngineStatusChange((plan) => {
              useAudioStore.getState().setSpeechEngineStatus(plan);
            })
          : () => {};

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
        unsubSpeechEngine();
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
        <main className="flex-1 min-h-0 min-w-0 p-3 sm:p-3.5 xl:p-4 grid grid-cols-12 auto-rows-max xl:auto-rows-fr gap-2.5 sm:gap-3 xl:gap-3.5 overflow-y-auto xl:overflow-hidden">
          {/* Column 1 (41.7% at xl:): Live Presentation Output and Live Speech Transcript */}
          <section
            aria-label="Stage Telemetry and Acoustic Stream"
            className="col-span-12 lg:col-span-6 xl:col-span-5 flex flex-col gap-2.5 xl:min-h-0 min-w-0"
          >
            <div className="xl:flex-[1.35] min-h-[280px] xl:min-h-0">
              <LiveOutputPanel
                snapshot={freeShowSnapshot}
                onOpenSlideMatrix={() => useUIStore.getState().openSlideMatrix()}
              />
            </div>

            <div className="xl:flex-1 min-h-[220px] xl:min-h-0">
              <LiveTranscriptPanel />
            </div>
          </section>

          {/* Column 2 (33.3% at xl:): Suggested Content Queue and Pastoral Memory Pinboard */}
          <section
            aria-label="AI Candidate Pipeline and Pastoral Memory"
            className="col-span-12 lg:col-span-6 xl:col-span-4 flex flex-col gap-2.5 xl:min-h-0 min-w-0"
          >
            <div className="h-[400px] xl:h-auto xl:flex-1 min-h-[300px] xl:min-h-0 min-w-0 flex flex-col">
              <SuggestionsQueue
                candidates={candidates}
                isLocked={authorityState.manualLockActive}
                onApprove={(c) => usePresentationStore.getState().approveCandidate(c)}
                onDismiss={(id) => usePresentationStore.getState().dismissCandidate(id)}
                onManualLookup={(ref) => {
                  if (window.pulpitAPI) window.pulpitAPI.simulateSpeechInput(ref);
                }}
              />
            </div>

            <div className="flex-shrink-0 min-w-0">
              <SermonScripturePinboard
                pinnedScriptures={pinnedScriptures}
                onReProject={(ref, text) => usePresentationStore.getState().directProjectScripture(ref, text)}
                onClear={() => usePresentationStore.getState().clearPinnedScriptures()}
                onRemovePin={(id) => usePresentationStore.getState().removePinnedScripture(id)}
                onLoadPresets={(rawText) => usePresentationStore.getState().loadPresetScriptures(rawText)}
                freeShowConnected={freeShowSnapshot.connected}
                isLocked={authorityState.manualLockActive}
              />
            </div>
          </section>

          {/* Column 3 (25.0% at xl:): Manual Controls Tactical Desk */}
          <section
            aria-label="Manual Tactical Switcher Desk"
            className="col-span-12 lg:col-span-12 xl:col-span-3 flex flex-col xl:min-h-0 min-w-0 xl:overflow-y-auto custom-scrollbar"
          >
            <ManualControlsPanel
              onDispatch={dispatchCommand}
              disabled={!freeShowSnapshot.connected}
              onOpenBibleExplorer={() => useUIStore.getState().openBibleExplorer()}
              onOpenAnnouncements={() => useUIStore.getState().openAnnouncementModal()}
              onOpenSlideMatrix={() => useUIStore.getState().openSlideMatrix()}
              onOpenStanzaMatrix={() => useUIStore.getState().openStanzaMatrix()}
              onOpenServiceOrder={() => useUIStore.getState().openServiceOrder()}
              onOpenMediaLibrary={() => useUIStore.getState().openMediaModal()}
              onOpenCountdownTimer={() => useUIStore.getState().openTimerModal()}
              onProjectChurchLogo={() => usePresentationStore.getState().projectChurchLogo()}
              currentCueTitle={serviceCues[activeCueIndex]?.title}
              currentCueNumber={activeCueIndex + 1}
              totalCues={serviceCues.length}
              onAdvanceCue={() => usePresentationStore.getState().advanceServiceCue()}
              activeAnnouncement={activeAnnouncement}
              onClearAnnouncement={() => usePresentationStore.getState().clearOverlay()}
            />
          </section>
        </main>
      )}

      {/* Slide-Over Authority Security Audit Drawer (never compresses the 2-column live desk) */}
      {isAuditLogVisible && (
        <aside className="fixed right-0 top-14 bottom-0 w-80 sm:w-96 z-40 p-3 bg-[#070a12]/95 border-l border-slate-800 shadow-2xl animate-in fade-in slide-in-from-right-2 duration-150 flex flex-col">
          <AuditTrailPanel events={auditEvents} onClose={toggleAuditLog} />
        </aside>
      )}

      {/* Non-Blocking Operator Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-50 max-w-md px-3.5 py-2.5 rounded-xl border shadow-2xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150 ${
            toastType === 'error'
              ? 'bg-rose-950 border-rose-600/80 text-rose-100'
              : toastType === 'success'
                ? 'bg-emerald-950 border-emerald-600/80 text-emerald-100'
                : 'bg-amber-950 border-amber-600/80 text-amber-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span className="leading-snug">{toastMessage}</span>
          <button
            type="button"
            onClick={clearToast}
            aria-label="Dismiss notification"
            className="ml-1 p-0.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
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
