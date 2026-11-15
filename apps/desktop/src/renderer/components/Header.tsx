import React from "react";
import {
  AudioInputDevice,
  AuthorityState,
  FreeShowStateSnapshot,
  OperatorMode,
} from "@pulpit-ai/shared-types";
import {
  Mic,
  MicOff,
  Radio,
  BookOpen,
  Music,
  Volume2,
  ShieldCheck,
  Megaphone,
  LayoutGrid,
} from "lucide-react";
import {
  AudioLevelMetrics,
  AudioActivityMetrics,
} from "../../preload/index.js";
import { ActiveAnnouncement } from "./QuickAnnouncementModal.js";

interface HeaderProps {
  currentView?: "live" | "songs";
  onViewChange?: (view: "live" | "songs") => void;
  authorityState: AuthorityState;
  freeShowSnapshot: FreeShowStateSnapshot;
  audioDevices: AudioInputDevice[];
  activeDeviceId: string;
  audioLevel: AudioLevelMetrics;
  audioActivity?: AudioActivityMetrics;
  activeTranslation?: string;
  isMicMuted?: boolean;
  gainDb?: number;
  onSetGainDb?: (db: number) => void;
  isAuditLogVisible?: boolean;
  auditEventsCount?: number;
  onToggleAuditLog?: () => void;
  onToggleMic?: () => void;
  onModeChange: (mode: OperatorMode) => void;
  onConnectFreeShow: () => void;
  onDisconnectFreeShow: () => void;
  onSelectAudioDevice: (id: string) => void;
  onSelectTranslation?: (id: string) => void;
  onOpenBibleExplorer?: () => void;
  onOpenAnnouncements?: () => void;
  onOpenSlideMatrix?: () => void;
  onOpenStanzaMatrix?: () => void;
  activeAnnouncement?: ActiveAnnouncement | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentView = "live",
  onViewChange,
  authorityState,
  freeShowSnapshot,
  audioDevices,
  activeDeviceId,
  audioLevel,
  audioActivity,
  activeTranslation = "WEB",
  isMicMuted = false,
  gainDb = 0,
  onSetGainDb,
  isAuditLogVisible = false,
  auditEventsCount = 0,
  onToggleAuditLog,
  onToggleMic,
  onModeChange,
  onConnectFreeShow,
  onDisconnectFreeShow,
  onSelectAudioDevice,
  onSelectTranslation,
  onOpenBibleExplorer,
  onOpenAnnouncements,
  onOpenSlideMatrix,
  onOpenStanzaMatrix,
  activeAnnouncement,
}) => {
  // Compute active segments (out of 10) for LED VU meter
  const isOff = audioLevel.state === "disconnected";
  const isMuted = isMicMuted || audioLevel.state === "muted";
  const isSilent =
    !isOff &&
    !isMuted &&
    (audioLevel.state === "silent" ||
      audioLevel.isSilent ||
      audioLevel.decibels <= -60);

  // Convert RMS (0 to 1) or decibels (-100 to 0) into 0-10 level
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
    <header className='h-16 border-b border-slate-800/80 bg-slate-950/90 px-3 sm:px-4 md:px-5 flex items-center justify-between backdrop-blur-md w-full overflow-x-auto overflow-y-hidden gap-2.5 shadow-md z-20'>
      {/* Left Brand & View Navigation */}
      <div className='flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-shrink-0'>
        <div className='flex items-center space-x-2.5 flex-shrink-0'>
          <div className='w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30'>
            <svg
              className='w-4 h-4 text-white'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M12 2v20M6 8h12' />
            </svg>
          </div>
          <div className='flex flex-col'>
            <span className='font-bold text-base tracking-tight text-white flex items-center gap-1.5 leading-none'>
              Pulpit{" "}
              <span className='text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400 font-extrabold'>
                AI
              </span>
            </span>
            <span className='text-[9px] font-mono tracking-wider text-slate-400 uppercase mt-0.5 hidden sm:inline'>
              Church Presentation Assistant
            </span>
          </div>
          <span className='text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-950/70 text-indigo-300 border border-indigo-800/50 font-mono hidden 2xl:inline'>
            v0.6.0-beta
          </span>
        </div>

        <div className='h-5 w-px bg-slate-800/80 hidden sm:block' />

        {/* View Switcher: Live Presentation vs Song Library */}
        <div className='flex bg-slate-900/90 p-1 rounded-lg border border-slate-800/90 text-xs font-semibold flex-shrink-0 shadow-inner'>
          <button
            onClick={() => onViewChange?.("live")}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md transition-all ${
              currentView === "live"
                ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm shadow-indigo-900/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Radio className='w-3.5 h-3.5' />
            <span>Live</span>
          </button>
          <button
            onClick={() => onViewChange?.("songs")}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md transition-all ${
              currentView === "songs"
                ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm shadow-indigo-900/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Music className='w-3.5 h-3.5' />
            <span>Songs</span>
          </button>
        </div>

        <div className='h-5 w-px bg-slate-800/80 hidden md:block' />

        {/* Operating Mode Selector - High tactile visibility */}
        <div className='flex items-center space-x-1.5 flex-shrink-0'>
          <span className='text-[10px] text-slate-400 font-semibold uppercase tracking-wider hidden xl:inline'>
            Mode:
          </span>
          <div className='flex bg-slate-900/90 p-1 rounded-lg border border-slate-800/90 text-xs font-semibold shadow-inner'>
            <button
              onClick={() => onModeChange("suggestions")}
              className={`px-3 py-1 rounded-md transition-all ${
                authorityState.operatorMode === "suggestions"
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm shadow-indigo-900/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              Suggestions
            </button>
            <button
              onClick={() => onModeChange("manual")}
              className={`px-3 py-1 rounded-md transition-all ${
                authorityState.operatorMode === "manual"
                  ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-sm shadow-amber-900/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              Manual
            </button>
          </div>
        </div>
      </div>

      {/* Right Hardware, Audio, Bible & FreeShow Integration */}
      <div className='flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0'>
        {/* Hardware Mic & Segmented VU Meter */}
        <div className='hidden sm:flex items-center space-x-2 bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800/90 shadow-inner'>
          {/* Mic Toggle Button */}
          <button
            type='button'
            onClick={onToggleMic}
            title={
              isMicMuted
                ? "Microphone is OFF. Click to turn ON"
                : "Microphone is ON. Click to turn OFF"
            }
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
              isMicMuted
                ? "bg-rose-950/80 text-rose-300 border-rose-800/80 hover:bg-rose-900"
                : "bg-emerald-950/80 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
            }`}
          >
            {isMicMuted ? (
              <>
                <MicOff className='w-3.5 h-3.5 text-rose-400' />
                <span>Mic OFF</span>
              </>
            ) : (
              <>
                <Mic className='w-3.5 h-3.5 text-emerald-400 animate-pulse' />
                <span>Mic ON</span>
              </>
            )}
          </button>

          {/* Device Selection Dropdown */}
          <select
            value={activeDeviceId}
            onChange={(e) => onSelectAudioDevice(e.target.value)}
            className='bg-transparent text-xs text-slate-200 font-medium border-none outline-none cursor-pointer max-w-[85px] sm:max-w-[110px] md:max-w-[140px] truncate hover:text-white transition-colors'
          >
            {audioDevices.map((d) => (
              <option
                key={d.id}
                value={d.id}
                className='bg-slate-900 text-slate-100'
              >
                {d.name}
              </option>
            ))}
          </select>

          {/* Software Preamp Gain Booster (+0 to +24 dB) */}
          <div
            className={`flex items-center space-x-1 px-1.5 py-0.5 rounded border text-[11px] font-mono font-bold transition-all ${
              gainDb > 0
                ? "bg-indigo-950/80 border-indigo-700/80 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.25)]"
                : "bg-slate-950/60 border-slate-800 text-slate-400"
            }`}
            title='Software Preamp Booster: Boosts quiet laptop microphones (+0 dB to +24 dB) so Whisper speech recognition hears clearly with zero distortion.'
          >
            <Volume2
              className={`w-3 h-3 ${gainDb > 0 ? "text-indigo-400 animate-pulse" : "text-slate-500"}`}
            />
            <select
              value={gainDb}
              onChange={(e) => onSetGainDb?.(Number(e.target.value))}
              className='bg-transparent text-[11px] font-bold text-slate-200 border-none outline-none cursor-pointer hover:text-white transition-colors'
            >
              <option value={0} className='bg-slate-900 text-slate-200'>
                +0 dB
              </option>
              <option value={6} className='bg-slate-900 text-slate-200'>
                +6 dB
              </option>
              <option
                value={12}
                className='bg-slate-900 text-indigo-300 font-bold'
              >
                +12 dB (Laptop)
              </option>
              <option
                value={18}
                className='bg-slate-900 text-indigo-300 font-bold'
              >
                +18 dB
              </option>
              <option
                value={24}
                className='bg-slate-900 text-amber-300 font-bold'
              >
                +24 dB (Max)
              </option>
            </select>
          </div>

          {/* Precision Segmented LED VU Meter */}
          <div
            className='flex items-center space-x-1.5 pl-2 border-l border-slate-800'
            title={`Audio Level: ${audioLevel.decibels} dB (State: ${audioLevel.state ?? (isMicMuted ? "muted" : "active")})`}
          >
            <div className='flex items-center gap-[2px] h-3 px-1 py-[2px] bg-slate-950 rounded border border-slate-800'>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((seg) => {
                const isActive = seg <= activeSegments;
                let colorClass = "bg-slate-800";
                if (isActive) {
                  if (seg <= 6) {
                    colorClass =
                      "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]";
                  } else if (seg <= 8) {
                    colorClass =
                      "bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)]";
                  } else {
                    colorClass =
                      "bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.9)]";
                  }
                }
                return (
                  <div
                    key={seg}
                    className={`w-[3px] sm:w-[4px] h-full rounded-[1px] transition-colors duration-75 ${colorClass}`}
                  />
                );
              })}
            </div>

            <span className='text-[10px] font-mono font-semibold w-7 sm:w-8 text-right'>
              {isOff ? (
                <span className='text-rose-400 font-bold'>OFF</span>
              ) : isMuted ? (
                <span className='text-amber-400 font-bold'>MUT</span>
              ) : isSilent ? (
                <span className='text-slate-500'>SIL</span>
              ) : (
                <span
                  className={
                    audioLevel.decibels >= -6
                      ? "text-rose-400 font-bold"
                      : audioLevel.decibels >= -18
                        ? "text-amber-300 font-bold"
                        : "text-emerald-400"
                  }
                >
                  {audioLevel.decibels}
                </span>
              )}
            </span>
          </div>

          {/* Live Acoustic Mode Badge (Preaching Speech vs Choir Singing) */}
          {audioActivity && (
            <div
              className={`hidden md:flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border ${
                audioActivity.isSinging
                  ? "bg-purple-950/80 text-purple-300 border-purple-500/60 shadow-[0_0_10px_rgba(168,85,247,0.3)] animate-pulse"
                  : audioActivity.isSpeech
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                    : "bg-slate-900 text-slate-500 border-slate-800"
              }`}
            >
              {audioActivity.isSinging ? (
                <>
                  <Music className='w-2.5 h-2.5 text-purple-400' />
                  <span className='hidden xl:inline'>Singing</span>
                </>
              ) : (
                <>
                  <Mic className='w-2.5 h-2.5 text-emerald-400' />
                  <span className='hidden xl:inline'>Speech</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Active Bible Translation Selector & Manual Explorer */}
        <div className='flex items-center space-x-1.5 bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800/90 shadow-inner'>
          <BookOpen className='w-3.5 h-3.5 text-indigo-400 flex-shrink-0' />
          <span className='text-[10px] text-slate-400 uppercase font-bold hidden md:inline'>
            Bible:
          </span>
          <select
            value={activeTranslation}
            onChange={(e) => onSelectTranslation?.(e.target.value)}
            className='bg-transparent text-xs font-bold text-slate-200 border-none outline-none cursor-pointer hover:text-white transition-colors'
          >
            <option value='WEB' className='bg-slate-900 text-slate-100'>
              WEB
            </option>
            <option value='KJV' className='bg-slate-900 text-slate-100'>
              KJV
            </option>
          </select>

          {onOpenBibleExplorer && (
            <button
              onClick={onOpenBibleExplorer}
              title='Open Manual Scripture Explorer (Hotkey: B)'
              className='ml-1 px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600 text-[10px] font-bold text-indigo-200 hover:text-white transition-all shadow-sm border border-indigo-500/40 active:scale-95 flex items-center space-x-1'
            >
              <span>Explorer</span>
              <kbd className='hidden lg:inline px-1 py-0.2 rounded bg-black/40 text-[8px] font-mono text-indigo-300'>
                B
              </kbd>
            </button>
          )}
        </div>

        {/* Quick Sanctuary Announcements & Lower-Third Alerts Trigger */}
        {onOpenAnnouncements && (
          <button
            onClick={onOpenAnnouncements}
            title='Open Quick Announcements & Lower-Third Ticker (Hotkey: A)'
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-inner flex-shrink-0 ${
              activeAnnouncement
                ? "bg-amber-950/90 text-amber-200 border-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                : "bg-slate-900/90 text-slate-400 border-slate-800/90 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Megaphone
              className={`w-3.5 h-3.5 ${activeAnnouncement ? "text-amber-400 animate-pulse" : "text-amber-400"}`}
            />
            <span className='hidden sm:inline'>Alerts</span>
            <kbd className='hidden lg:inline px-1 py-0.2 rounded bg-black/40 text-[8px] font-mono text-amber-300'>
              A
            </kbd>
          </button>
        )}

        {/* Slide Matrix Navigator Trigger */}
        {onOpenSlideMatrix && (
          <button
            onClick={onOpenSlideMatrix}
            title='Open Slide Matrix & Direct Jump Navigator (Hotkey: M)'
            className='flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-inner flex-shrink-0 bg-slate-900/90 text-slate-300 border-slate-800/90 hover:text-white hover:bg-slate-800 hover:border-indigo-500/50'
          >
            <LayoutGrid className='w-3.5 h-3.5 text-indigo-400' />
            <span className='hidden sm:inline'>Matrix</span>
            <kbd className='hidden lg:inline px-1 py-0.2 rounded bg-black/40 text-[8px] font-mono text-indigo-300'>
              M
            </kbd>
          </button>
        )}

        {/* Worship Stanza Matrix Trigger */}
        {onOpenStanzaMatrix && (
          <button
            onClick={onOpenStanzaMatrix}
            title='Open Worship Stanza Matrix & Quick Hymn Launcher (Hotkey: S)'
            className='flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-inner flex-shrink-0 bg-slate-900/90 text-slate-300 border-slate-800/90 hover:text-white hover:bg-slate-800 hover:border-violet-500/50'
          >
            <Music className='w-3.5 h-3.5 text-violet-400' />
            <span className='hidden sm:inline'>Stanzas</span>
            <kbd className='hidden lg:inline px-1 py-0.2 rounded bg-black/40 text-[8px] font-mono text-violet-300'>
              S
            </kbd>
          </button>
        )}

        {/* FreeShow Live Link Status */}
        <div
          className={`flex items-center space-x-2 bg-slate-900/90 px-2.5 py-1.5 rounded-lg border flex-shrink-0 shadow-inner ${
            freeShowSnapshot.status === "simulated"
              ? "border-amber-600/70 bg-amber-950/20"
              : freeShowSnapshot.connected
                ? "border-emerald-700/70 bg-emerald-950/20"
                : "border-slate-800/90"
          }`}
          title={
            freeShowSnapshot.status === "simulated"
              ? "Virtual FreeShow Mock Server active (Simulation Mode for local testing)"
              : freeShowSnapshot.connected
                ? "Connected to physical FreeShow host on port 5510"
                : "Disconnected from FreeShow"
          }
        >
          <div className='flex items-center space-x-1.5'>
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                freeShowSnapshot.status === "simulated"
                  ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse"
                  : freeShowSnapshot.connected
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"
                    : "bg-rose-500"
              }`}
            />
            <span
              className={`text-xs font-semibold whitespace-nowrap ${
                freeShowSnapshot.status === "simulated"
                  ? "text-amber-300 font-bold"
                  : freeShowSnapshot.connected
                    ? "text-emerald-300 font-bold"
                    : "text-slate-300"
              }`}
            >
              <span className='hidden sm:inline'>FreeShow: </span>
              {freeShowSnapshot.status === "simulated"
                ? "SIMULATED"
                : freeShowSnapshot.connected
                  ? "Online"
                  : "Offline"}
            </span>
            <span className='text-[10px] text-slate-500 font-mono hidden xl:inline'>
              :5510
            </span>
          </div>

          <button
            onClick={
              freeShowSnapshot.connected
                ? onDisconnectFreeShow
                : onConnectFreeShow
            }
            className={`text-xs px-2.5 py-0.5 rounded font-bold border transition-all whitespace-nowrap flex-shrink-0 shadow-sm ${
              freeShowSnapshot.status === "simulated"
                ? "border-amber-700/80 text-amber-300 hover:bg-amber-900/60"
                : freeShowSnapshot.connected
                  ? "border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                  : "border-emerald-600 bg-emerald-950/60 text-emerald-400 hover:bg-emerald-900"
            }`}
          >
            {freeShowSnapshot.connected ? "Disconnect" : "Connect"}
          </button>
        </div>

        {/* Authority Audit Log Quick-Access Pill */}
        {onToggleAuditLog && (
          <button
            onClick={onToggleAuditLog}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-inner flex-shrink-0 ${
              isAuditLogVisible
                ? "bg-indigo-950/90 text-indigo-200 border-indigo-600/80 shadow-[0_0_10px_rgba(99,102,241,0.25)]"
                : "bg-slate-900/90 text-slate-400 border-slate-800/90 hover:text-slate-200 hover:bg-slate-800"
            }`}
            title='Toggle Security Audit Log Panel (Hotkey: L)'
          >
            <ShieldCheck
              className={`w-3.5 h-3.5 ${isAuditLogVisible ? "text-indigo-400" : "text-emerald-400"}`}
            />
            <span className='hidden sm:inline'>Audit Log</span>
            <span className='text-[10px] font-mono px-1 py-0.2 rounded bg-black/40 text-slate-300'>
              {auditEventsCount ?? 0}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
