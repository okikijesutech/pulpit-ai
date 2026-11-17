import React, { useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  Music,
  Volume2,
  ShieldCheck,
  X,
  Sliders
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore.js';
import { useAuthorityStore } from '../stores/authorityStore.js';
import { useAudioStore } from '../stores/audioStore.js';
import { usePresentationStore } from '../stores/presentationStore.js';

export const Header: React.FC = () => {
  // UI Store
  const currentView = useUIStore((s) => s.currentView);
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const isAudioPopoverOpen = useUIStore((s) => s.isAudioPopoverOpen);
  const toggleAudioPopover = useUIStore((s) => s.toggleAudioPopover);
  const setAudioPopoverOpen = useUIStore((s) => s.setAudioPopoverOpen);
  const isAuditLogVisible = useUIStore((s) => s.isAuditLogVisible);
  const toggleAuditLog = useUIStore((s) => s.toggleAuditLog);

  // Authority Store
  const authorityState = useAuthorityStore((s) => s.authorityState);
  const freeShowSnapshot = useAuthorityStore((s) => s.freeShowSnapshot);
  const setOperatorMode = useAuthorityStore((s) => s.setOperatorMode);
  const connectFreeShow = useAuthorityStore((s) => s.connectFreeShow);
  const disconnectFreeShow = useAuthorityStore((s) => s.disconnectFreeShow);

  // Audio Store (VU meter and audio controls subscribe here)
  const audioDevices = useAudioStore((s) => s.audioDevices);
  const activeDeviceId = useAudioStore((s) => s.activeDeviceId);
  const micGainDb = useAudioStore((s) => s.micGainDb);
  const isMicMuted = useAudioStore((s) => s.isMicMuted);
  const audioLevel = useAudioStore((s) => s.audioLevel);
  const audioActivity = useAudioStore((s) => s.audioActivity);
  const selectAudioDevice = useAudioStore((s) => s.selectAudioDevice);
  const updateGainDb = useAudioStore((s) => s.updateGainDb);
  const toggleMicMute = useAudioStore((s) => s.toggleMicMute);

  // Presentation Store
  const auditEventsCount = usePresentationStore((s) => s.auditEvents.length);

  const popoverRef = useRef<HTMLDivElement>(null);

  // Close audio popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setAudioPopoverOpen(false);
      }
    }
    if (isAudioPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isAudioPopoverOpen, setAudioPopoverOpen]);

  // Compute active segments (out of 10) for LED VU meter
  const isOff = audioLevel.state === 'disconnected';
  const isMuted = isMicMuted || audioLevel.state === 'muted';
  const isSilent =
    !isOff &&
    !isMuted &&
    (audioLevel.state === 'silent' || audioLevel.isSilent || audioLevel.decibels <= -60);

  let activeSegments = 0;
  if (!isOff && !isMuted && !isSilent) {
    if (audioLevel.isClipping || audioLevel.decibels >= -2) {
      activeSegments = 10;
    } else if (audioLevel.decibels >= -6) {
      activeSegments = 9;
    } else if (audioLevel.decibels >= -12) {
      activeSegments = 8;
    } else if (audioLevel.decibels >= -18) {
      activeSegments = 7;
    } else if (audioLevel.decibels >= -24) {
      activeSegments = 6;
    } else if (audioLevel.decibels >= -30) {
      activeSegments = 5;
    } else if (audioLevel.decibels >= -36) {
      activeSegments = 4;
    } else if (audioLevel.decibels >= -42) {
      activeSegments = 3;
    } else if (audioLevel.decibels >= -48) {
      activeSegments = 2;
    } else {
      activeSegments = 1;
    }
  }

  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950/95 px-3 sm:px-4 md:px-5 flex items-center justify-between backdrop-blur-md w-full overflow-hidden shadow-md z-30 select-none">
      {/* Left: Brand Logo & Navigation Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-shrink-0">
        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20 border border-indigo-400/30">
            <svg
              className="w-3.5 h-3.5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M6 8h12" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm sm:text-base tracking-tight text-white flex items-center gap-1 leading-none">
              Pulpit{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400 font-extrabold">
                AI
              </span>
            </span>
            <span className="text-[8px] font-mono tracking-wider text-slate-400 uppercase mt-0.5 hidden xl:inline">
              Church Presentation Assistant
            </span>
          </div>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800/50 font-mono hidden lg:inline">
            v0.8.0
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800/80 hidden sm:block" />

        {/* View Switcher: Live Desk vs Song Library */}
        <div className="flex bg-slate-900/90 p-0.5 rounded-lg border border-slate-800/90 text-xs font-semibold flex-shrink-0 shadow-inner">
          <button
            onClick={() => setCurrentView('live')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md transition-all ${
              currentView === 'live'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Desk</span>
          </button>
          <button
            onClick={() => setCurrentView('songs')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md transition-all ${
              currentView === 'songs'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Music className="w-3 h-3" />
            <span>Songs</span>
          </button>
        </div>

        {/* Operator Mode Toggle */}
        <div className="hidden sm:flex items-center space-x-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800/90 text-xs font-semibold flex-shrink-0 shadow-inner">
          <span className="text-[9px] text-slate-400 uppercase tracking-wider px-1.5 hidden md:inline font-mono">
            Mode:
          </span>
          <button
            onClick={() => setOperatorMode('suggestions')}
            className={`px-2 py-1 rounded-md transition-all text-xs ${
              authorityState.operatorMode === 'suggestions'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Suggestions
          </button>
          <button
            onClick={() => setOperatorMode('manual')}
            className={`px-2 py-1 rounded-md transition-all text-xs ${
              authorityState.operatorMode === 'manual'
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-sm shadow-amber-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Manual
          </button>
        </div>
      </div>

      {/* Center: FreeShow Sanctuary Output Cockpit Status */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        <div
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
            freeShowSnapshot.connected
              ? freeShowSnapshot.status === 'simulated'
                ? 'bg-amber-950/80 text-amber-300 border-amber-600/60 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              : 'bg-rose-950/80 text-rose-300 border-rose-800/60'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              freeShowSnapshot.connected
                ? freeShowSnapshot.status === 'simulated'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-emerald-400 animate-pulse'
                : 'bg-rose-500'
            }`}
          />
          <span className="font-mono text-[11px]">
            {freeShowSnapshot.connected
              ? freeShowSnapshot.status === 'simulated'
                ? 'FreeShow: Simulated (Dev 5510)'
                : 'FreeShow: Live (5510)'
              : 'FreeShow: Offline'}
          </span>
          {!freeShowSnapshot.connected && (
            <button
              onClick={() => connectFreeShow()}
              className="ml-1 text-[10px] font-bold text-rose-300 hover:text-white underline hover:no-underline"
            >
              Connect
            </button>
          )}
          {freeShowSnapshot.connected && (
            <button
              onClick={() => disconnectFreeShow()}
              title="Disconnect FreeShow"
              className="ml-1 text-[10px] text-slate-400 hover:text-rose-300 transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Right: Dedicated Tactile Mic Switch, Audio Meter & Audit Trail Toggle */}
      <div className="flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0 relative">
        {/* Dedicated Tactile Hardware Mic ON / OFF Switch */}
        <button
          type="button"
          onClick={toggleMicMute}
          title={isMicMuted ? "PC Microphone is MUTED. Click to turn ON (Live speech capture)" : "PC Microphone is LIVE. Click to MUTE microphone"}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm active:scale-95 ${
            isMicMuted
              ? 'bg-rose-950/90 text-rose-300 border-rose-700/80 hover:bg-rose-900 shadow-sm'
              : 'bg-emerald-950/90 text-emerald-300 border-emerald-600/80 hover:bg-emerald-900 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
          }`}
        >
          {isMicMuted ? (
            <>
              <MicOff className="w-3.5 h-3.5 text-rose-400" />
              <span>Mic OFF</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Mic ON</span>
            </>
          )}
        </button>

        {/* Audio VU Meter & Settings Popover Launcher */}
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={toggleAudioPopover}
            title="Audio Settings: Click to switch microphone hardware or boost preamp gain"
            className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-inner ${
              isAudioPopoverOpen
                ? 'bg-slate-800 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-slate-900/90 text-slate-300 border-slate-800/90 hover:text-white hover:bg-slate-850 hover:border-slate-700'
            }`}
          >
            {/* Segmented VU Meter Bar */}
            <div className="flex items-center gap-[2px] h-3 px-1 py-[2px] bg-slate-950 rounded border border-slate-800">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seg) => {
                const isActive = seg <= activeSegments;
                let colorClass = 'bg-slate-800';
                if (isActive) {
                  if (seg <= 6) {
                    colorClass = 'bg-emerald-500 shadow-[0_0_3px_rgba(16,185,129,0.8)]';
                  } else if (seg <= 8) {
                    colorClass = 'bg-amber-400 shadow-[0_0_3px_rgba(251,191,36,0.8)]';
                  } else {
                    colorClass = 'bg-rose-500 shadow-[0_0_3px_rgba(244,63,94,0.9)]';
                  }
                }
                return (
                  <div
                    key={seg}
                    className={`w-[3px] h-full rounded-[1px] transition-colors duration-75 ${colorClass}`}
                  />
                );
              })}
            </div>

            {/* Decibel Display */}
            <span className="text-[10px] font-mono font-semibold w-7 text-right">
              {isOff ? (
                <span className="text-rose-400 font-bold">OFF</span>
              ) : isMuted ? (
                <span className="text-amber-400 font-bold">MUT</span>
              ) : isSilent ? (
                <span className="text-slate-500">SIL</span>
              ) : (
                <span
                  className={
                    audioLevel.decibels >= -6
                      ? 'text-rose-400 font-bold'
                      : audioLevel.decibels >= -18
                        ? 'text-amber-300 font-bold'
                        : 'text-emerald-400'
                  }
                >
                  {audioLevel.decibels}
                </span>
              )}
            </span>

            {/* Preamp Booster Badge */}
            {micGainDb > 0 && (
              <span className="hidden md:inline px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60 text-[9px] font-mono font-bold">
                +{micGainDb}dB
              </span>
            )}

            {/* Singing / Speech Mode indicator */}
            {audioActivity && (
              <span
                className={`hidden lg:inline-flex items-center space-x-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${
                  audioActivity.isSinging
                    ? 'bg-purple-950/80 text-purple-300 border-purple-500/60'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                }`}
              >
                {audioActivity.isSinging ? 'Singing' : 'Speech'}
              </span>
            )}

            <Sliders className="w-3 h-3 text-slate-400 hover:text-white transition-colors" />
          </button>

          {/* Floating Audio Popover Menu */}
          {isAudioPopoverOpen && (
            <div className="absolute right-0 top-12 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                <div className="flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Audio Settings</span>
                </div>
                <button
                  onClick={() => setAudioPopoverOpen(false)}
                  className="text-slate-400 hover:text-white p-0.5 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Hardware Device Selection */}
              <div className="mb-3">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Microphone Source
                </label>
                <select
                  value={activeDeviceId}
                  onChange={(e) => selectAudioDevice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none hover:border-slate-700 focus:border-indigo-500"
                >
                  {audioDevices.map((d) => (
                    <option key={d.id} value={d.id} className="bg-slate-900 text-slate-100">
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Software Preamp Gain Booster */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                    <Volume2 className="w-3 h-3 text-indigo-400" />
                    <span>Software Preamp Booster</span>
                  </label>
                  <span className="text-[10px] font-mono text-indigo-300 font-bold">+{micGainDb} dB</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[0, 6, 12, 18, 24].map((db) => (
                    <button
                      key={db}
                      type="button"
                      onClick={() => updateGainDb(db)}
                      className={`py-1 text-[10px] font-mono font-bold rounded border transition-all ${
                        micGainDb === db
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      +{db}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-slate-500 mt-1 leading-tight">
                  Boosts quiet laptop microphones so Whisper recognition hears clearly.
                </p>
              </div>

              {/* Mute Switch */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300 font-medium">Mute Ingestion</span>
                <button
                  type="button"
                  onClick={toggleMicMute}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold border transition-all ${
                    isMicMuted
                      ? 'bg-rose-950 text-rose-300 border-rose-800 hover:bg-rose-900'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                  }`}
                >
                  {isMicMuted ? 'Muted' : 'Live / Active'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Authority Audit Log Drawer Toggle */}
        <button
          onClick={toggleAuditLog}
          title="Toggle Authority Security Audit Log (Hotkey: L)"
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all shadow-inner ${
            isAuditLogVisible
              ? 'bg-indigo-950/80 text-indigo-200 border-indigo-500/80 shadow-[0_0_10px_rgba(99,102,241,0.25)]'
              : 'bg-slate-900/90 text-slate-400 border-slate-800/90 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Audit</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-[9px] font-mono text-slate-300 border border-slate-800">
            {auditEventsCount}
          </span>
        </button>
      </div>
    </header>
  );
};
