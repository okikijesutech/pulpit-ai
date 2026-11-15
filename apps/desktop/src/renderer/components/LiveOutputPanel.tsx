import React from 'react';
import { FreeShowStateSnapshot } from '@pulpit-ai/shared-types';
import { Monitor, EyeOff, Layers, Radio, Cast, LayoutGrid } from 'lucide-react';

interface LiveOutputPanelProps {
  snapshot: FreeShowStateSnapshot;
  onOpenSlideMatrix?: () => void;
}

export const LiveOutputPanel: React.FC<LiveOutputPanelProps> = ({ snapshot, onOpenSlideMatrix }) => {
  const showTitle = snapshot.currentShowId && !snapshot.currentShowId.includes('[object Object]')
    ? snapshot.currentShowId
    : (snapshot.currentShowId?.includes('[object Object]') ? 'Scripture: John 3:16' : 'None');

  const isOnAir = snapshot.connected && !snapshot.isOutputCleared && Boolean(snapshot.currentSlideText);

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col h-full shadow-xl transition-all">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-sm">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-wider uppercase text-slate-200">
              Live Presentation Output
            </h2>
            <p className="text-[10px] text-slate-400 hidden sm:block">Sanctuary Projector Feed</p>
          </div>
        </div>

        {snapshot.isOutputCleared ? (
          <span className="flex items-center space-x-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800 shadow-[0_0_8px_rgba(244,63,94,0.3)]">
            <EyeOff className="w-3 h-3 text-rose-400" />
            <span>Blackout / Cleared</span>
          </span>
        ) : isOnAir ? (
          <span className="flex items-center space-x-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 shadow-[0_0_8px_rgba(16,185,129,0.35)] animate-pulse">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>ON AIR</span>
          </span>
        ) : snapshot.connected ? (
          <span className="flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            <span>Standby</span>
          </span>
        ) : (
          <span className="flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-900 text-slate-500 border border-slate-800">
            <span>Offline</span>
          </span>
        )}
      </div>

      {/* 16:9 Stage Confidence Monitor Viewport */}
      <div className="flex-1 flex flex-col justify-between bg-gradient-to-b from-[#060913] to-[#0a0f1d] rounded-xl p-3.5 border border-slate-800/90 shadow-inner relative overflow-hidden group">
        {/* Subtle Stage Viewport Bezel & Crosshairs */}
        <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-700 select-none pointer-events-none">+</div>
        <div className="absolute top-2 right-2 text-[10px] font-mono text-slate-700 select-none pointer-events-none">+</div>
        <div className="absolute bottom-2 left-2 text-[10px] font-mono text-slate-700 select-none pointer-events-none">+</div>
        <div className="absolute bottom-2 right-2 text-[10px] font-mono text-slate-700 select-none pointer-events-none">+</div>

        <div>
          {/* Top Monitor Tag Bar */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 px-1">
            <span className="flex items-center space-x-1.5 font-mono text-[10px] text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>STAGE 1 • 1920×1080</span>
            </span>
            <div className="flex items-center space-x-2">
              {onOpenSlideMatrix ? (
                <button
                  type="button"
                  onClick={onOpenSlideMatrix}
                  title="Open Slide Matrix & Direct Jump Navigator [M]"
                  className="flex items-center space-x-1.5 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/60 text-slate-400 hover:text-white transition-all shadow-sm active:scale-95 group cursor-pointer"
                >
                  <LayoutGrid className="w-3 h-3 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span>
                    Slide <strong className="text-indigo-400 group-hover:text-indigo-300">{snapshot.currentSlideIndex ?? 0}</strong>
                  </span>
                </button>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                  Slide <strong className="text-indigo-400">{snapshot.currentSlideIndex ?? 0}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Canvas Display Viewport */}
          <div className="mt-2 p-5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-center min-h-[135px] flex flex-col items-center justify-center relative shadow-inner">
            {snapshot.connected ? (
              snapshot.isOutputCleared ? (
                <div className="flex flex-col items-center text-slate-600">
                  <EyeOff className="w-6 h-6 mb-1 opacity-50 text-rose-500" />
                  <p className="text-xs font-medium text-slate-400">Projector Screen Blanked</p>
                  <p className="text-[10px] text-slate-600">Click Restore in Manual Controls to resume</p>
                </div>
              ) : snapshot.currentSlideText ? (
                <p className="text-base sm:text-lg font-serif text-slate-100 italic leading-relaxed drop-shadow-md">
                  "{snapshot.currentSlideText}"
                </p>
              ) : (
                <div className="flex flex-col items-center text-slate-500">
                  <Cast className="w-6 h-6 mb-1 text-indigo-400/50" />
                  <p className="text-xs font-semibold text-slate-300">Ready on Stage 1</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Approve a suggestion or select a slide to project</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center text-slate-500 p-2">
                <Monitor className="w-7 h-7 mb-2 opacity-30 text-indigo-400" />
                <p className="text-xs font-medium text-slate-400">No Live Projector Feed</p>
                <p className="text-[11px] text-slate-600 mt-1 max-w-xs text-center">
                  Connect to FreeShow (:5510) to mirror the sanctuary projection screen in real time.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Monitor Footer Telemetry */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span className="flex items-center space-x-1.5 truncate max-w-[200px]">
            <Layers className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
            <span className="truncate">
              Show: <strong className="text-slate-300 font-semibold">{showTitle}</strong>
            </span>
          </span>
          <span className="font-mono text-[10px] text-slate-500 flex-shrink-0">
            {snapshot.connected ? `Heartbeat: ${snapshot.lastHeartbeat ? new Date(snapshot.lastHeartbeat).toLocaleTimeString() : 'Active'}` : 'FreeShow Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
};
