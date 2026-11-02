import React from 'react';
import {
  AudioInputDevice,
  AuthorityState,
  FreeShowStateSnapshot,
  OperatorMode
} from '@pulpit-ai/shared-types';
import { Mic, Radio, BookOpen, Music } from 'lucide-react';
import { AudioLevelMetrics } from '../../preload/index.js';

interface HeaderProps {
  currentView?: 'live' | 'songs';
  onViewChange?: (view: 'live' | 'songs') => void;
  authorityState: AuthorityState;
  freeShowSnapshot: FreeShowStateSnapshot;
  audioDevices: AudioInputDevice[];
  activeDeviceId: string;
  audioLevel: AudioLevelMetrics;
  activeTranslation?: string;
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
  activeTranslation = 'WEB',
  onModeChange,
  onConnectFreeShow,
  onDisconnectFreeShow,
  onSelectAudioDevice,
  onSelectTranslation
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between backdrop-blur">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            ✝
          </div>
          <span className="font-bold text-lg tracking-tight text-white">
            Pulpit <span className="text-indigo-400">AI</span>
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            v0.1.0-alpha
          </span>
        </div>

        <div className="h-4 w-px bg-slate-700 mx-2" />

        {/* View Switcher: Live Presentation vs Song Library */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
          <button
            onClick={() => onViewChange?.('live')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded transition-all ${
              currentView === 'live'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Live Assistant</span>
          </button>
          <button
            onClick={() => onViewChange?.('songs')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded transition-all ${
              currentView === 'songs'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Song Library</span>
          </button>
        </div>

        <div className="h-4 w-px bg-slate-700 mx-2" />

        {/* Operating Mode Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Mode:</span>
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
            <button
              onClick={() => onModeChange('suggestions')}
              className={`px-3 py-1 rounded transition-all ${
                authorityState.operatorMode === 'suggestions'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Suggestions (Default)
            </button>
            <button
              onClick={() => onModeChange('manual')}
              className={`px-3 py-1 rounded transition-all ${
                authorityState.operatorMode === 'manual'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Manual Control
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Audio Input Device Dropdown & VU Meter */}
        <div className="flex items-center space-x-3 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <Mic className="w-4 h-4 text-emerald-400" />
          <select
            value={activeDeviceId}
            onChange={(e) => onSelectAudioDevice(e.target.value)}
            className="bg-transparent text-xs text-slate-200 border-none outline-none cursor-pointer max-w-[180px] truncate"
          >
            {audioDevices.map((d) => (
              <option key={d.id} value={d.id} className="bg-slate-900 text-slate-100">
                {d.name}
              </option>
            ))}
          </select>

          {/* VU Level Meter Bar */}
          <div className="flex items-center space-x-1 pl-2 border-l border-slate-800">
            <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className={`h-full transition-all duration-75 ${
                  audioLevel.isClipping
                    ? 'bg-rose-500'
                    : audioLevel.rmsLevel > 0.4
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.round(audioLevel.rmsLevel * 100 * 2))}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 font-mono w-9 text-right">
              {audioLevel.isSilent ? 'MUTE' : `${audioLevel.decibels}dB`}
            </span>
          </div>
        </div>

        {/* Active Bible Translation Selector */}
        <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Bible:</span>
          <select
            value={activeTranslation}
            onChange={(e) => onSelectTranslation?.(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-200 border-none outline-none cursor-pointer"
          >
            <option value="WEB" className="bg-slate-900 text-slate-100">
              WEB (World English)
            </option>
            <option value="KJV" className="bg-slate-900 text-slate-100">
              KJV (King James)
            </option>
          </select>
        </div>

        {/* FreeShow Connection Status */}
        <div className="flex items-center space-x-3 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <div className="flex items-center space-x-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                freeShowSnapshot.connected
                  ? 'bg-emerald-500 shadow-md shadow-emerald-500/50 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-xs font-semibold">
              FreeShow: {freeShowSnapshot.connected ? 'Connected' : 'Disconnected'}
            </span>
            <span className="text-xs text-slate-500 font-mono">:5505</span>
          </div>

          <button
            onClick={freeShowSnapshot.connected ? onDisconnectFreeShow : onConnectFreeShow}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
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
