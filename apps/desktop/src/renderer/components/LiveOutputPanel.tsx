import React, { useState, useEffect } from 'react';
import { FreeShowStateSnapshot } from '@pulpit-ai/shared-types';
import {
  Monitor,
  EyeOff,
  Layers,
  Radio,
  Cast,
  LayoutGrid,
  Tv,
  Clock,
  ArrowRight,
  Sliders,
  Timer
} from 'lucide-react';
import { usePresentationStore, formatTimerMMSS } from '../stores/presentationStore.js';
import { useUIStore } from '../stores/uiStore.js';

interface LiveOutputPanelProps {
  snapshot: FreeShowStateSnapshot;
  onOpenSlideMatrix?: () => void;
}

export const LiveOutputPanel: React.FC<LiveOutputPanelProps> = ({ snapshot, onOpenSlideMatrix }) => {
  const activeTarget = usePresentationStore((s) => s.activeMonitorTarget);
  const setActiveTarget = usePresentationStore((s) => s.setActiveMonitorTarget);
  const stagePresets = usePresentationStore((s) => s.stagePresets);
  const stagePrivateMessage = usePresentationStore((s) => s.stagePrivateMessage);
  const serviceCues = usePresentationStore((s) => s.serviceCues);
  const activeCueIndex = usePresentationStore((s) => s.activeCueIndex);
  const activeMediaAsset = usePresentationStore((s) => s.activeMediaAsset);
  const countdownTimer = usePresentationStore((s) => s.countdownTimer);
  const openStageDisplayModal = useUIStore((s) => s.openStageDisplayModal);
  const openTimerModal = useUIStore((s) => s.openTimerModal);

  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const foldbackPreset = stagePresets.find((p) => p.target === 'foldback') || stagePresets[1];
  const currentCue = serviceCues[activeCueIndex];
  const nextCue = activeCueIndex < serviceCues.length - 1 ? serviceCues[activeCueIndex + 1] : null;

  const showTitle = snapshot.currentShowId && !snapshot.currentShowId.includes('[object Object]')
    ? snapshot.currentShowId
    : (snapshot.currentShowId?.includes('[object Object]') ? 'Scripture: John 3:16' : 'None');

  const isOnAir = snapshot.connected && !snapshot.isOutputCleared && Boolean(snapshot.currentSlideText);

  return (
    <div className="glass-panel rounded-2xl p-3.5 flex flex-col h-full shadow-xl transition-all">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80 mb-2.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-sm">
            <Monitor className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-wider uppercase text-slate-200">
              Live Presentation Output
            </h2>
            <p className="text-[10px] text-slate-400 hidden sm:block">Multi-Screen Stage Routing</p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center space-x-2">
          {snapshot.isOutputCleared ? (
            <span className="flex items-center space-x-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800 shadow-[0_0_8px_rgba(244,63,94,0.3)]">
              <EyeOff className="w-3 h-3 text-rose-400" />
              <span>Blanked</span>
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

          {/* Quick Stage Modal Launcher */}
          <button
            type="button"
            onClick={openStageDisplayModal}
            title="Configure Multi-Screen Stage Confidence Displays & Private Prompts [D]"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Target Routing Switcher Tabs */}
      <div className="flex items-center gap-1.5 mb-2.5 p-1 bg-slate-950/70 rounded-xl border border-slate-800/80">
        <button
          type="button"
          onClick={() => setActiveTarget('main')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
            activeTarget === 'main'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Monitor className="w-3 h-3" />
          <span>Main (Projector)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTarget('foldback')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
            activeTarget === 'foldback'
              ? 'bg-amber-600 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Tv className="w-3 h-3" />
          <span>Stage Foldback</span>
          {stagePrivateMessage && (
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTarget('stream')}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
            activeTarget === 'stream'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Radio className="w-3 h-3" />
          <span>Live Stream</span>
        </button>
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
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeTarget === 'foldback'
                    ? 'bg-amber-400'
                    : activeTarget === 'stream'
                    ? 'bg-emerald-400'
                    : 'bg-indigo-500'
                }`}
              />
              <span className="uppercase font-semibold">
                {activeTarget === 'foldback'
                  ? 'STAGE 2 • FOLDBACK (1080P)'
                  : activeTarget === 'stream'
                  ? 'BROADCAST • LOWER-THIRD'
                  : 'STAGE 1 • SANCTUARY (1080P)'}
              </span>
            </span>

            <div className="flex items-center space-x-2">
              {(countdownTimer.isRunning || countdownTimer.isProjected) && (
                <button
                  type="button"
                  onClick={openTimerModal}
                  title="Countdown Timer active — click to manage [T]"
                  className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-600/60 text-[10px] font-mono text-emerald-300 font-bold animate-pulse"
                >
                  <Timer className="w-3 h-3 text-emerald-400" />
                  <span>{formatTimerMMSS(countdownTimer.remainingSeconds)}</span>
                </button>
              )}

              {activeTarget === 'foldback' && foldbackPreset.showClock && (
                <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-amber-300 font-bold">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>{currentTime}</span>
                </div>
              )}

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

          {/* Foldback Private Message Ticker (if present) */}
          {activeTarget === 'foldback' && stagePrivateMessage && (
            <div className="mb-2 p-2 rounded-lg bg-amber-500/20 border border-amber-500/60 text-amber-200 text-xs font-bold font-mono flex items-center space-x-2 animate-pulse shadow-md">
              <span className="text-sm">📢</span>
              <span className="truncate">STAGE PROMPT: {stagePrivateMessage}</span>
            </div>
          )}

          {/* Canvas Display Viewport */}
          {activeTarget === 'foldback' ? (
            /* Pastor & Choir Foldback Confidence Screen */
            <div className="mt-1 p-3 rounded-lg bg-slate-950/90 border border-amber-900/40 min-h-[110px] flex flex-col justify-between">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Current Slide Display */}
                <div className="p-2.5 rounded-md bg-slate-900/80 border border-slate-800">
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                    Current Slide (Live)
                  </div>
                  {snapshot.isOutputCleared ? (
                    <div className="text-xs text-rose-400 font-semibold italic">Screen Blanked</div>
                  ) : snapshot.currentSlideText ? (
                    <p className="text-sm font-sans font-bold text-white leading-snug">
                      "{snapshot.currentSlideText}"
                    </p>
                  ) : (
                    <div className="text-xs text-slate-500">Standby (No Slide)</div>
                  )}
                </div>

                {/* Coming Up Next Preview */}
                {foldbackPreset.showNextSlide && (
                  <div className="p-2.5 rounded-md bg-slate-900/40 border border-slate-800/80">
                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
                      <span>Coming Up Next</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </div>
                    {nextCue ? (
                      <div>
                        <div className="text-xs font-bold text-slate-200 truncate">{nextCue.title}</div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{nextCue.subtitle}</div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">End of Liturgy Run-Sheet</div>
                    )}
                  </div>
                )}
              </div>

              {/* Liturgy Cue Status Bar */}
              {foldbackPreset.showLiturgyCue && currentCue && (
                <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold text-amber-300">
                    Liturgy Cue {activeCueIndex + 1}/{serviceCues.length}: {currentCue.title}
                  </span>
                  <span>{currentCue.durationMinutes ? `~${currentCue.durationMinutes}m` : ''}</span>
                </div>
              )}
            </div>
          ) : activeTarget === 'stream' ? (
            /* Broadcast Lower-Third Preview */
            <div className="mt-1.5 p-3 rounded-lg bg-slate-950/80 border border-emerald-900/40 min-h-[110px] flex flex-col justify-end relative shadow-inner overflow-hidden">
              <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-600 font-mono">
                  [1080p Video Feed Background]
                </span>
              </div>
              <div className="relative z-10 p-2.5 rounded-lg bg-slate-950/95 border-l-4 border-emerald-500 border border-slate-800/90 shadow-2xl">
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5 flex items-center space-x-1.5">
                  <Radio className="w-2.5 h-2.5" />
                  <span>Lower-Third Broadcast Overlay</span>
                </div>
                <p className="text-xs font-semibold text-slate-100 truncate">
                  {snapshot.currentSlideText || 'Ready for scripture reference / speaker name key'}
                </p>
              </div>
            </div>
          ) : (
            /* Auditorium Sanctuary Projector Canvas */
            <div className="mt-1.5 p-3 sm:p-4 rounded-lg bg-slate-950/80 border border-slate-800/80 text-center min-h-[105px] flex flex-col items-center justify-center relative shadow-inner overflow-hidden">
              {countdownTimer.isProjected ? (
                <div className="flex flex-col items-center justify-center space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    {countdownTimer.label}
                  </span>
                  <span className="text-3xl font-mono font-extrabold text-white tracking-wider">
                    {formatTimerMMSS(countdownTimer.remainingSeconds)}
                  </span>
                </div>
              ) : activeMediaAsset ? (
                <div className="flex flex-col items-center justify-center w-full space-y-1">
                  <img
                    src={activeMediaAsset.dataUrl}
                    alt={activeMediaAsset.name}
                    className="max-h-24 max-w-full object-contain rounded shadow-md"
                  />
                  <span className="text-[10px] font-mono text-cyan-300 truncate max-w-full">
                    Graphic: {activeMediaAsset.name}
                  </span>
                </div>
              ) : snapshot.connected ? (
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
          )}
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
            {snapshot.connected
              ? `Heartbeat: ${snapshot.lastHeartbeat ? new Date(snapshot.lastHeartbeat).toLocaleTimeString() : 'Active'}`
              : 'FreeShow Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
};
