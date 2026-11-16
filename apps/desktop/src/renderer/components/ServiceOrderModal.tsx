import React, { useState, useEffect } from 'react';
import {
  X,
  ListOrdered,
  Radio,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  Music,
  Megaphone,
  CreditCard,
  Mic,
  HeartHandshake,
  RotateCcw,
  Play
} from 'lucide-react';

export interface LiturgyCueItem {
  id: string;
  orderIndex: number;
  title: string;
  subtitle: string;
  category: 'loop' | 'prayer' | 'worship' | 'announcement' | 'giving' | 'sermon' | 'ministry' | 'dismissal';
  showName?: string;
  scriptureReference?: string;
  durationMinutes?: number;
  status: 'pending' | 'active' | 'completed';
}

interface ServiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  cues: LiturgyCueItem[];
  activeCueIndex: number;
  onSelectCue: (index: number) => void;
  onAdvanceCue: () => void;
  onResetService: () => void;
  freeShowConnected: boolean;
  isLocked: boolean;
}

export const DEFAULT_SUNDAY_LITURGY: LiturgyCueItem[] = [
  {
    id: 'cue_preservice',
    orderIndex: 0,
    title: 'Pre-Service Welcome & Countdown',
    subtitle: 'Welcome to Church • Service beginning shortly',
    category: 'loop',
    showName: 'Pre-Service Loop',
    durationMinutes: 15,
    status: 'active'
  },
  {
    id: 'cue_call_to_worship',
    orderIndex: 1,
    title: 'Call to Worship & Scripture Reading',
    subtitle: 'Psalm 100: Enter His gates with thanksgiving',
    category: 'prayer',
    scriptureReference: 'Psalm 100:1-5',
    durationMinutes: 5,
    status: 'pending'
  },
  {
    id: 'cue_praise_worship',
    orderIndex: 2,
    title: 'Praise & Congregational Worship Set',
    subtitle: '10,000 Reasons • Blessed Assurance • Way Maker',
    category: 'worship',
    showName: 'Praise & Worship Set',
    durationMinutes: 25,
    status: 'pending'
  },
  {
    id: 'cue_announcements',
    orderIndex: 3,
    title: 'Weekly Church Announcements',
    subtitle: 'Midweek Bible Study • Youth Fellowship • Men & Women',
    category: 'announcement',
    showName: 'Weekly Announcements',
    durationMinutes: 8,
    status: 'pending'
  },
  {
    id: 'cue_tithes_giving',
    orderIndex: 4,
    title: 'Tithes & Kingdom Offering',
    subtitle: '2 Corinthians 9:7 • God loves a cheerful giver',
    category: 'giving',
    showName: 'Tithes & Offering Giving',
    durationMinutes: 7,
    status: 'pending'
  },
  {
    id: 'cue_sermon',
    orderIndex: 5,
    title: 'Pastoral Sermon & Word Ministration',
    subtitle: 'Series: Faith Unshakable • Speaker: Pastor David',
    category: 'sermon',
    showName: 'Sermon Deck - Faith Unshakable',
    durationMinutes: 40,
    status: 'pending'
  },
  {
    id: 'cue_altar_call',
    orderIndex: 6,
    title: 'Altar Call & Ministry Prayer',
    subtitle: 'Salvation, Dedication & Pastoral Healing Prayer',
    category: 'ministry',
    showName: 'Altar Call & Prayer',
    durationMinutes: 10,
    status: 'pending'
  },
  {
    id: 'cue_benediction',
    orderIndex: 7,
    title: 'Closing Hymn & Benediction Dismissal',
    subtitle: 'Numbers 6:24-26 • The Lord bless you and keep you',
    category: 'dismissal',
    scriptureReference: 'Numbers 6:24-26',
    durationMinutes: 5,
    status: 'pending'
  }
];

export const ServiceOrderModal: React.FC<ServiceOrderModalProps> = ({
  isOpen,
  onClose,
  cues = DEFAULT_SUNDAY_LITURGY,
  activeCueIndex,
  onSelectCue,
  onAdvanceCue,
  onResetService,
  freeShowConnected,
  isLocked
}) => {
  // Keyboard listener inside modal (Escape to close, Space / Enter to advance)
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

  const currentCue = cues[activeCueIndex] || cues[0];
  const nextCue = activeCueIndex < cues.length - 1 ? cues[activeCueIndex + 1] : null;

  const getCategoryIcon = (category: LiturgyCueItem['category']) => {
    switch (category) {
      case 'loop':
        return <Clock className="w-4 h-4 text-slate-400" />;
      case 'prayer':
        return <BookOpen className="w-4 h-4 text-indigo-400" />;
      case 'worship':
        return <Music className="w-4 h-4 text-purple-400" />;
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-amber-400" />;
      case 'giving':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'sermon':
        return <Mic className="w-4 h-4 text-cyan-400" />;
      case 'ministry':
        return <HeartHandshake className="w-4 h-4 text-rose-400" />;
      case 'dismissal':
        return <Sparkles className="w-4 h-4 text-indigo-400" />;
      default:
        return <ListOrdered className="w-4 h-4 text-slate-400" />;
    }
  };

  const getCategoryBadgeClass = (category: LiturgyCueItem['category']) => {
    switch (category) {
      case 'loop':
        return 'bg-slate-900 text-slate-300 border-slate-700';
      case 'prayer':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60';
      case 'worship':
        return 'bg-purple-950/80 text-purple-300 border-purple-700/60';
      case 'announcement':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
      case 'giving':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
      case 'sermon':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
      case 'ministry':
        return 'bg-rose-950/80 text-rose-300 border-rose-700/60';
      case 'dismissal':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#090d1a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-sm">
              <ListOrdered className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Service Order Run-Sheet & Liturgy Sequencer
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 border border-amber-800/60 text-amber-300 font-semibold">
                  O
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                1-click Sunday service liturgy pacing & automated cue progression
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Service Order [Esc]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Master Pacer Bar */}
        <div className="px-5 py-3.5 border-b border-slate-800/90 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400 font-medium">Currently Live:</span>
              <span className="font-bold text-emerald-400 flex items-center space-x-1">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>
                  #{activeCueIndex + 1} {currentCue.title}
                </span>
              </span>
            </div>

            {nextCue && (
              <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400">
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-slate-500">Next Up:</span>
                <span className="font-semibold text-slate-300">{nextCue.title}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={!freeShowConnected || isLocked || activeCueIndex >= cues.length - 1}
              onClick={onAdvanceCue}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-40 text-xs font-bold text-white transition-all shadow-md shadow-emerald-900/40 flex items-center space-x-1.5 active:scale-95"
            >
              <span>Advance to Next Cue</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onResetService}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-all"
              title="Reset service run-sheet to Cue 1"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Liturgy Run-Sheet Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar space-y-2.5 min-h-[300px]">
          {cues.map((cue, idx) => {
            const isLive = idx === activeCueIndex;
            const isPast = idx < activeCueIndex;
            const naturalNum = idx + 1;

            return (
              <div
                key={cue.id}
                onClick={() => {
                  if (freeShowConnected && !isLocked) {
                    onSelectCue(idx);
                  }
                }}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none shadow-sm ${
                  isLive
                    ? 'bg-emerald-950/40 border-emerald-500/80 ring-2 ring-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : isPast
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-70 hover:opacity-100 hover:bg-slate-850'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                } ${!freeShowConnected || isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  {/* Sequence Order Badge */}
                  <div
                    className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center flex-shrink-0 border ${
                      isLive
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-sm'
                        : isPast
                        ? 'bg-slate-950 text-slate-500 border-slate-800'
                        : 'bg-slate-900 text-slate-300 border-slate-700'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : naturalNum}
                  </div>

                  {/* Icon */}
                  <div className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0">
                    {getCategoryIcon(cue.category)}
                  </div>

                  {/* Title & Metadata */}
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                      <h4
                        className={`text-xs sm:text-sm font-bold tracking-tight truncate ${
                          isLive ? 'text-white' : 'text-slate-200'
                        }`}
                      >
                        {cue.title}
                      </h4>

                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getCategoryBadgeClass(
                          cue.category
                        )}`}
                      >
                        {cue.category}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{cue.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0">
                  {cue.durationMinutes && (
                    <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                      ~{cue.durationMinutes} min
                    </span>
                  )}

                  {isLive ? (
                    <span className="flex items-center space-x-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500 animate-pulse">
                      <Radio className="w-3 h-3 text-emerald-400" />
                      <span>LIVE</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!freeShowConnected || isLocked}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center space-x-1 opacity-0 group-hover:opacity-100"
                    >
                      <span>Jump</span>
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Sunday Morning Service Liturgy • {cues.length} Cues Sequenced</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition-all"
          >
            Close (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
