import React, { useState, useEffect } from 'react';
import { Song, SongSection } from '@pulpit-ai/shared-types';
import { SongSearchResult, StagedImportSong, ApprovalOptions } from '@pulpit-ai/song-engine';
import {
  Search,
  Plus,
  UploadCloud,
  Layers,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Eye,
  ShieldCheck,
  FileText,
  Play,
  X,
  Music,
  Check
} from 'lucide-react';

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

  // Staged Imports & Review
  const [stagedList, setStagedList] = useState<StagedImportSong[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<'upload' | 'paste' | 'staged'>('upload');
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteLyrics, setPasteLyrics] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Selected Staged Item for Review
  const [reviewingStagedId, setReviewingStagedId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'create_new' | 'add_as_version' | 'replace'>('create_new');
  const [reviewVersionName, setReviewVersionName] = useState('');
  const [reviewRightsConfirmed, setReviewRightsConfirmed] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

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
        if (staged.length > 0 && !reviewingStagedId) {
          setReviewingStagedId(staged[0].id);
          // Set initial recommendation
          const rec = staged[0].duplicateCheck.recommendation;
          setReviewAction(rec === 'reject' ? 'replace' : rec);
        }
      } catch (err) {
        console.error('Failed to load staged imports:', err);
      }
    }
  };

  // Search handler
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

  // Selected song object
  const selectedSong = songs.find((s) => s.id === selectedSongId) || songs[0] || null;
  const currentVersion = selectedSong?.versions[selectedVersionIndex] || selectedSong?.versions[0];

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setImportError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1] || '';
        const res = await window.pulpitAPI.stageSongFile({ name: file.name, base64 });
        setIsProcessingFile(false);

        if (!res.success) {
          setImportError(res.errors?.join('; ') || 'Import failed.');
          return;
        }

        await loadStaged();
        setImportTab('staged');
        if (res.staged && res.staged.length > 0) {
          setReviewingStagedId(res.staged[0].id);
          const rec = res.staged[0].duplicateCheck.recommendation;
          setReviewAction(rec === 'reject' ? 'replace' : rec);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsProcessingFile(false);
      setImportError(err.message || 'Error reading file.');
    }
  };

  // Text paste handler
  const handlePasteStage = async () => {
    if (!pasteLyrics.trim()) {
      setImportError('Please enter song lyrics.');
      return;
    }
    setImportError(null);
    setIsProcessingFile(true);

    try {
      const res = await window.pulpitAPI.stageSongText(pasteLyrics, pasteTitle.trim() || undefined);
      setIsProcessingFile(false);

      if (!res.success || !res.staged) {
        setImportError(res.errors?.join('; ') || 'Failed to parse lyrics.');
        return;
      }

      setPasteTitle('');
      setPasteLyrics('');
      await loadStaged();
      setImportTab('staged');
      setReviewingStagedId(res.staged.id);
      const rec = res.staged.duplicateCheck.recommendation;
      setReviewAction(rec === 'reject' ? 'replace' : rec);
    } catch (err: any) {
      setIsProcessingFile(false);
      setImportError(err.message || 'Error parsing lyrics.');
    }
  };

  // Approve staged song
  const handleApproveStaged = async () => {
    if (!reviewingStagedId) return;
    if (!reviewRightsConfirmed) {
      setReviewError('You must confirm copyright or public domain rights before approving.');
      return;
    }
    setReviewError(null);

    const options: ApprovalOptions = {
      action: reviewAction,
      versionName: reviewVersionName.trim() || undefined,
      rightsConfirmed: true
    };

    const res = await window.pulpitAPI.approveStagedImport(reviewingStagedId, options);
    if (!res.success || !res.song) {
      setReviewError(res.error || 'Failed to approve staged song.');
      return;
    }

    // Refresh library and staged
    await loadSongs();
    await loadStaged();
    setSelectedSongId(res.song.id);
    setSelectedVersionIndex(0);
    setReviewRightsConfirmed(false);
    setReviewVersionName('');

    const nextStaged = stagedList.filter((s) => s.id !== reviewingStagedId);
    if (nextStaged.length === 0) {
      setShowImportModal(false);
    } else {
      setReviewingStagedId(nextStaged[0].id);
    }
  };

  // Reject staged song
  const handleRejectStaged = async () => {
    if (!reviewingStagedId) return;
    await window.pulpitAPI.rejectStagedImport(reviewingStagedId, 'Rejected by operator');
    await loadStaged();
    const nextStaged = stagedList.filter((s) => s.id !== reviewingStagedId);
    if (nextStaged.length === 0) {
      setShowImportModal(false);
    } else {
      setReviewingStagedId(nextStaged[0].id);
    }
  };

  // Project song section via FreeShow and Central Authority
  const handleProjectSection = async (section: SongSection, idx: number) => {
    if (!selectedSong) return;
    if (manualLockActive) {
      setProjectionFeedback('Blocked: Manual Lock is active');
      setTimeout(() => setProjectionFeedback(null), 3000);
      return;
    }
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

  // Currently reviewed staged song
  const reviewingStaged = stagedList.find((s) => s.id === reviewingStagedId) || stagedList[0];

  const displayedSongs = searchQuery.trim()
    ? songs.filter((s) =>
        searchResults.length > 0
          ? searchResults.some((r) => r.songId === s.id)
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
                const matchInfo = searchResults.find((r) => r.songId === song.id);

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

                    {matchInfo && matchInfo.matchedLines.length > 0 && (
                      <div className="mt-2 text-[10px] bg-slate-950/80 p-1.5 rounded border border-indigo-900/40 text-indigo-300 font-mono italic">
                        "{matchInfo.matchedLines[0]}"
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
                    const isVerse = section.type === 'verse';
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

                        {/* Projection Action Button */}
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

      {/* Import & Quarantine Review Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Import & Quarantine Review</h3>
                  <p className="text-xs text-slate-400">
                    Parse TXT, CSV, DOCX, PPTX, or PDF files. All imports are quarantined until rights are verified.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950 px-6 gap-2">
              <button
                onClick={() => setImportTab('upload')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  importTab === 'upload'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Upload File (TXT, CSV, DOCX, PPTX, PDF)
              </button>
              <button
                onClick={() => setImportTab('paste')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  importTab === 'paste'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Paste Plain Text
              </button>
              <button
                onClick={() => setImportTab('staged')}
                className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                  importTab === 'staged'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Quarantined Review Queue
                {stagedList.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-600/30 text-amber-300 text-[10px] font-mono">
                    {stagedList.length}
                  </span>
                )}
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {importError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Tab 1: File Upload */}
              {importTab === 'upload' && (
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 rounded-xl bg-slate-950/40 hover:bg-slate-950/70 transition-all">
                  <UploadCloud className="w-12 h-12 text-indigo-400 mb-3 animate-bounce" />
                  <h4 className="text-sm font-semibold text-white mb-1">
                    Select a song file to inspect and stage
                  </h4>
                  <p className="text-xs text-slate-400 text-center max-w-md mb-4">
                    Supports Microsoft Word (.docx), PowerPoint (.pptx), PDF documents, CSV hymn lists, and plain text (.txt).
                    Safety sandbox enforces 25 MB limit and quarantine for macros.
                  </p>

                  <label className="cursor-pointer px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all">
                    <span>Browse Files</span>
                    <input
                      type="file"
                      accept=".txt,.csv,.docx,.pptx,.pdf"
                      onChange={handleFileUpload}
                      disabled={isProcessingFile}
                      className="hidden"
                    />
                  </label>

                  {isProcessingFile && (
                    <p className="text-xs text-indigo-400 mt-3 animate-pulse">
                      Analyzing and decompressing document safely...
                    </p>
                  )}
                </div>
              )}

              {/* Tab 2: Paste Plain Text */}
              {importTab === 'paste' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Song Title (Optional, will auto-detect from first line if blank)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Great Is Thy Faithfulness"
                      value={pasteTitle}
                      onChange={(e) => setPasteTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Song Lyrics & Structure
                    </label>
                    <textarea
                      rows={10}
                      placeholder={`Verse 1\nGreat is Thy faithfulness, O God my Father\nThere is no shadow of turning with Thee\n\nChorus\nGreat is Thy faithfulness! Great is Thy faithfulness!`}
                      value={pasteLyrics}
                      onChange={(e) => setPasteLyrics(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-600 font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handlePasteStage}
                      disabled={isProcessingFile}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
                    >
                      {isProcessingFile ? 'Parsing...' : 'Parse & Stage for Review'}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Staged Quarantined Review Queue */}
              {importTab === 'staged' && (
                <div>
                  {stagedList.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No songs currently in quarantine review.
                    </div>
                  ) : reviewingStaged ? (
                    <div className="space-y-5">
                      {/* Reviewing Item Info Header */}
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-white">
                              {reviewingStaged.draft.title}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-mono">
                              {reviewingStaged.draft.sourceFormat}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            File: <span className="font-mono text-slate-300">{reviewingStaged.draft.sourceFileName}</span> • {reviewingStaged.draft.sections.length} Sections Detected
                          </p>
                        </div>

                        {/* Duplicate Detection Status Badge */}
                        <div>
                          {reviewingStaged.duplicateCheck.status === 'exact_match' && (
                            <span className="px-2.5 py-1 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                              Exact Duplicate
                            </span>
                          )}
                          {reviewingStaged.duplicateCheck.status === 'variant_version' && (
                            <span className="px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-amber-400" />
                              Arrangement Variant
                            </span>
                          )}
                          {reviewingStaged.duplicateCheck.status === 'similar_title' && (
                            <span className="px-2.5 py-1 rounded bg-blue-950/60 border border-blue-800 text-blue-300 text-xs font-semibold flex items-center gap-1.5">
                              <Search className="w-3.5 h-3.5 text-blue-400" />
                              Similar Title
                            </span>
                          )}
                          {reviewingStaged.duplicateCheck.status === 'unique_new' && (
                            <span className="px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              Unique New Song
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Duplicate Match Explanation */}
                      {reviewingStaged.duplicateCheck.explanation && (
                        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                          <strong>Detection Engine:</strong> {reviewingStaged.duplicateCheck.explanation}
                        </div>
                      )}

                      {/* Action Decision Selector */}
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                          Promotion Decision:
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            onClick={() => setReviewAction('create_new')}
                            className={`p-3 rounded-lg border text-left text-xs transition-all ${
                              reviewAction === 'create_new'
                                ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <div className="font-bold mb-1">Create as New Song</div>
                            <div className="text-[11px] text-slate-400">Add as a brand new independent song in the catalog.</div>
                          </button>

                          <button
                            onClick={() => setReviewAction('add_as_version')}
                            disabled={!reviewingStaged.duplicateCheck.matchedSong}
                            className={`p-3 rounded-lg border text-left text-xs transition-all ${
                              reviewAction === 'add_as_version'
                                ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                : !reviewingStaged.duplicateCheck.matchedSong
                                ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <div className="font-bold mb-1">Add as Version / Arrangement</div>
                            <div className="text-[11px] text-slate-400">
                              Attach as a variant under "{reviewingStaged.duplicateCheck.matchedSong?.canonicalTitle || 'Matched Song'}".
                            </div>
                          </button>

                          <button
                            onClick={() => setReviewAction('replace')}
                            disabled={!reviewingStaged.duplicateCheck.matchedSong}
                            className={`p-3 rounded-lg border text-left text-xs transition-all ${
                              reviewAction === 'replace'
                                ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                : !reviewingStaged.duplicateCheck.matchedSong
                                ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <div className="font-bold mb-1">Replace Existing Song</div>
                            <div className="text-[11px] text-slate-400">Overwrite previous arrangement with this import.</div>
                          </button>
                        </div>

                        {reviewAction === 'add_as_version' && (
                          <div className="pt-2">
                            <label className="text-xs font-medium text-slate-300 block mb-1">
                              Version / Arrangement Name
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Acoustic 2026, Contemporary Arrangement"
                              value={reviewVersionName}
                              onChange={(e) => setReviewVersionName(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                            />
                          </div>
                        )}
                      </div>

                      {/* Parsed Sections Preview */}
                      <div>
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Parsed Sections Preview ({reviewingStaged.draft.sections.length})
                        </h5>
                        <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                          {reviewingStaged.draft.sections.map((sec, i) => (
                            <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                              <span className="text-[10px] font-bold text-indigo-400 uppercase block mb-1">
                                {sec.label}
                              </span>
                              <div className="text-[11px] text-slate-300 whitespace-pre-line leading-relaxed">
                                {sec.lines.join('\n')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Required Copyright & CCLI Rights Attestation */}
                      <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/40 space-y-2">
                        <label className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={reviewRightsConfirmed}
                            onChange={(e) => setReviewRightsConfirmed(e.target.checked)}
                            className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-slate-900"
                          />
                          <span className="text-xs text-slate-300 leading-relaxed">
                            <strong className="text-white">Legal Rights Attestation:</strong> I confirm that this work is in the public domain, or that our church holds the necessary CCLI / direct copyright license for projection.
                          </span>
                        </label>

                        {reviewError && (
                          <p className="text-xs text-rose-400 mt-2 font-medium">{reviewError}</p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={handleRejectStaged}
                          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 hover:bg-rose-900/60 text-xs font-semibold transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-rose-400" />
                          <span>Reject & Discard</span>
                        </button>

                        <button
                          onClick={handleApproveStaged}
                          disabled={!reviewRightsConfirmed}
                          className={`flex items-center space-x-2 px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                            reviewRightsConfirmed
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve & Promote to Library</span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};