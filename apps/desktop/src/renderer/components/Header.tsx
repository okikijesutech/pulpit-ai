import React from 'react';
import {
  AuthorityState,
  FreeShowStateSnapshot,
  OperatorMode
} from '@pulpit-ai/shared-types';
import { Shield, Radio, CheckCircle2, AlertTriangle, Power } from 'lucide-react';

interface HeaderProps {
  authorityState: AuthorityState;
  freeShowSnapshot: FreeShowStateSnapshot;
  onModeChange: (mode: OperatorMode) => void;
  onConnectFreeShow: () => void;
  onDisconnectFreeShow: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  authorityState,
  freeShowSnapshot,
  onModeChange,
  onConnectFreeShow,
  onDisconnectFreeShow
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 px-6 flex items-center justify-between backdrop-blur">
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

        {/* Listening Indicator */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-800/50 px-2.5 py-1.5 rounded-lg">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Mic: Line In</span>
        </div>
      </div>
    </header>
  );
};
