import React from 'react';
import { SuggestionCandidate } from '@pulpit-ai/shared-types';
import { Sparkles, Check, X, BookOpen, Music, ShieldAlert } from 'lucide-react';

interface SuggestionsQueueProps {
  candidates: SuggestionCandidate[];
  isLocked: boolean;
  onApprove: (candidate: SuggestionCandidate) => void;
  onDismiss: (id: string) => void;
  onManualLookup?: (referenceStr: string) => void;
}

export const SuggestionsQueue: React.FC<SuggestionsQueueProps> = React.memo(({
  candidates,
  isLocked,
  onApprove,
  onDismiss,
  onManualLookup
}) => {
  const sampleStarters = [
    { label: 'Romans 10:1', query: 'Romans 10:1' },
    { label: 'John 3:16', query: 'John 3:16' },
    { label: 'Psalm 23:1', query: 'Psalm 23:1' },
    { label: 'RCCG Hymn 1', query: 'RCCG Hymn 1' }
  ];

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col h-full shadow-xl transition-all">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-wider uppercase text-slate-200">
              Suggested Content Queue
            </h2>
            <p className="text-[10px] text-slate-400 hidden sm:block">AI-Assisted Candidate Pipeline</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border transition-colors ${
              candidates.length > 0
                ? 'bg-amber-950/80 text-amber-300 border-amber-700/80 shadow-[0_0_8px_rgba(251,191,36,0.3)] animate-pulse'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            {candidates.length} active
          </span>
        </div>
      </div>

      {/* Suggestions Stream */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {candidates.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-3 sm:p-4 text-slate-500">
            <Sparkles className="w-7 h-7 mb-1.5 opacity-25 text-amber-400" />
            <p className="font-semibold text-slate-300 text-xs">Listening for Scripture references & hymns...</p>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
              When the preacher speaks a chapter and verse, the matching passage will appear here for one-click approval.
            </p>

            {/* Quick Demo Starters */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/60 w-full max-w-xs flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                Click to test suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {sampleStarters.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => onManualLookup?.(s.query)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800/80 hover:border-indigo-500/50 text-[11px] font-semibold text-slate-300 hover:text-white transition-all shadow-sm active:scale-95"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          candidates.map((cand) => {
            const attribution = (cand.actionPayload?.data?.attribution as string) || '';

            return (
              <div
                key={cand.id}
                className={`rounded-xl p-3.5 border transition-all shadow-sm hover:shadow-md ${
                  cand.type === 'song'
                    ? 'border-purple-800/60 bg-gradient-to-br from-purple-950/20 to-slate-900/90 hover:border-purple-600/70'
                    : 'border-indigo-800/60 bg-gradient-to-br from-indigo-950/20 to-slate-900/90 hover:border-indigo-500/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
                        cand.type === 'song'
                          ? 'bg-purple-950 text-purple-400 border border-purple-800/50'
                          : 'bg-indigo-950 text-indigo-400 border border-indigo-800/50'
                      }`}
                    >
                      {cand.type === 'scripture' ? (
                        <BookOpen className="w-3.5 h-3.5" />
                      ) : (
                        <Music className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white tracking-tight">{cand.title}</h3>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono border ${
                        cand.type === 'song'
                          ? 'bg-purple-950/80 text-purple-300 border-purple-700/60 shadow-[0_0_6px_rgba(168,85,247,0.25)]'
                          : 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60 shadow-[0_0_6px_rgba(99,102,241,0.25)]'
                      }`}
                    >
                      {Math.round(cand.confidence * 100)}% Match
                    </span>

                    {cand.needsReview && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/60">
                        Needs Review
                      </span>
                    )}
                    {cand.isWholeChapter && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-700/60">
                        Whole Chapter
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onDismiss(cand.id)}
                    title="Dismiss suggestion"
                    className="text-slate-500 hover:text-rose-400 p-1 rounded-md hover:bg-slate-800/80 transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <blockquote className="text-xs font-serif text-slate-100 mt-2.5 p-3 bg-slate-950/90 rounded-xl border border-slate-800/80 leading-relaxed whitespace-pre-line shadow-inner">
                  "{cand.contentPreview}"
                </blockquote>

                {attribution && (
                  <div className="mt-1.5 text-[10px] text-indigo-400 font-semibold tracking-wide flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span>{attribution}</span>
                  </div>
                )}

                <div className="mt-2 text-[11px] text-slate-400 flex items-center space-x-1.5">
                  <span className="text-slate-500 font-semibold text-[10px] uppercase">Heard:</span>
                  <span className="italic truncate text-slate-300">{cand.evidence}</span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(cand.detectedAt).toLocaleTimeString()}
                  </span>

                  <button
                    disabled={isLocked}
                    onClick={() => onApprove(cand)}
                    className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                      isLocked
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : cand.type === 'song'
                        ? 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-purple-900/40 border border-purple-400/40'
                        : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-900/40 border border-indigo-400/40'
                    }`}
                  >
                    {isLocked ? (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Safety Locked</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{cand.type === 'song' ? 'Project Song' : 'Approve & Project'}</span>
                        <kbd className="hidden sm:inline px-1 py-0.2 rounded bg-black/30 text-[9px] font-mono text-white/80">
                          ↵
                        </kbd>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

SuggestionsQueue.displayName = 'SuggestionsQueue';
