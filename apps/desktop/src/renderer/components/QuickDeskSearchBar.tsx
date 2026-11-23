import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Song } from '@pulpit-ai/shared-types';
import { SongSearchResult } from '@pulpit-ai/song-engine';
import {
  Search,
  BookOpen,
  Music,
  Cast,
  Pin,
  X,
  ExternalLink,
  Play
} from 'lucide-react';
import {
  parseQuickScripture,
  getEasyWorshipCompletion,
  applyEasyWorshipSpaceStep
} from '../utils/quickScriptureParser.js';
import { usePresentationStore } from '../stores/presentationStore.js';
import { useAuthorityStore } from '../stores/authorityStore.js';

export type QuickSearchMode = 'bible' | 'songs';

interface QuickDeskSearchBarProps {
  mode: QuickSearchMode;
  onModeChange: (mode: QuickSearchMode) => void;
  focusSignal: number;
  disabled: boolean;
  onOpenBibleExplorer?: () => void;
  onOpenSongMatrix?: () => void;
}

export const QuickDeskSearchBar: React.FC<QuickDeskSearchBarProps> = ({
  mode,
  onModeChange,
  focusSignal,
  disabled,
  onOpenBibleExplorer,
  onOpenSongMatrix
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Bible live lookup state
  const activeTranslation = usePresentationStore((s) => s.activeTranslation);
  const directProjectScripture = usePresentationStore((s) => s.directProjectScripture);
  const pinScripture = usePresentationStore((s) => s.pinScripture);
  const dispatchCommand = useAuthorityStore((s) => s.dispatchCommand);

  const [versePreview, setVersePreview] = useState('');
  const [isLoadingVerse, setIsLoadingVerse] = useState(false);

  // Songs search state
  const [songResults, setSongResults] = useState<SongSearchResult[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [isSearchingSongs, setIsSearchingSongs] = useState(false);

  // Focus input whenever operator clicks [Bible] or [Songs]
  useEffect(() => {
    if (focusSignal > 0 && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      setIsDropdownOpen(true);
    }
  }, [focusSignal]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Preload song list when entering Songs mode
  useEffect(() => {
    if (mode !== 'songs' || allSongs.length > 0) return;
    if (typeof window !== 'undefined' && window.pulpitAPI?.listSongs) {
      window.pulpitAPI.listSongs().then((list) => setAllSongs(list || [])).catch(() => {});
    }
  }, [mode, allSongs.length]);

  const completion = useMemo(
    () => (mode === 'bible' ? getEasyWorshipCompletion(query) : null),
    [mode, query]
  );

  const parsedScripture = useMemo(
    () => (mode === 'bible' ? parseQuickScripture(query) : null),
    [mode, query]
  );

  // Fetch live Bible verse preview when reference is valid
  useEffect(() => {
    if (mode !== 'bible' || !parsedScripture?.isValid || !parsedScripture.bookName || !parsedScripture.chapter || !parsedScripture.verseStart) {
      setVersePreview('');
      setIsLoadingVerse(false);
      return;
    }

    let active = true;
    setIsLoadingVerse(true);

    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.pulpitAPI?.lookupPassage) {
        window.pulpitAPI
          .lookupPassage({
            translation: activeTranslation,
            book: parsedScripture.bookName!,
            chapter: parsedScripture.chapter!,
            verseStart: parsedScripture.verseStart!,
            verseEnd: parsedScripture.verseEnd
          })
          .then((res: any) => {
            if (!active) return;
            setIsLoadingVerse(false);
            setVersePreview(res?.found ? res.formattedText || res.fullText || '' : '');
          })
          .catch(() => {
            if (!active) return;
            setIsLoadingVerse(false);
            setVersePreview('');
          });
      } else {
        setIsLoadingVerse(false);
      }
    }, 90);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [mode, parsedScripture, activeTranslation]);

  // Search songs in Songs mode
  useEffect(() => {
    if (mode !== 'songs') return;
    if (!query.trim()) {
      setSongResults([]);
      setIsSearchingSongs(false);
      return;
    }

    let active = true;
    setIsSearchingSongs(true);
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.pulpitAPI?.searchSongs) {
        window.pulpitAPI
          .searchSongs(query.trim())
          .then((res) => {
            if (!active) return;
            setSongResults(res || []);
            setIsSearchingSongs(false);
          })
          .catch(() => {
            if (!active) return;
            setSongResults([]);
            setIsSearchingSongs(false);
          });
      } else {
        setIsSearchingSongs(false);
      }
    }, 100);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [mode, query]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (mode === 'bible') {
      // ArrowRight: complete ghost text if cursor is at the end
      if (e.key === 'ArrowRight' && completion?.ghostText) {
        const input = inputRef.current;
        if (input && input.selectionStart === query.length) {
          e.preventDefault();
          setQuery(query + completion.ghostText + ' ');
          setIsDropdownOpen(true);
          return;
        }
      }

      // EasyWorship progressive Spacebar / Tab autocomplete: Book -> Chapter -> Verse
      if (e.key === ' ' || e.key === 'Tab') {
        const nextVal = applyEasyWorshipSpaceStep(query);
        if (nextVal) {
          e.preventDefault();
          setQuery(nextVal);
          setIsDropdownOpen(true);
          return;
        } else if (e.key === 'Tab' && completion?.ghostText) {
          e.preventDefault();
          setQuery(query + completion.ghostText + ' ');
          setIsDropdownOpen(true);
          return;
        }
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (parsedScripture?.isValid && parsedScripture.referenceString && !disabled) {
          await directProjectScripture(parsedScripture.referenceString, versePreview || undefined);
          setQuery('');
          setIsDropdownOpen(false);
        } else if (completion?.matchedBook && completion.stage === 'book') {
          setQuery(`${completion.matchedBook.name} `);
          setIsDropdownOpen(true);
        } else if (completion?.suggestions && completion.suggestions.length > 0) {
          setQuery(`${completion.suggestions[0].name} `);
          setIsDropdownOpen(true);
        }
      }
    } else if (mode === 'songs' && e.key === 'Enter') {
      e.preventDefault();
      const topSong = songResults[0]?.song || matchedFallbackSongs[0];
      if (topSong && !disabled) {
        await handleProjectSong(topSong, 0);
      }
    }
  };

  const handleProjectSong = async (song: Song, sectionIndex = 0) => {
    const version = song.versions.find((v) => v.isDefault) || song.versions[0];
    const section = version?.sections[sectionIndex];
    await dispatchCommand('name_select_show', { name: song.canonicalTitle });
    if (section) {
      await dispatchCommand('index_select_slide', {
        index: sectionIndex,
        name: section.label,
        text: section.lines.join('\n')
      });
    }
    setQuery('');
    setIsDropdownOpen(false);
  };

  const matchedFallbackSongs = useMemo(() => {
    if (mode !== 'songs') return [];
    const q = query.trim().toLowerCase();
    if (!q) return allSongs.slice(0, 5);
    return allSongs
      .filter(
        (s) =>
          s.canonicalTitle.toLowerCase().includes(q) ||
          s.alternativeTitles?.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [mode, query, allSongs]);

  const displayedSongs = songResults.length > 0 ? songResults.slice(0, 6).map((r) => r.song) : matchedFallbackSongs;

  const placeholder =
    mode === 'bible'
      ? 'EasyWorship Bible: type book + Space + ch + Space + v...'
      : 'Search songs, hymn # or lyrics...';

  return (
    <div ref={containerRef} className="relative">
      {/* Compact Unified Search Input with Mode Pill */}
      <div
        className={`flex items-center rounded-xl bg-slate-950/90 border transition-all shadow-inner ${
          mode === 'bible'
            ? 'border-indigo-700/60 focus-within:border-indigo-400'
            : 'border-violet-700/60 focus-within:border-violet-400'
        }`}
      >
        {/* Active Search Mode Badge Toggle */}
        <button
          type="button"
          onClick={() => {
            onModeChange(mode === 'bible' ? 'songs' : 'bible');
            setQuery('');
            inputRef.current?.focus();
          }}
          title="Switch quick search between Bible and Songs"
          className={`flex items-center space-x-1 px-2 py-1.5 ml-1 rounded-lg text-[10px] font-bold flex-shrink-0 transition-colors ${
            mode === 'bible'
              ? 'bg-indigo-600/25 text-indigo-300 hover:bg-indigo-600/40'
              : 'bg-violet-600/25 text-violet-300 hover:bg-violet-600/40'
          }`}
        >
          {mode === 'bible' ? (
            <>
              <BookOpen className="w-3 h-3" />
              <span>Bible</span>
            </>
          ) : (
            <>
              <Music className="w-3 h-3" />
              <span>Songs</span>
            </>
          )}
        </button>

        {/* Input + EasyWorship Inline Ghost Autocomplete */}
        <div className="relative flex-1 min-w-0 flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-500 ml-2 flex-shrink-0" />
          <div className="relative flex-1 min-w-0">
            {mode === 'bible' && completion?.ghostText && query && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center px-2 text-xs font-medium whitespace-pre overflow-hidden"
              >
                <span className="invisible">{query}</span>
                <span className="text-indigo-400/50">{completion.ghostText}</span>
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full bg-transparent px-2 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none relative z-10"
            />
          </div>
        </div>

        {/* Clear or Full Modal Pop-out Button */}
        <div className="flex items-center pr-1.5 space-x-0.5 flex-shrink-0">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              title="Clear search"
              className="p-1 text-slate-500 hover:text-slate-200 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => (mode === 'bible' ? onOpenBibleExplorer?.() : onOpenSongMatrix?.())}
            title={mode === 'bible' ? 'Open Full 3-Column Bible Explorer [B]' : 'Open Full Songs Stanza Matrix [S]'}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* EasyWorship Autocomplete & Live Preview Popover */}
      {isDropdownOpen && (query.trim().length > 0 || (mode === 'songs' && displayedSongs.length > 0)) && (
        <div className="absolute left-0 right-0 mt-1.5 z-40 rounded-xl bg-slate-900/98 border border-slate-700/90 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
          {mode === 'bible' ? (
            <div className="p-2 space-y-1.5">
              {/* Stage Step Hint */}
              <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
                <span className="font-mono">
                  {parsedScripture?.isValid
                    ? `✓ Ready: ${parsedScripture.referenceString} (${activeTranslation}) — Press Enter to Project`
                    : completion?.stage === 'chapter' && completion.matchedBook
                      ? `${completion.matchedBook.name} (1–${completion.matchedBook.totalChapters} ch) → type chapter + Space`
                      : completion?.stage === 'verse' && completion.matchedBook
                        ? `Type verse # (e.g. 16 or 1-5) → Enter to project`
                        : completion?.matchedBook
                          ? `Press Tab / Space / → to complete: ${completion.matchedBook.name}`
                          : 'Type book letters → press Space to lock book'}
                </span>
                <span className="text-[9px] font-mono text-indigo-400">Space ↹ →</span>
              </div>

              {/* Book Matching Suggestions List */}
              {completion?.stage === 'book' && completion.suggestions.length > 0 && (
                <div className="space-y-0.5 max-h-40 overflow-y-auto">
                  {completion.suggestions.map((book, idx) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => {
                        setQuery(`${book.name} `);
                        inputRef.current?.focus();
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        idx === 0
                          ? 'bg-indigo-600/25 text-white border border-indigo-500/40 font-bold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span>{book.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {book.testament} • {book.totalChapters} ch
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Valid Scripture Preview & 1-Click Actions */}
              {parsedScripture?.isValid && parsedScripture.referenceString && (
                <div className="p-2.5 rounded-lg bg-slate-950/90 border border-indigo-500/40 space-y-2">
                  <div className="text-[11px] font-serif italic text-slate-200 leading-relaxed line-clamp-3">
                    {isLoadingVerse
                      ? 'Loading verse text...'
                      : versePreview || `"${parsedScripture.referenceString}" (${activeTranslation})`}
                  </div>
                  <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        pinScripture(parsedScripture.referenceString!, versePreview, true);
                        setQuery('');
                        setIsDropdownOpen(false);
                      }}
                      className="px-2 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/60 text-amber-200 text-[10px] font-bold flex items-center space-x-1 transition-all"
                    >
                      <Pin className="w-3 h-3" />
                      <span>Save Preset</span>
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={async () => {
                        await directProjectScripture(parsedScripture.referenceString!, versePreview || undefined);
                        setQuery('');
                        setIsDropdownOpen(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[10px] font-bold flex items-center space-x-1 shadow-sm transition-all"
                    >
                      <Cast className="w-3 h-3" />
                      <span>Project Live (Enter)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Bounds / Validation Error */}
              {parsedScripture && !parsedScripture.isValid && parsedScripture.error && completion?.stage !== 'book' && (
                <div className="px-2 py-1 text-[10px] text-amber-400 font-mono">
                  {parsedScripture.error}
                </div>
              )}
            </div>
          ) : (
            /* Songs Quick Search Dropdown */
            <div className="p-2 space-y-1 max-h-56 overflow-y-auto">
              <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
                <span>
                  {isSearchingSongs
                    ? 'Searching songs & hymnal...'
                    : `${displayedSongs.length} song match${displayedSongs.length === 1 ? '' : 'es'}`}
                </span>
                <span className="font-mono text-violet-400">Enter to project</span>
              </div>

              {displayedSongs.length === 0 ? (
                <div className="px-2 py-3 text-center text-[11px] text-slate-500">
                  No songs matched &quot;{query}&quot;
                </div>
              ) : (
                displayedSongs.map((song) => {
                  const defaultVer = song.versions.find((v) => v.isDefault) || song.versions[0];
                  return (
                    <div
                      key={song.id}
                      className="p-2 rounded-lg bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/80 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-100 truncate">{song.canonicalTitle}</div>
                          <div className="text-[10px] text-slate-500 truncate">{song.author || 'Traditional'}</div>
                        </div>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleProjectSong(song, 0)}
                          className="px-2 py-1 rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-[10px] font-bold flex items-center space-x-1 flex-shrink-0"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>Project</span>
                        </button>
                      </div>

                      {defaultVer && defaultVer.sections.length > 1 && (
                        <div className="flex flex-wrap gap-1">
                          {defaultVer.sections.slice(0, 5).map((sec, idx) => (
                            <button
                              key={sec.id}
                              type="button"
                              disabled={disabled}
                              onClick={() => handleProjectSong(song, idx)}
                              className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-violet-900/60 border border-slate-700 text-[9px] font-semibold text-slate-300 hover:text-white transition-colors"
                            >
                              {sec.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
