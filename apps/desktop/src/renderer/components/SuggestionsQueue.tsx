import React, { useState } from 'react';
import { SuggestionCandidate } from '@pulpit-ai/shared-types';
import { Sparkles, Check, X, BookOpen, Music, ShieldAlert, Search } from 'lucide-react';

interface SuggestionsQueueProps {
  candidates: SuggestionCandidate[];
  isLocked: boolean;
  onApprove: (candidate: SuggestionCandidate) => void;
  onDismiss: (id: string) => void;
  onManualLookup?: (referenceStr: string) => void;
}

export const SuggestionsQueue: React.FC<SuggestionsQueueProps> = ({
  candidates,
  isLocked,
  onApprove,
  onDismiss,
  onManualLookup
}) => {
  const [lookupText, setLookupText] = useState('');

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupText.trim()) return;
    onManualLookup?.(lookupText.trim());
    setLookupText('');
  };

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

      {/* Quick Scripture Manual Lookup Bar */}
      <form onSubmit={handleLookupSubmit} className="flex items-center space-x-2 mb-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={lookupText}
            onChange={(e) => setLookupText(e.target.value)}
            placeholder="Quick lookup (e.g. John 3:16, Psalm 23, 1 Cor 13:4-7)..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={!lookupText.trim()}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-medium transition-colors"
        >
          Lookup
        </button>
      </form>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {candidates.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Sparkles className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">Listening for live Scripture references and sung hymns...</p>
            <p className="text-xs text-slate-600 mt-1">
              Exact passages from approved translations will appear here for review.
            </p>
          </div>
        ) : (
          candidates.map((cand) => {
            const attribution = (cand.actionPayload?.data?.attribution as string) || '';

            return (
              <div
                key={cand.id}
                className={`bg-slate-950 border rounded-lg p-3.5 hover:border-slate-700 transition-all shadow-sm ${
                  cand.type === 'song'
                    ? 'border-purple-900/60 bg-purple-950/10'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {cand.type === 'scripture' ? (
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Music className="w-4 h-4 text-purple-400" />
                    )}
                    <h3 className="text-sm font-bold text-white tracking-tight">{cand.title}</h3>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded font-mono ${
                        cand.type === 'song'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                          : 'bg-indigo-950 text-indigo-300 border border-indigo-800/60'
                      }`}
                    >
                      {Math.round(cand.confidence * 100)}% Match
                    </span>
                    {cand.needsReview && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
                        Needs Review
                      </span>
                    )}
                    {cand.isWholeChapter && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60">
                        Whole Chapter
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onDismiss(cand.id)}
                    title="Dismiss suggestion"
                    className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs font-serif text-slate-200 mt-2 p-2.5 bg-slate-900/80 rounded border border-slate-800/60 leading-relaxed whitespace-pre-line">
                  "{cand.contentPreview}"
                </p>

                {attribution && (
                  <div className="mt-1.5 text-[10px] text-indigo-400/80 font-medium tracking-wide">
                    {attribution}
                  </div>
                )}

                <div className="mt-2 text-[11px] text-slate-400 flex items-center space-x-1">
                  <span className="text-slate-500 font-medium">Evidence:</span>
                  <span className="italic truncate">{cand.evidence}</span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(cand.detectedAt).toLocaleTimeString()}
                  </span>

                  <button
                    disabled={isLocked}
                    onClick={() => onApprove(cand)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
                      isLocked
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : cand.type === 'song'
                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40'
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
                        <span>{cand.type === 'song' ? 'Project Song Show' : 'Project to Screen'}</span>
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
};
