import React from 'react';
import { SuggestionCandidate } from '@pulpit-ai/shared-types';
import { Sparkles, Check, X, BookOpen, Music, ShieldAlert, Monitor } from 'lucide-react';

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
    <div className="glass-panel rounded-2xl p-3 flex flex-col h-full shadow-xl transition-all">
      {/* Compact Panel Header (~37px) */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-700/80 mb-2 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500 text-amber-300 flex items-center justify-center shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#D8E2EC] leading-tight">
              Suggested Content Queue
            </h2>
            <p className="text-[10px] text-[#A3B3C6] hidden sm:block leading-tight">
              AI-Assisted Candidate Pipeline
            </p>
          </div>
        </div>
        <span
          className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border transition-colors ${
            candidates.length > 0
              ? 'bg-amber-950 text-amber-300 border-amber-600 shadow-[0_0_8px_rgba(251,191,36,0.3)] animate-pulse'
              : 'bg-slate-900 text-slate-300 border-slate-500'
          }`}
        >
          {candidates.length} active
        </span>
      </div>

      {/* Scrollable Candidate Stream */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
        {candidates.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <Sparkles className="w-6 h-6 mb-1 text-amber-400/40" />
            <p className="text-sm font-bold text-slate-300">Listening for Scripture &amp; Song Cues...</p>
            <p className="text-xs text-[#A3B3C6] mt-1 max-w-xs">
              When the preacher speaks a scripture reference or song lyric, verified candidates appear here for 1-click approval.
            </p>
            {onManualLookup && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                <span className="w-full text-[11px] text-[#A3B3C6] mb-1 font-semibold">Click to test suggestions:</span>
                {sampleStarters.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => onManualLookup(s.query)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-500 text-xs font-semibold hover:border-indigo-400 hover:text-white transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          candidates.map((cand) => {
            const isScripture = cand.type === 'scripture';
            const attribution = (cand.actionPayload?.data?.attribution as string) || '';
            const translation = (cand.actionPayload?.data?.translation as string) || 'WEB';
            const confidencePct = Math.round(cand.confidence * 100);

            return (
              <div
                key={cand.id}
                className={`rounded-2xl p-2.5 border transition-all shadow-lg min-h-[220px] flex flex-col justify-between ${
                  isScripture
                    ? 'border-indigo-500 bg-gradient-to-br from-indigo-950/40 via-slate-900/95 to-slate-950/95 hover:border-indigo-400'
                    : 'border-purple-500 bg-gradient-to-br from-purple-950/40 via-slate-900/95 to-slate-950/95 hover:border-purple-400'
                }`}
              >
                <div>
                  {/* Card Header: Type, Title, and Touch-Safe 28x28px Dismiss */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                          isScripture
                            ? 'bg-indigo-950 border-indigo-500 text-indigo-300'
                            : 'bg-purple-950 border-purple-500 text-purple-300'
                        }`}
                      >
                        {isScripture ? <BookOpen className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
                      </div>
                      <h3 className="text-sm font-bold text-[#D8E2EC] tracking-tight leading-snug truncate">
                        {cand.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDismiss(cand.id)}
                      aria-label={`Dismiss ${cand.title}`}
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-900 text-[#A3B3C6] hover:text-rose-300 hover:bg-rose-950 border border-slate-500 hover:border-rose-500 transition-colors flex-shrink-0"
                      title="Dismiss candidate"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Semantic Badges Row: Wrapped beneath title to prevent title crushing */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono border ${
                        confidencePct >= 90
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                          : isScripture
                          ? 'bg-indigo-950 text-indigo-300 border-indigo-500'
                          : 'bg-purple-950 text-purple-200 border-purple-500'
                      }`}
                    >
                      {confidencePct}% Match
                    </span>
                    {cand.needsReview && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-950 text-amber-200 border border-amber-500">
                        Needs Review
                      </span>
                    )}
                    {cand.isWholeChapter && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-500">
                        Whole Chapter
                      </span>
                    )}
                  </div>

                  {/* Horizontal Stage Bezel: 16:9 WYSIWYG Preview + Passage/Evidence */}
                  <div className="mt-1.5 p-1.5 rounded-xl bg-[#040711] border border-slate-500 shadow-inner flex items-start gap-2">
                    <div className="w-[184px] xl:w-[188px] flex-shrink-0 aspect-video rounded-lg bg-slate-950 border border-slate-500 p-1.5 flex flex-col justify-between overflow-hidden">
                      <div className="flex items-center justify-between text-[9px] font-mono">
                        <span
                          className={`uppercase font-bold tracking-wider flex items-center gap-1 ${
                            isScripture ? 'text-indigo-300' : 'text-purple-300'
                          }`}
                        >
                          <Monitor className="w-2.5 h-2.5" /> 16:9
                        </span>
                        <span
                          className={`px-1 py-0.5 rounded border font-bold leading-none ${
                            isScripture
                              ? 'bg-indigo-950 text-indigo-200 border-indigo-500'
                              : 'bg-purple-900 text-purple-200 border-purple-500'
                          }`}
                        >
                          {translation}
                        </span>
                      </div>
                      <p className="text-[10px] font-serif italic text-slate-300 leading-tight text-center line-clamp-3">
                        &ldquo;{cand.contentPreview}&rdquo;
                      </p>
                      <div className="text-right text-[9px] font-sans font-bold text-[#A3B3C6] truncate">
                        — {cand.title}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <p className="text-xs font-serif text-slate-300 leading-snug line-clamp-4">
                        &ldquo;{cand.contentPreview}&rdquo;
                      </p>
                      <div className="mt-1 space-y-0.5 min-w-0">
                        {attribution && (
                          <div className="text-[10px] text-indigo-300 font-semibold truncate">
                            {attribution}
                          </div>
                        )}
                        {cand.evidence && (
                          <div className="text-[11px] flex items-center gap-1 text-slate-300 min-w-0">
                            <span className="text-[#A3B3C6] font-bold uppercase text-[10px] tracking-wider flex-shrink-0">
                              Heard:
                            </span>
                            <span className="italic truncate text-slate-300">&ldquo;{cand.evidence}&rdquo;</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Footer: Timestamp & 44px WCAG AAA Tactile Approval CTA */}
                <div className="mt-1.5 pt-1.5 border-t border-slate-700/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#A3B3C6] font-mono">
                    {new Date(cand.detectedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => onApprove(cand)}
                    className={`h-11 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center space-x-2 shadow-lg transition-all active:scale-95 ${
                      isLocked
                        ? 'bg-slate-800 text-slate-300 border border-slate-500 cursor-not-allowed'
                        : isScripture
                        ? 'bg-indigo-700 hover:bg-indigo-600 text-white border border-indigo-400'
                        : 'bg-purple-800 hover:bg-purple-700 text-white border border-purple-400'
                    }`}
                  >
                    {isLocked ? (
                      <>
                        <ShieldAlert className="w-4 h-4" />
                        <span>Safety Locked</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>{isScripture ? 'Approve & Project' : 'Project Song'}</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-indigo-950 text-[10px] font-mono font-bold text-indigo-200 border border-indigo-400">
                          ↵ Enter
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
