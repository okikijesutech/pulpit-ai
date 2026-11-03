import React from 'react';
import { Mic, Volume2, Clock, CheckCircle } from 'lucide-react';

export interface RecognizedTranscriptEvent {
  id: string;
  segmentId: string;
  sourceId: string;
  timestamp: number;
  rawText: string;
  normalizedText: string;
  tokens: string[];
  confidence: number;
  latencyMs: number;
}

interface LiveTranscriptPanelProps {
  transcripts: RecognizedTranscriptEvent[];
}

export const LiveTranscriptPanel: React.FC<LiveTranscriptPanelProps> = ({
  transcripts
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 text-slate-300">
        <div className="flex items-center space-x-2">
          <Mic className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-200">
            Live Speech Transcript
          </h2>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-mono">whisper.cpp (AVX2)</span>
        </div>
      </div>

      {/* Transcript Stream */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
        {transcripts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Volume2 className="w-8 h-8 mb-2 opacity-25" />
            <p>Awaiting speech input from microphone or church mixer...</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Spoken words are transcribed locally with zero cloud transmission.
            </p>
          </div>
        ) : (
          transcripts.map((t) => (
            <div
              key={t.id}
              className="p-3 rounded-lg bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                <span className="text-slate-500 font-mono">
                  {new Date(t.timestamp).toLocaleTimeString()}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="flex items-center space-x-1 text-indigo-400 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{t.latencyMs}ms</span>
                  </span>
                  <span className="flex items-center space-x-1 text-emerald-400 font-mono">
                    <CheckCircle className="w-3 h-3" />
                    <span>{Math.round(t.confidence * 100)}%</span>
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-200 font-serif leading-relaxed">
                "{t.rawText}"
              </p>

              <div className="mt-2 pt-1.5 border-t border-slate-900 flex flex-wrap gap-1">
                {t.tokens.map((token, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono"
                  >
                    {token}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
