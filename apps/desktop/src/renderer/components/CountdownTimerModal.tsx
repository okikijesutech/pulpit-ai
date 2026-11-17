import React, { useState, useEffect } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Cast,
  EyeOff,
  Clock,
  X
} from 'lucide-react';
import { useUIStore } from '../stores/uiStore.js';
import { usePresentationStore, formatTimerMMSS } from '../stores/presentationStore.js';
import { useAuthorityStore } from '../stores/authorityStore.js';

const DURATION_PRESETS = [
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '30 min', seconds: 1800 }
];

const LABEL_PRESETS = [
  'Service Starts In',
  'Welcome to Church',
  'Offering & Tithes',
  'Altar Call',
  'Intermission'
];

export const CountdownTimerModal: React.FC = () => {
  const isOpen = useUIStore((s) => s.isTimerModalOpen);
  const onClose = useUIStore((s) => s.closeTimerModal);

  const timer = usePresentationStore((s) => s.countdownTimer);
  const configureTimer = usePresentationStore((s) => s.configureTimer);
  const startTimer = usePresentationStore((s) => s.startTimer);
  const pauseTimer = usePresentationStore((s) => s.pauseTimer);
  const resetTimer = usePresentationStore((s) => s.resetTimer);
  const projectTimerToScreen = usePresentationStore((s) => s.projectTimerToScreen);
  const stopProjectedTimer = usePresentationStore((s) => s.stopProjectedTimer);

  const freeShowConnected = useAuthorityStore((s) => s.freeShowSnapshot.connected);
  const isLocked = useAuthorityStore((s) => s.authorityState.manualLockActive);

  const [customMinutes, setCustomMinutes] = useState(Math.floor(timer.totalSeconds / 60));
  const [customSeconds, setCustomSeconds] = useState(timer.totalSeconds % 60);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApplyCustomDuration = () => {
    const total = Math.max(1, customMinutes * 60 + customSeconds);
    configureTimer({ mode: 'duration', totalSeconds: total });
  };

  const progressPct =
    timer.totalSeconds > 0
      ? Math.max(0, Math.min(100, (timer.remainingSeconds / timer.totalSeconds) * 100))
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white">Service Countdown Timer</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800/60 text-emerald-300 font-semibold">
                  Hotkey: T
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Display pre-service countdowns or segment timers on Projector &amp; Stage Foldback.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Live Digital Countdown Preview */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2 relative overflow-hidden">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              {timer.label || 'Countdown'}
            </div>
            <div
              className={`text-5xl font-mono font-extrabold tracking-tight ${
                timer.remainingSeconds <= 30 && timer.isRunning
                  ? 'text-rose-400 animate-pulse'
                  : 'text-white'
              }`}
            >
              {formatTimerMMSS(timer.remainingSeconds)}
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden mt-3">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {timer.isProjected && (
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-600/60 text-emerald-300 text-[10px] font-bold mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>LIVE ON SANCTUARY SCREEN</span>
              </div>
            )}
          </div>

          {/* Mode Toggle: Duration vs Count Down To Clock Time */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => configureTimer({ mode: 'duration' })}
              className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                timer.mode === 'duration'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Duration Countdown</span>
            </button>
            <button
              type="button"
              onClick={() => configureTimer({ mode: 'target_time' })}
              className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                timer.mode === 'target_time'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Count Down To Clock Time</span>
            </button>
          </div>

          {/* Mode Configuration */}
          {timer.mode === 'duration' ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setCustomMinutes(Math.floor(preset.seconds / 60));
                      setCustomSeconds(0);
                      configureTimer({ mode: 'duration', totalSeconds: preset.seconds });
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                      timer.totalSeconds === preset.seconds
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5">
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-12 bg-transparent text-xs font-mono text-white text-center outline-none"
                  />
                  <span className="text-[10px] text-slate-500">min</span>
                  <span className="text-slate-600">:</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={customSeconds}
                    onChange={(e) => setCustomSeconds(Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                    className="w-10 bg-transparent text-xs font-mono text-white text-center outline-none"
                  />
                  <span className="text-[10px] text-slate-500">sec</span>
                </div>
                <button
                  type="button"
                  onClick={handleApplyCustomDuration}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white"
                >
                  Set Custom
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
              <label className="text-xs font-semibold text-slate-300">Target Start Time (24h):</label>
              <input
                type="time"
                value={timer.targetTimeStr}
                onChange={(e) => configureTimer({ mode: 'target_time', targetTimeStr: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Display Title / Label */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Screen Banner Label
            </label>
            <input
              type="text"
              value={timer.label}
              onChange={(e) => configureTimer({ label: e.target.value })}
              placeholder="e.g. Service Starts In"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white outline-none"
            />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {LABEL_PRESETS.map((lbl) => (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => configureTimer({ label: lbl })}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white"
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Transport & Projection Controls */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {timer.isRunning ? (
              <button
                type="button"
                onClick={pauseTimer}
                className="py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-extrabold flex items-center justify-center space-x-1.5"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startTimer}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Local</span>
              </button>
            )}

            <button
              type="button"
              onClick={resetTimer}
              className="py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            {timer.isProjected ? (
              <button
                type="button"
                onClick={stopProjectedTimer}
                className="py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide Timer</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={!freeShowConnected || isLocked}
                onClick={projectTimerToScreen}
                className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md"
              >
                <Cast className="w-3.5 h-3.5" />
                <span>Project Live</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
