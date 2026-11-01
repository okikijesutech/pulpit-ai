import React from 'react';
import { SuggestionCandidate } from '@pulpit-ai/shared-types';
import { Sparkles, Check, X, BookOpen, Music, ShieldAlert } from 'lucide-react';

interface SuggestionsQueueProps {
  candidates: SuggestionCandidate[];
  isLocked: boolean;
  onApprove: (candidate: SuggestionCandidate) => void;
  onDismiss: (id: string) => void;
}

export const SuggestionsQueue: React.FC<SuggestionsQueueProps> = ({
  candidates,
  isLocked,
  onApprove,
  onDismiss
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-200">
            Suggested Content Queue
          </h2>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
          {candidates.length} active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {candidates.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Sparkles className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">Listening for live Scripture references and sung hymns...</p>
            <p className="text-xs text-slate-600 mt-1">
              Suggestions will appear here with evidence for operator review.
            </p>
          </div>
        ) : (
          candidates.map((cand) => (
            <div
              key={cand.id}
              className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 hover:border-slate-700 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {cand.type === 'scripture' ? (
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Music className="w-4 h-4 text-emerald-400" />
                  )}
                  <h3 className="text-sm font-bold text-white tracking-tight">{cand.title}</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono">
                    {Math.round(cand.confidence * 100)}% Match
                  </span>
                </div>

                <button
                  onClick={() => onDismiss(cand.id)}
                  title="Dismiss suggestion"
                  className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-800 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs font-serif text-slate-300 mt-2 p-2 bg-slate-900/60 rounded border border-slate-800/40">
                "{cand.contentPreview}"
              </p>

              <div className="mt-2 text-[11px] text-slate-400 flex items-center space-x-1">
                <span className="text-slate-500 font-medium">Evidence:</span>
                <span className="italic truncate">{cand.evidence}</span>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {new Date(cand.detectedAt).toLocaleTimeString()}
                </span>

                <button
                  disabled={isLocked}
                  onClick={() => onApprove(cand)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
                    isLocked
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40'
                  }`}
                >
                  {isLocked ? (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Locked</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Project to Screen</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
