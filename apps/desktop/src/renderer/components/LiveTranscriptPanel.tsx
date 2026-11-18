import React, { useState } from 'react';
import { Mic, Clock, CheckCircle, Cpu, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import type { SpeechRoutingPlan } from '@pulpit-ai/speech-engine';
import { useAudioStore } from '../stores/audioStore.js';
import { usePresentationStore } from '../stores/presentationStore.js';
import { formatEngineStatusBadge } from '../utils/speechEngineStatus.js';

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
  transcripts?: RecognizedTranscriptEvent[];
  engineStatus?: SpeechRoutingPlan | null;
}

export const LiveTranscriptPanel: React.FC<LiveTranscriptPanelProps> = React.memo(({
  transcripts: propTranscripts,
  engineStatus
}) => {
  const storeTranscripts = usePresentationStore((s) => s.transcripts);
  const transcripts = propTranscripts !== undefined ? propTranscripts : storeTranscripts;
  const storeEngineStatus = useAudioStore((s) => s.speechEngineStatus);
  const activePlan = engineStatus !== undefined ? engineStatus : storeEngineStatus;
  const badge = formatEngineStatusBadge(activePlan, 'whisper.cpp (AVX2)');
  const [showEngineDetails, setShowEngineDetails] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
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

        {/* Live Hardware Tier & Active Speech Engine Badge */}
        <button
          type="button"
          onClick={() => setShowEngineDetails((prev) => !prev)}
          title={badge.tooltip}
          aria-expanded={showEngineDetails}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs shadow-inner transition-colors cursor-pointer"
        >
          <span
            className={`w-2 h-2 rounded-full animate-pulse ${
              badge.tierTone === 'indigo' ? 'bg-indigo-400' : 'bg-emerald-500'
            }`}
          />
          <span
            className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold tracking-wider ${
              badge.tierTone === 'indigo'
                ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/60'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
            }`}
          >
            {badge.tierTag}
          </span>
          <span className="font-mono text-[10px] font-semibold text-slate-200">
            {badge.engineLabel}
          </span>
          {badge.hasSecondaryVerifier && (
            <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-950/70 text-amber-300 border border-amber-700/50 font-mono text-[9px] font-semibold">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>2x</span>
            </span>
          )}
          {showEngineDetails ? (
            <ChevronUp className="w-3 h-3 text-slate-500" />
          ) : (
            <ChevronDown className="w-3 h-3 text-slate-500" />
          )}
        </button>
      </div>

      {/* Expandable Hardware Tier & Dual-Engine Telemetry Strip */}
      {showEngineDetails && (
        <div className="mb-3 p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/90 text-[10px] text-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-2 shadow-inner">
          <div className="flex items-start gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                Hardware Tier
              </div>
              <div className="font-mono text-slate-200 truncate">
                {activePlan ? activePlan.tierLabel : 'Tier 1 (Default)'}
              </div>
              <div className="font-mono text-[9px] text-slate-400 truncate">
                {badge.hardwareSummary}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-1.5">
            <Mic className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                Primary ASR & Model
              </div>
              <div className="font-mono text-slate-200 truncate">{badge.engineLabel}</div>
              <div className="font-mono text-[9px] text-slate-400 truncate">
                {badge.modelSummary}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                Semantic Verifier
              </div>
              <div className="font-mono text-slate-200 truncate">{badge.verifierLabel}</div>
              <div className="font-mono text-[9px] text-slate-400 truncate">
                {badge.verificationPolicy}
              </div>
            </div>
          </div>

          <div className="sm:col-span-3 pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[9px] text-slate-400 font-mono">
              ASR Diagnostics (raw tokens &amp; per-segment latency)
            </span>
            <button
              type="button"
              onClick={() => setShowDiagnostics((prev) => !prev)}
              className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold border transition-colors cursor-pointer ${
                showDiagnostics
                  ? 'bg-indigo-950/80 text-indigo-300 border-indigo-600/60'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {showDiagnostics ? 'Diagnostics: ON' : 'Diagnostics: OFF'}
            </button>
          </div>
        </div>
      )}

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
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                <span className="text-slate-400 font-mono text-[10px] flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {new Date(t.timestamp).toLocaleTimeString()}
                </span>
                {showDiagnostics && (
                  <div className="flex items-center space-x-2">
                    <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-400 font-mono text-[10px]">
                      <span>⚡ {t.latencyMs}ms</span>
                    </span>
                    <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-[10px]">
                      <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                      <span>{t.confidence !== null ? `${Math.round(t.confidence * 100)}%` : '—'}</span>
                    </span>
                  </div>
                )}
              </div>

              <p className="text-sm text-slate-100 font-serif leading-relaxed">
                "{highlightScriptureKeywords(t.rawText)}"
              </p>

              {showDiagnostics && t.tokens && t.tokens.length > 0 && (
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
});

LiveTranscriptPanel.displayName = 'LiveTranscriptPanel';
