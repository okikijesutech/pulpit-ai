import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Tv,
  Radio,
  Clock,
  ArrowRight,
  ListOrdered,
  Send,
  Trash2,
  X,
  MessageSquare,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { usePresentationStore } from '../stores/presentationStore.js';
import { useUIStore } from '../stores/uiStore.js';
import { DisplayTarget } from '@pulpit-ai/shared-types';

export const StageDisplayModal: React.FC = () => {
  const isOpen = useUIStore((s) => s.isStageDisplayModalOpen);
  const onClose = useUIStore((s) => s.closeStageDisplayModal);

  const activeTarget = usePresentationStore((s) => s.activeMonitorTarget);
  const setActiveTarget = usePresentationStore((s) => s.setActiveMonitorTarget);
  const stagePresets = usePresentationStore((s) => s.stagePresets);
  const updateStagePreset = usePresentationStore((s) => s.updateStagePreset);
  const stagePrivateMessage = usePresentationStore((s) => s.stagePrivateMessage);
  const sendStageMessage = usePresentationStore((s) => s.sendStageMessage);
  const clearStageMessage = usePresentationStore((s) => s.clearStageMessage);

  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);

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

  const currentFoldbackPreset = stagePresets.find((p) => p.target === 'foldback') || stagePresets[1];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend ?? messageInput.trim();
    if (!text) return;
    setIsSending(true);
    try {
      await sendStageMessage(text);
      setMessageInput('');
    } finally {
      setIsSending(false);
    }
  };

  const handleClearMessage = async () => {
    setIsSending(true);
    try {
      await clearStageMessage();
      setMessageInput('');
    } finally {
      setIsSending(false);
    }
  };

  const quickAlertPresets = [
    'Wrap up in 2 minutes',
    'Altar Call — Band on stage',
    'Pastor, check your lapel mic',
    'Choir stand for benediction'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-100">
                  Multi-Screen Stage Confidence & Output Matrix
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800/60 text-indigo-300 font-semibold">
                  Hotkey: D
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Route sanctuary projection, pastor foldback monitor, and live stream outputs.
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

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Target Screen Switcher */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2.5">
              Select Output Feed
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setActiveTarget('main')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  activeTarget === 'main'
                    ? 'bg-indigo-950/70 border-indigo-500 ring-1 ring-indigo-500 shadow-lg'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1.5">
                  <Monitor className={`w-4 h-4 ${activeTarget === 'main' ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-white">Main Projector</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Auditorium sanctuary screen for congregation viewing.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTarget('foldback')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  activeTarget === 'foldback'
                    ? 'bg-amber-950/70 border-amber-500 ring-1 ring-amber-500 shadow-lg'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1.5">
                  <Tv className={`w-4 h-4 ${activeTarget === 'foldback' ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-white">Stage Foldback</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Confidence monitor for Pastor, speaker & worship team.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTarget('stream')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  activeTarget === 'stream'
                    ? 'bg-emerald-950/70 border-emerald-500 ring-1 ring-emerald-500 shadow-lg'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1.5">
                  <Radio className={`w-4 h-4 ${activeTarget === 'stream' ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-white">Live Stream</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Broadcast lower-third overlays for YouTube/Facebook.
                </p>
              </button>
            </div>
          </div>

          {/* Stage Foldback Display Settings */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 space-y-3.5">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Pastor & Choir Foldback Display Elements</span>
            </h3>

            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                <div className="flex items-center space-x-2.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Real-Time Stage Clock</div>
                    <div className="text-[10px] text-slate-500">
                      Renders live digital time in the top-right foldback header
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={currentFoldbackPreset.showClock}
                  onChange={(e) =>
                    updateStagePreset(currentFoldbackPreset.id, { showClock: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                <div className="flex items-center space-x-2.5">
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">"Coming Up Next" Slide Preview</div>
                    <div className="text-[10px] text-slate-500">
                      Shows upcoming lyrics or scripture so speakers never lose their place
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={currentFoldbackPreset.showNextSlide}
                  onChange={(e) =>
                    updateStagePreset(currentFoldbackPreset.id, { showNextSlide: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700">
                <div className="flex items-center space-x-2.5">
                  <ListOrdered className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">Sunday Liturgy Cue Badge</div>
                    <div className="text-[10px] text-slate-500">
                      Displays current service segment progress (e.g. Cue 3/8: Worship)
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={currentFoldbackPreset.showLiturgyCue}
                  onChange={(e) =>
                    updateStagePreset(currentFoldbackPreset.id, { showLiturgyCue: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 w-4 h-4"
                />
              </label>
            </div>
          </div>

          {/* Private Stage Prompt / Alert Ticker */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>Private Stage Prompt (Visible to Speaker Only)</span>
              </h3>
              {stagePrivateMessage && (
                <span className="flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
                  <span>ACTIVE ON STAGE</span>
                </span>
              )}
            </div>

            {/* Currently Active Message Ticker */}
            {stagePrivateMessage && (
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-700/60 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-base">📢</span>
                  <span className="text-xs font-bold text-amber-200 font-mono">
                    "{stagePrivateMessage}"
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearMessage}
                  className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[11px] font-bold transition-all flex items-center space-x-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Dismiss</span>
                </button>
              </div>
            )}

            {/* Message input */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type private prompt for pastor (e.g. 5 minutes remaining)..."
                className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isSending || !messageInput.trim()}
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>

            {/* Quick alert presets */}
            <div>
              <div className="text-[10px] text-slate-500 mb-1.5 font-medium">Quick Stage Presets:</div>
              <div className="flex flex-wrap gap-1.5">
                {quickAlertPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSendMessage(preset)}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Output Matrix active • Changes apply in real time</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
