import React from 'react';
import { Mic, Clock, CheckCircle } from 'lucide-react';

export interface RecognizedTranscriptEvent {
  id: string;
  segmentId: string;
  sourceId: string;
  timestamp: number;
  rawText: string;
  normalizedText: string;
  tokens: string[];
  confidence: number | null;
  latencyMs: number;
}

interface LiveTranscriptPanelProps {
  transcripts: RecognizedTranscriptEvent[];
}

export const LiveTranscriptPanel: React.FC<LiveTranscriptPanelProps> = ({
  transcripts
}) => {
  // Highlight recognized biblical cues & book names in the transcript text
  const highlightScriptureKeywords = (text: string) => {
    const clean = text.replace(/^["'\s]+|["'\s]+$/g, '');
    const regex = /\b(genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|samuel|kings|chronicles|ezra|nehemiah|esther|job|psalms?|proverbs|ecclesiastes|song\s+of\s+solomon|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|matthew|mark|luke|john|acts|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude|revelation|chapter|verse|verses|bible|bibles|scripture)\b/gi;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(clean)) !== null) {
      if (match.index > lastIndex) {
        parts.push(clean.substring(lastIndex, match.index));
      }
      parts.push(
        <span
          key={match.index}
          className="font-bold text-indigo-300 bg-indigo-950/60 px-1 py-0.5 rounded border border-indigo-700/40"
        >
          {match[0]}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < clean.length) {
      parts.push(clean.substring(lastIndex));
    }

    return parts.length > 0 ? parts : clean;
  };

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col h-full shadow-xl transition-all">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-sm">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-wider uppercase text-slate-200">
              Live Speech Transcript
            </h2>
            <p className="text-[10px] text-slate-400 hidden sm:block">Acoustic Preaching Stream</p>
          </div>
        </div>

        {/* Engine Badge with Required AVX2 Identifier */}
        <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-[10px] font-semibold text-slate-300">
            whisper.cpp (AVX2)
          </span>
        </div>
      </div>

      {/* Transcript Stream */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
        {transcripts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            {/* Animated Audio Equalizer Bars */}
            <div className="flex items-center gap-1.5 h-8 mb-3 px-3 py-1 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="w-1 bg-emerald-500/70 rounded-full h-full animate-wave-1" />
              <span className="w-1 bg-emerald-500/80 rounded-full h-full animate-wave-2" />
              <span className="w-1 bg-emerald-400 rounded-full h-full animate-wave-3" />
              <span className="w-1 bg-indigo-400 rounded-full h-full animate-wave-4" />
              <span className="w-1 bg-indigo-500 rounded-full h-full animate-wave-5" />
              <span className="w-1 bg-indigo-500/80 rounded-full h-full animate-wave-6" />
              <span className="w-1 bg-indigo-500/70 rounded-full h-full animate-wave-7" />
            </div>
            <p className="font-semibold text-slate-400 text-xs">Listening for live speech input...</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              Spoken words are transcribed locally via whisper.cpp with zero cloud transmission.
            </p>
          </div>
        ) : (
          transcripts.map((t) => (
            <div
              key={t.id}
              className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 hover:border-slate-700/80 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                <span className="text-slate-400 font-mono text-[10px] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {new Date(t.timestamp).toLocaleTimeString()}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-400 font-mono text-[10px]">
                    <span>⚡ {t.latencyMs}ms</span>
                  </span>
                  <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-[10px]">
                    <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                    <span>{t.confidence !== null ? `${Math.round(t.confidence * 100)}%` : '—'}</span>
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-100 font-serif leading-relaxed">
                "{highlightScriptureKeywords(t.rawText)}"
              </p>

              {t.tokens && t.tokens.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap gap-1">
                  {t.tokens.map((token, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800/80 text-[9px] text-slate-400 font-mono"
                    >
                      {token}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
