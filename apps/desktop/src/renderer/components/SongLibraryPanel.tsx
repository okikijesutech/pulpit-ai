import React, { useState, useEffect } from 'react';
import { Song, SongSection } from '@pulpit-ai/shared-types';
import { SongSearchResult, StagedImportSong } from '@pulpit-ai/song-engine';
import {
  Search,
  Plus,
  AlertTriangle,
  Play,
  X,
  Music
} from 'lucide-react';
import { SongImportModal, SongImportTab } from './SongImportModal.js';

interface SongLibraryPanelProps {
  freeShowConnected: boolean;
  manualLockActive: boolean;
}

export const SongLibraryPanel: React.FC<SongLibraryPanelProps> = ({
  freeShowConnected,
  manualLockActive
}) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchResults, setSearchResults] = useState<SongSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);

  // Staged Imports & Modal State
  const [stagedList, setStagedList] = useState<StagedImportSong[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<SongImportTab>('upload');

  // Feedback on projection
  const [projectingSectionId, setProjectingSectionId] = useState<string | null>(null);
  const [projectionFeedback, setProjectionFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadSongs();
    loadStaged();
  }, []);

  const loadSongs = async () => {
    if (window.pulpitAPI) {
      try {
        const list = await window.pulpitAPI.listSongs();
        setSongs(list);
        if (list.length > 0 && !selectedSongId) {
          setSelectedSongId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load songs:', err);
      }
    }
  };

  const loadStaged = async () => {
    if (window.pulpitAPI) {
      try {
        const staged = await window.pulpitAPI.listStagedImports();
        setStagedList(staged);
      } catch (err) {
        console.error('Failed to load staged imports:', err);
      }
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    if (window.pulpitAPI) {
      try {
        const results = await window.pulpitAPI.searchSongs(query);
        setSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
      }
    }
  };

  const selectedSong = songs.find((s) => s.id === selectedSongId) || songs[0] || null;
  const currentVersion = selectedSong?.versions[selectedVersionIndex] || selectedSong?.versions[0];

  const handleProjectSection = async (section: SongSection, idx: number) => {
    if (!selectedSong) return;
    if (!freeShowConnected) {
      setProjectionFeedback('Cannot project: FreeShow disconnected');
      setTimeout(() => setProjectionFeedback(null), 3000);
      return;
    }

    setProjectingSectionId(section.id);
    try {
      const res = await window.pulpitAPI.projectSongSection(
        selectedSong.canonicalTitle,
        section.label,
        idx
      );
      if (res.success) {
        setProjectionFeedback(`Projecting: ${selectedSong.canonicalTitle} — ${section.label}`);
      } else {
        setProjectionFeedback(`Error: ${res.reason || 'Projection rejected'}`);
      }
    } catch (err: any) {
      setProjectionFeedback(`Error: ${err.message}`);
    } finally {
      setTimeout(() => setProjectingSectionId(null), 1500);
      setTimeout(() => setProjectionFeedback(null), 4000);
    }
  };

  const displayedSongs = searchQuery.trim()
    ? songs.filter((s) =>
        searchResults.length > 0
          ? searchResults.some((r) => r.song.id === s.id)
          : s.canonicalTitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : songs;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 text-slate-100 p-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Song Library & Hymnal
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {songs.length} Songs Available
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Verified relational song catalog, multi-version arrangements, and universal file importer.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {stagedList.length > 0 && (
            <button
              onClick={() => {
                setImportTab('staged');
                setShowImportModal(true);
              }}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-600/30 transition-all animate-pulse"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>{stagedList.length} In Quarantine Review</span>
            </button>
          )}

          <button
            onClick={() => {
              setImportTab('upload');
              setShowImportModal(true);
            }}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Import Songs</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 pt-4">
        {/* Left List Panel (4 cols) */}
        <div className="col-span-4 flex flex-col min-h-0 bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/90">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search songs by title, lyrics, author..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Song Item List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
            {displayedSongs.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No songs matching "{searchQuery}"
              </div>
            ) : (
              displayedSongs.map((song) => {
                const isSelected = song.id === selectedSong?.id;
                const matchInfo = searchResults.find((r) => r.song.id === song.id);

                return (
                  <div
                    key={song.id}
                    onClick={() => {
                      setSelectedSongId(song.id);
                      setSelectedVersionIndex(0);
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border border-indigo-500/50 shadow-md'
                        : 'hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-xs text-slate-100">{song.canonicalTitle}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {song.versions.length} ver
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                      <span>{song.author || 'Traditional'}</span>
                      <span>•</span>
                      <span className="truncate">{song.license || 'Public Domain'}</span>
                    </div>

                    {matchInfo && matchInfo.matchedLyrics.length > 0 && (
                      <div className="mt-2 text-[10px] bg-slate-950/80 p-1.5 rounded border border-indigo-900/40 text-indigo-300 font-mono italic">
                        "{matchInfo.matchedLyrics[0].line}"
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Details & Projection Panel (8 cols) */}
        <div className="col-span-8 flex flex-col min-h-0 bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {selectedSong ? (
            <>
              {/* Song Header & Metadata */}
              <div className="p-5 border-b border-slate-800 bg-slate-900/80">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {selectedSong.canonicalTitle}
                    </h2>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>Author: <strong className="text-slate-200">{selectedSong.author || 'Unknown'}</strong></span>
                      <span>•</span>
                      <span>License: <strong className="text-emerald-400">{selectedSong.license || 'Public Domain'}</strong></span>
                      {selectedSong.ccliNumber && (
                        <>
                          <span>•</span>
                          <span>CCLI: <strong className="text-indigo-400">#{selectedSong.ccliNumber}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  {projectionFeedback && (
                    <div className="px-3 py-1 rounded bg-indigo-950 border border-indigo-500/40 text-xs text-indigo-300 font-medium animate-fade-in">
                      {projectionFeedback}
                    </div>
                  )}
                </div>

                {/* Arrangement / Version Selector */}
                {selectedSong.versions.length > 1 && (
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
                    <span className="text-xs text-slate-400 font-medium">Arrangement:</span>
                    <div className="flex gap-1.5">
                      {selectedSong.versions.map((ver, idx) => (
                        <button
                          key={ver.id}
                          onClick={() => setSelectedVersionIndex(idx)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                            idx === selectedVersionIndex
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {ver.versionName} {ver.isDefault && '(Default)'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sections / Lyrics Grid */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {currentVersion?.sections.map((section, idx) => {
                    const isChorus = section.type === 'chorus';
                    const isBridge = section.type === 'bridge';
                    const isProjecting = projectingSectionId === section.id;

                    return (
                      <div
                        key={section.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                          isChorus
                            ? 'bg-purple-950/20 border-purple-800/40 hover:border-purple-600/60'
                            : isBridge
                            ? 'bg-emerald-950/20 border-emerald-800/40 hover:border-emerald-600/60'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60">
                            <span
                              className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                isChorus
                                  ? 'bg-purple-900/60 text-purple-300'
                                  : isBridge
                                  ? 'bg-emerald-900/60 text-emerald-300'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {section.label}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Slide #{idx + 1}
                            </span>
                          </div>

                          <div className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                            {section.lines.join('\n')}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800/50 flex justify-end">
                          <button
                            onClick={() => handleProjectSection(section, idx)}
                            disabled={!freeShowConnected || manualLockActive}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              isProjecting
                                ? 'bg-emerald-600 text-white animate-pulse'
                                : !freeShowConnected || manualLockActive
                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                            }`}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{isProjecting ? 'Projecting...' : 'Project Section'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Music className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-sm font-medium">Select a song from the library to view lyrics and project sections.</p>
            </div>
          )}
        </div>
      </div>

      {/* Extracted Import & Quarantine Review Modal */}
      <SongImportModal
        isOpen={showImportModal}
        initialTab={importTab}
        stagedList={stagedList}
        onClose={() => setShowImportModal(false)}
        onRefreshLibrary={loadSongs}
        onRefreshStaged={loadStaged}
        onSongPromoted={(songId) => {
          setSelectedSongId(songId);
          setSelectedVersionIndex(0);
        }}
      />
    </div>
  );
};
