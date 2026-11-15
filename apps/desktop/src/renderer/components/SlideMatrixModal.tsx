import React, { useState, useEffect } from 'react';
import {
  X,
  LayoutGrid,
  Radio,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Image as ImageIcon,
  Snowflake,
  Search,
  Sparkles
} from 'lucide-react';

export interface SlideItem {
  index: number;
  label?: string;
  previewText?: string;
  category?: 'welcome' | 'scripture' | 'point' | 'media' | 'closing';
}

interface SlideMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSlideIndex: number;
  totalSlides?: number;
  slides?: SlideItem[];
  showTitle?: string;
  onSelectSlide: (index: number) => void;
  onFreezeOutput?: () => void;
  onShowLogo?: () => void;
  onBlackout?: () => void;
  freeShowConnected: boolean;
  isLocked: boolean;
}

// Default sermon / worship presentation deck slides (1-24)
const DEFAULT_SLIDES: SlideItem[] = [
  { index: 0, label: 'Welcome & Pre-Service Loop', previewText: 'Welcome to Sanctuary Worship • Service starting shortly', category: 'welcome' },
  { index: 1, label: 'Opening Call to Worship', previewText: 'Psalm 100: Enter His gates with thanksgiving and praise', category: 'scripture' },
  { index: 2, label: 'Praise & Worship Set', previewText: 'Song 1: 10,000 Reasons (Bless the Lord Oh My Soul)', category: 'media' },
  { index: 3, label: 'Sermon Bumper Video', previewText: '[Video: Series Title - Walking in Grace and Truth]', category: 'media' },
  { index: 4, label: 'Sermon Title & Theme', previewText: 'Series: Faith Unshakable • Speaker: Pastor David', category: 'welcome' },
  { index: 5, label: 'Foundational Scripture', previewText: 'Romans 8:28 • And we know that for those who love God...', category: 'scripture' },
  { index: 6, label: 'Point 1: The Promise', previewText: 'God works all things together for the good of believers', category: 'point' },
  { index: 7, label: 'Supporting Scripture', previewText: 'Jeremiah 29:11 • For I know the plans I have for you...', category: 'scripture' },
  { index: 8, label: 'Point 2: The Process', previewText: 'Faith is refined through trials and endurance', category: 'point' },
  { index: 9, label: 'Illustration / Quote', previewText: '"Faith does not make things easy, it makes them possible."', category: 'point' },
  { index: 10, label: 'Scripture Reference', previewText: 'Hebrews 11:1 • Now faith is the assurance of things hoped for', category: 'scripture' },
  { index: 11, label: 'Point 3: The Purpose', previewText: 'We are called according to His divine purpose and glory', category: 'point' },
  { index: 12, label: 'Practical Application', previewText: '1. Pray daily  2. Meditate on Scripture  3. Walk in love', category: 'point' },
  { index: 13, label: 'Pastoral Prayer & Altar Call', previewText: 'Come forward for prayer and salvation commitment', category: 'welcome' },
  { index: 14, label: 'Tithes & Offering Giving', previewText: '2 Corinthians 9:7 • God loves a cheerful giver', category: 'welcome' },
  { index: 15, label: 'Weekly Church Announcements', previewText: 'Wednesday Midweek Bible Study • Youth Group Friday 7pm', category: 'media' },
  { index: 16, label: 'Closing Hymn', previewText: 'Great Is Thy Faithfulness • O God My Father', category: 'media' },
  { index: 17, label: 'Benediction & Dismissal', previewText: 'The Lord bless you and keep you • Numbers 6:24-26', category: 'closing' },
  { index: 18, label: 'Post-Service Fellowship', previewText: 'Join us in the foyer for tea and fellowship', category: 'closing' },
  { index: 19, label: 'Emergency Backup Slide 1', previewText: 'Pulpit Reference Scripture Placeholder', category: 'scripture' },
  { index: 20, label: 'Emergency Backup Slide 2', previewText: 'Pulpit Reference Scripture Placeholder', category: 'scripture' }
];

export const SlideMatrixModal: React.FC<SlideMatrixModalProps> = ({
  isOpen,
  onClose,
  currentSlideIndex,
  slides = DEFAULT_SLIDES,
  showTitle = 'Active Presentation Deck',
  onSelectSlide,
  onFreezeOutput,
  onShowLogo,
  onBlackout,
  freeShowConnected,
  isLocked
}) => {
  const [jumpInput, setJumpInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFrozen, setIsFrozen] = useState<boolean>(false);

  // Focus trap / keyboard handler inside modal
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

  const handleDirectJump = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpInput.trim(), 10);
    if (!isNaN(parsed)) {
      // Allow 1-based indexing if user enters natural number 1..N
      const zeroBasedIndex = parsed > 0 ? parsed - 1 : parsed;
      onSelectSlide(zeroBasedIndex);
      setJumpInput('');
      onClose();
    }
  };

  const filteredSlides = slides.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const labelMatch = s.label?.toLowerCase().includes(q);
    const textMatch = s.previewText?.toLowerCase().includes(q);
    const numMatch = (s.index + 1).toString() === q || s.index.toString() === q;
    return labelMatch || textMatch || numMatch;
  });

  const handleSlideClick = (index: number) => {
    if (!freeShowConnected || isLocked) return;
    onSelectSlide(index);
    onClose();
  };

  const handleToggleFreeze = () => {
    setIsFrozen((prev) => !prev);
    onFreezeOutput?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#090d1a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-sm">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Slide Matrix & Direct Jump Navigator
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800/60 text-indigo-300 font-semibold">
                  M
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                1-click instant stage slide jump • Show: <strong className="text-slate-200">{showTitle}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px]">Live Slide:</span>
              <span className="font-mono font-bold text-indigo-400">
                #{currentSlideIndex + 1} ({currentSlideIndex})
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Matrix [Esc]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Toolbar: Jump Input, Search, First/Last Buttons */}
        <div className="px-5 py-3 border-b border-slate-800/90 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
          {/* Quick Jump Numerical Input */}
          <form onSubmit={handleDirectJump} className="flex items-center space-x-2">
            <label htmlFor="slide-jump-input" className="text-xs font-semibold text-slate-300 whitespace-nowrap">
              Jump to Slide #:
            </label>
            <div className="relative">
              <input
                id="slide-jump-input"
                type="number"
                min="1"
                max={slides.length}
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                placeholder={`1 - ${slides.length}`}
                className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center"
              />
            </div>
            <button
              type="submit"
              disabled={!jumpInput.trim() || !freeShowConnected || isLocked}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-white transition-all shadow-sm flex items-center space-x-1 active:scale-95"
            >
              <span>Jump</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Search Filter */}
          <div className="flex-1 max-w-xs relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, scripture, or text..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition-all"
            />
          </div>

          {/* Stepper & Boundary Buttons */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={!freeShowConnected || isLocked}
              onClick={() => onSelectSlide(0)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-xs text-slate-300 font-semibold transition-all"
              title="Jump to first slide (#1)"
            >
              First (#1)
            </button>
            <button
              type="button"
              disabled={!freeShowConnected || isLocked || currentSlideIndex <= 0}
              onClick={() => onSelectSlide(Math.max(0, currentSlideIndex - 1))}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 disabled:opacity-40 text-slate-300 transition-all"
              title="Previous Slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!freeShowConnected || isLocked || currentSlideIndex >= slides.length - 1}
              onClick={() => onSelectSlide(Math.min(slides.length - 1, currentSlideIndex + 1))}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 disabled:opacity-40 text-slate-300 transition-all"
              title="Next Slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!freeShowConnected || isLocked}
              onClick={() => onSelectSlide(slides.length - 1)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-xs text-slate-300 font-semibold transition-all"
              title={`Jump to last slide (#${slides.length})`}
            >
              Last (#{slides.length})
            </button>
          </div>
        </div>

        {/* Matrix Grid Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar min-h-[300px]">
          {filteredSlides.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Search className="w-8 h-8 mb-2 opacity-40 text-indigo-400" />
              <p className="text-xs font-semibold text-slate-400">No slides matched your search</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Try searching for a different keyword or slide number</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredSlides.map((slide) => {
                const isLive = slide.index === currentSlideIndex;
                const isPast = slide.index < currentSlideIndex;
                const naturalNumber = slide.index + 1;

                return (
                  <button
                    key={slide.index}
                    onClick={() => handleSlideClick(slide.index)}
                    disabled={!freeShowConnected || isLocked}
                    className={`group relative text-left p-3 rounded-xl border transition-all flex flex-col justify-between min-h-[110px] cursor-pointer shadow-sm ${
                      isLive
                        ? 'bg-indigo-950/90 border-emerald-500/90 ring-2 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                        : isPast
                        ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850'
                        : 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/70 hover:bg-slate-850 hover:shadow-md'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {/* Top Row: Slide Number Badge & Live Tag */}
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          isLive
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-600/70'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        #{naturalNumber}
                      </span>

                      {isLive ? (
                        <span className="flex items-center space-x-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/70 animate-pulse">
                          <Radio className="w-2.5 h-2.5 text-emerald-400" />
                          <span>LIVE</span>
                        </span>
                      ) : isPast ? (
                        <span className="text-[9px] text-slate-500 font-mono">PAST</span>
                      ) : (
                        <span className="text-[9px] text-slate-600 font-mono group-hover:text-indigo-300 transition-colors">
                          JUMP
                        </span>
                      )}
                    </div>

                    {/* Label & Content Preview */}
                    <div className="flex-1 flex flex-col justify-center my-1">
                      <h4
                        className={`text-xs font-semibold line-clamp-1 transition-colors ${
                          isLive
                            ? 'text-white'
                            : 'text-slate-300 group-hover:text-indigo-200'
                        }`}
                      >
                        {slide.label || `Slide ${naturalNumber}`}
                      </h4>
                      {slide.previewText && (
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-snug font-serif italic">
                          "{slide.previewText}"
                        </p>
                      )}
                    </div>

                    {/* Category Pill / Footer */}
                    <div className="mt-1 flex items-center justify-between pt-1 border-t border-slate-800/50 text-[9px]">
                      <span className="capitalize text-slate-500 font-medium">
                        {slide.category || 'slide'}
                      </span>
                      <span className="opacity-0 group-hover:opacity-100 text-indigo-400 font-semibold transition-opacity flex items-center space-x-0.5">
                        <span>Project</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Emergency / Quick Scenes Bar */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              {slides.length} slides loaded • Click any cell to project immediately
            </span>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Freeze Output Button */}
            {onFreezeOutput && (
              <button
                type="button"
                disabled={!freeShowConnected || isLocked}
                onClick={handleToggleFreeze}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm active:scale-95 ${
                  isFrozen
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-200 ring-2 ring-cyan-500/40'
                    : 'bg-slate-900 hover:bg-slate-850 border-slate-700 text-cyan-300 hover:text-white'
                }`}
                title="Freeze Sanctuary Projector feed (retains last frame while navigating)"
              >
                <Snowflake className={`w-3.5 h-3.5 text-cyan-400 ${isFrozen ? 'animate-spin' : ''}`} />
                <span>{isFrozen ? 'Output Frozen' : 'Freeze Output'}</span>
              </button>
            )}

            {/* Church Logo Button */}
            {onShowLogo && (
              <button
                type="button"
                disabled={!freeShowConnected || isLocked}
                onClick={() => {
                  onShowLogo();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 hover:text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm active:scale-95"
                title="Display Sanctuary Church Brand/Logo Screen"
              >
                <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Church Logo</span>
              </button>
            )}

            {/* Blackout Button */}
            {onBlackout && (
              <button
                type="button"
                disabled={!freeShowConnected}
                onClick={() => {
                  onBlackout();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-200 hover:text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm active:scale-95"
                title="Blackout Projector Screen [Esc]"
              >
                <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Blackout Screen</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition-all"
            >
              Close (Esc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
