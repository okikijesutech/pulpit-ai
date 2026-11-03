import React from 'react';
import {
  AudioInputDevice,
  AuthorityState,
  FreeShowStateSnapshot,
  OperatorMode
} from '@pulpit-ai/shared-types';
import { Mic, MicOff, Radio, BookOpen, Music, Activity } from 'lucide-react';
import { AudioLevelMetrics, AudioActivityMetrics } from '../../preload/index.js';

interface HeaderProps {
  currentView?: 'live' | 'songs';
  onViewChange?: (view: 'live' | 'songs') => void;
  authorityState: AuthorityState;
  freeShowSnapshot: FreeShowStateSnapshot;
  audioDevices: AudioInputDevice[];
  activeDeviceId: string;
  audioLevel: AudioLevelMetrics;
  audioActivity?: AudioActivityMetrics;
  activeTranslation?: string;
  isMicMuted?: boolean;
  onToggleMic?: () => void;
  onModeChange: (mode: OperatorMode) => void;
  onConnectFreeShow: () => void;
  onDisconnectFreeShow: () => void;
  onSelectAudioDevice: (id: string) => void;
  onSelectTranslation?: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView = 'live',
  onViewChange,
  authorityState,
  freeShowSnapshot,
  audioDevices,
  activeDeviceId,
  audioLevel,
  audioActivity,
  activeTranslation = 'WEB',
  isMicMuted = false,
  onToggleMic,
  onModeChange,
  onConnectFreeShow,
  onDisconnectFreeShow,
  onSelectAudioDevice,
  onSelectTranslation
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 px-3 md:px-5 flex items-center justify-between backdrop-blur w-full overflow-hidden gap-2">
      <div className="flex items-center space-x-2 md:space-x-3 flex-shrink min-w-0">
        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 text-sm">
            ✝
          </div>
          <span className="font-bold text-base tracking-tight text-white hidden sm:inline">
            Pulpit <span className="text-indigo-400">AI</span>
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono hidden xl:inline">
            v0.1.0-alpha
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

        {/* View Switcher: Live Presentation vs Song Library */}
        <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs font-medium flex-shrink-0">
          <button
            onClick={() => onViewChange?.('live')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-all ${
              currentView === 'live'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Live</span>
          </button>
          <button
            onClick={() => onViewChange?.('songs')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-all ${
              currentView === 'songs'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Songs</span>
          </button>
        </div>

        <div className="h-4 w-px bg-slate-800 mx-1 hidden md:block" />

        {/* Operating Mode Selector */}
        <div className="hidden lg:flex items-center space-x-1.5 flex-shrink-0">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Mode:</span>
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs font-medium">
            <button
              onClick={() => onModeChange('suggestions')}
              className={`px-2.5 py-1 rounded transition-all ${
                authorityState.operatorMode === 'suggestions'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Suggestions
            </button>
            <button
              onClick={() => onModeChange('manual')}
              className={`px-2.5 py-1 rounded transition-all ${
                authorityState.operatorMode === 'manual'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Manual
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 flex-shrink-0">
        {/* Audio Input Device Dropdown & VU Meter with Mic On/Off Button */}
        <div className="hidden md:flex items-center space-x-2 bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-800">
          {/* Mic On/Off Toggle Button */}
          <button
            type="button"
            onClick={onToggleMic}
            title={isMicMuted ? 'Microphone is OFF. Click to turn ON' : 'Microphone is ON. Click to turn OFF'}
            className={`flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-semibold transition-all border ${
              isMicMuted
                ? 'bg-rose-950/70 text-rose-300 border-rose-800/80 hover:bg-rose-900/90'
                : 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/90'
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

          <select
            value={activeDeviceId}
            onChange={(e) => onSelectAudioDevice(e.target.value)}
            className="bg-transparent text-xs text-slate-200 border-none outline-none cursor-pointer max-w-[100px] lg:max-w-[140px] truncate"
          >
            {audioDevices.map((d) => (
              <option key={d.id} value={d.id} className="bg-slate-900 text-slate-100">
                {d.name}
              </option>
            ))}
          </select>

          {/* VU Level Meter Bar */}
          <div className="flex items-center space-x-1 pl-1.5 border-l border-slate-800">
            <div className="w-12 h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className={`h-full transition-all duration-75 ${
                  isMicMuted
                    ? 'bg-slate-700'
                    : audioLevel.isClipping
                    ? 'bg-rose-500'
                    : audioLevel.rmsLevel > 0.4
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${isMicMuted ? 0 : Math.min(100, Math.round(audioLevel.rmsLevel * 100 * 2))}%`
                }}
              />
            </div>
            <span className="text-[10px] text-slate-500 font-mono w-7 text-right">
              {isMicMuted || audioLevel.isSilent ? 'MUT' : `${audioLevel.decibels}`}
            </span>
          </div>

          {/* Live Acoustic Mode Badge (Speech vs Singing) */}
          {audioActivity && (
            <div
              className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold transition-all border ${
                audioActivity.isSinging
                  ? 'bg-purple-900/60 text-purple-300 border-purple-500/50 shadow-sm shadow-purple-500/30 animate-pulse'
                  : audioActivity.isSpeech
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              {audioActivity.isSinging ? (
                <>
                  <Music className="w-2.5 h-2.5 text-purple-400" />
                  <span className="hidden xl:inline">Singing</span>
                </>
              ) : (
                <>
                  <Mic className="w-2.5 h-2.5 text-emerald-400" />
                  <span className="hidden xl:inline">Speech</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Active Bible Translation Selector */}
        <div className="flex items-center space-x-1.5 bg-slate-950 px-2 py-1.5 rounded-lg border border-slate-800">
          <BookOpen className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
          <span className="text-[10px] text-slate-400 uppercase font-semibold hidden sm:inline">Bible:</span>
          <select
            value={activeTranslation}
            onChange={(e) => onSelectTranslation?.(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-200 border-none outline-none cursor-pointer"
          >
            <option value="WEB" className="bg-slate-900 text-slate-100">
              WEB
            </option>
            <option value="KJV" className="bg-slate-900 text-slate-100">
              KJV
            </option>
          </select>
        </div>

        {/* FreeShow Connection Status - ALWAYS VISIBLE WITH flex-shrink-0 */}
        <div className="flex items-center space-x-2 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-1.5">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                freeShowSnapshot.connected
                  ? 'bg-emerald-500 shadow-md shadow-emerald-500/50 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-xs font-semibold whitespace-nowrap">
              FreeShow: {freeShowSnapshot.connected ? 'Connected' : 'Disconnected'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">:5510</span>
          </div>

          <button
            onClick={freeShowSnapshot.connected ? onDisconnectFreeShow : onConnectFreeShow}
            className={`text-xs px-2 py-0.5 rounded border transition-colors whitespace-nowrap flex-shrink-0 ${
              freeShowSnapshot.connected
                ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                : 'border-emerald-600 text-emerald-400 hover:bg-emerald-950'
            }`}
          >
            {freeShowSnapshot.connected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </div>
    </header>
  );
};
