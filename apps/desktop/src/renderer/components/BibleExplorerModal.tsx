import React, { useState, useEffect } from 'react';
import { CANON_BOOKS, CanonBook } from '@pulpit-ai/shared-types';
import { BookOpen, Search, X, Cast, Sparkles } from 'lucide-react';
import { parseQuickScripture } from '../utils/quickScriptureParser.js';

interface BibleExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTranslation: string;
  onSelectTranslation?: (translationId: string) => void;
  onDirectProject: (reference: string, fullText?: string) => void;
  onQueueSuggestion: (reference: string, previewText: string, attribution: string) => void;
  freeShowConnected: boolean;
  isLocked: boolean;
}

export const BibleExplorerModal: React.FC<BibleExplorerModalProps> = ({
  isOpen,
  onClose,
  activeTranslation,
  onSelectTranslation,
  onDirectProject,
  onQueueSuggestion,
  freeShowConnected,
  isLocked: _isLocked
}) => {
  const [selectedBook, setSelectedBook] = useState<CanonBook>(
    CANON_BOOKS.find((b) => b.name === 'Romans') || CANON_BOOKS[0]
  );
  const [selectedChapter, setSelectedChapter] = useState<number>(10);
  const [verseStart, setVerseStart] = useState<number>(1);
  const [verseEnd, setVerseEnd] = useState<number | undefined>(undefined);
  const [testamentFilter, setTestamentFilter] = useState<'ALL' | 'OT' | 'NT'>('ALL');
  const [bookSearch, setBookSearch] = useState<string>('');
  const [previewText, setPreviewText] = useState<string>('');
  const [attribution, setAttribution] = useState<string>('');
  const [isLoadingPassage, setIsLoadingPassage] = useState<boolean>(false);

  // Filter books by search and testament
  const filteredBooks = CANON_BOOKS.filter((b) => {
    const matchesTestament =
      testamentFilter === 'ALL' || b.testament === testamentFilter;
    const matchesSearch =
      bookSearch.trim() === '' ||
      b.name.toLowerCase().includes(bookSearch.toLowerCase()) ||
      b.aliases.some((a) => a.toLowerCase().includes(bookSearch.toLowerCase()));
    return matchesTestament && matchesSearch;
  });

  const maxVerses = selectedBook.versesPerChapter[selectedChapter - 1] || 1;

  // Whenever selection or translation changes, fetch live passage preview
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingPassage(true);

    if (window.pulpitAPI) {
      window.pulpitAPI
        .lookupPassage({
          translation: activeTranslation,
          book: selectedBook.name,
          chapter: selectedChapter,
          verseStart: verseStart,
          verseEnd: verseEnd
        })
        .then((res: any) => {
          if (!isMounted) return;
          setIsLoadingPassage(false);
          if (res && res.found) {
            setPreviewText(res.formattedText || res.fullText || '');
            setAttribution(res.attribution || `${selectedBook.name} ${selectedChapter}:${verseStart} (${activeTranslation})`);
          } else {
            setPreviewText(`"${selectedBook.name} ${selectedChapter}:${verseStart}" in ${activeTranslation}`);
            setAttribution(`${selectedBook.name} ${selectedChapter}:${verseStart} (${activeTranslation})`);
          }
        })
        .catch((err: unknown) => {
          if (!isMounted) return;
          setIsLoadingPassage(false);
          const msg = err instanceof Error ? err.message : String(err);
          setPreviewText(`Error loading passage: ${msg}`);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedBook, selectedChapter, verseStart, verseEnd, activeTranslation]);

  if (!isOpen) return null;

  const currentRefString =
    verseEnd && verseEnd > verseStart
      ? `${selectedBook.name} ${selectedChapter}:${verseStart}-${verseEnd}`
      : `${selectedBook.name} ${selectedChapter}:${verseStart}`;

  const handleSelectBook = (book: CanonBook) => {
    setSelectedBook(book);
    setSelectedChapter(1);
    setVerseStart(1);
    setVerseEnd(undefined);
  };

  const handleSelectChapter = (ch: number) => {
    setSelectedChapter(ch);
    setVerseStart(1);
    setVerseEnd(undefined);
  };

  const handleProjectNow = () => {
    onDirectProject(currentRefString, previewText);
    onClose();
  };

  const handleQueueSuggestion = () => {
    onQueueSuggestion(currentRefString, previewText, attribution);
    onClose();
  };

  const handleSearchChange = (val: string) => {
    setBookSearch(val);
    const parsed = parseQuickScripture(val);
    if (parsed.isValid && parsed.book && parsed.chapter && parsed.verseStart) {
      setSelectedBook(parsed.book);
      setSelectedChapter(parsed.chapter);
      setVerseStart(parsed.verseStart);
      setVerseEnd(parsed.verseEnd);
    }
  };

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && freeShowConnected && !isLoadingPassage) {
      e.preventDefault();
      handleProjectNow();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      onKeyDown={handleModalKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="glass-panel w-full max-w-4xl max-h-[92vh] rounded-2xl flex flex-col shadow-2xl border border-slate-700/80 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-sm">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide uppercase text-white flex items-center gap-2">
                <span>Manual Scripture Explorer</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-mono">
                  Offline Canon
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Browse any chapter or verse and project directly to sanctuary screens.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Translation Picker */}
            <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Translation:</span>
              <select
                value={activeTranslation}
                onChange={(e) => onSelectTranslation?.(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer"
              >
                <option value="WEB" className="bg-slate-900 text-slate-100">WEB</option>
                <option value="KJV" className="bg-slate-900 text-slate-100">KJV</option>
              </select>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: 3 Step Picker Grid */}
        <div className="flex-1 overflow-hidden grid grid-cols-12 min-h-0 bg-slate-950/60">
          {/* Step 1: Books (5 cols) */}
          <div className="col-span-12 md:col-span-5 border-r border-slate-800/80 flex flex-col p-3 min-h-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <span>1. Select Book</span>
                <span className="text-[10px] text-indigo-400 font-mono">({filteredBooks.length})</span>
              </span>

              {/* Testament Filter Pills */}
              <div className="flex bg-slate-900 p-0.5 rounded-md border border-slate-800 text-[10px] font-semibold">
                <button
                  onClick={() => setTestamentFilter('ALL')}
                  className={`px-1.5 py-0.5 rounded ${testamentFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setTestamentFilter('OT')}
                  className={`px-1.5 py-0.5 rounded ${testamentFilter === 'OT' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  OT
                </button>
                <button
                  onClick={() => setTestamentFilter('NT')}
                  className={`px-1.5 py-0.5 rounded ${testamentFilter === 'NT' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  NT
                </button>
              </div>
            </div>

            {/* Book / Reference Search Bar */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={bookSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Jump to verse (e.g. rom 10 1, John 3:16)..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Books List Grid */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1">
              {filteredBooks.map((b) => {
                const isSelected = selectedBook.id === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => handleSelectBook(b)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/40'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{b.name}</span>
                    <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-indigo-800 text-indigo-200' : 'text-slate-500'}`}>
                      {b.testament} • {b.totalChapters}ch
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Chapter & Verse Selector (3 cols) */}
          <div className="col-span-12 md:col-span-3 border-r border-slate-800/80 flex flex-col p-3 min-h-0">
            {/* Chapters */}
            <div className="flex-1 flex flex-col min-h-0 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                2. Chapter ({selectedBook.totalChapters})
              </span>
              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-4 gap-1.5 auto-rows-max">
                {Array.from({ length: selectedBook.totalChapters }, (_, i) => i + 1).map((ch) => {
                  const isChSelected = selectedChapter === ch;
                  return (
                    <button
                      key={ch}
                      onClick={() => handleSelectChapter(ch)}
                      className={`h-8 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center ${
                        isChSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Verses */}
            <div className="h-44 flex flex-col min-h-0 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  3. Verse ({maxVerses})
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {selectedBook.name} {selectedChapter}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-4 gap-1.5 auto-rows-max">
                {Array.from({ length: maxVerses }, (_, i) => i + 1).map((v) => {
                  const isVerseSelected = verseStart === v && !verseEnd;
                  return (
                    <button
                      key={v}
                      onClick={() => {
                        setVerseStart(v);
                        setVerseEnd(undefined);
                      }}
                      className={`h-8 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center ${
                        isVerseSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step 3: Real-Time Preview & Action Controls (4 cols) */}
          <div className="col-span-12 md:col-span-4 flex flex-col p-4 justify-between bg-slate-900/40">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Selected Reference
                </span>
                <span className="text-xs font-bold text-indigo-400 font-mono px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/60">
                  {currentRefString}
                </span>
              </div>

              {/* Passage Preview Canvas */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 min-h-[160px] max-h-[220px] overflow-y-auto shadow-inner relative">
                {isLoadingPassage ? (
                  <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                    Loading verified passage...
                  </div>
                ) : (
                  <>
                    <p className="text-xs sm:text-sm font-serif text-slate-100 italic leading-relaxed whitespace-pre-line">
                      "{previewText}"
                    </p>
                    {attribution && (
                      <p className="mt-2 text-[10px] text-indigo-400 font-mono font-semibold">
                        {attribution}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Launch Actions */}
            <div className="space-y-2 pt-3 border-t border-slate-800/80">
              <button
                disabled={!freeShowConnected || isLoadingPassage}
                onClick={handleProjectNow}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-white transition-all shadow-lg shadow-indigo-900/40 flex items-center justify-center space-x-2 active:scale-95"
              >
                <Cast className="w-4 h-4" />
                <span>Project to Screen Now</span>
              </button>

              <button
                disabled={isLoadingPassage}
                onClick={handleQueueSuggestion}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center justify-center space-x-2 active:scale-95 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Queue as Suggested Card</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
