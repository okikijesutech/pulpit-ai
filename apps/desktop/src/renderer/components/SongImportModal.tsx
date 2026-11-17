import React, { useState, useEffect } from 'react';
import { StagedImportSong, ApprovalOptions } from '@pulpit-ai/song-engine';
import {
  Search,
  UploadCloud,
  Layers,
  CheckCircle,
  AlertTriangle,
  Trash2,
  X,
  Check
} from 'lucide-react';

export type SongImportTab = 'upload' | 'paste' | 'staged';

interface SongImportModalProps {
  isOpen: boolean;
  initialTab: SongImportTab;
  stagedList: StagedImportSong[];
  onClose: () => void;
  onRefreshLibrary: () => Promise<void>;
  onRefreshStaged: () => Promise<void>;
  onSongPromoted: (songId: string) => void;
}

export const SongImportModal: React.FC<SongImportModalProps> = ({
  isOpen,
  initialTab,
  stagedList,
  onClose,
  onRefreshLibrary,
  onRefreshStaged,
  onSongPromoted
}) => {
  const [importTab, setImportTab] = useState<SongImportTab>(initialTab);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteLyrics, setPasteLyrics] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [reviewingStagedId, setReviewingStagedId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'create_new' | 'add_as_version' | 'replace'>('create_new');
  const [reviewVersionName, setReviewVersionName] = useState('');
  const [reviewRightsConfirmed, setReviewRightsConfirmed] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setImportTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (stagedList.length > 0 && !reviewingStagedId) {
      setReviewingStagedId(stagedList[0].id);
      const rec = stagedList[0].duplicateCheck.recommendation;
      setReviewAction(rec === 'reject' ? 'replace' : rec);
    }
  }, [stagedList, reviewingStagedId]);

  if (!isOpen) return null;

  const reviewingStaged = stagedList.find((s) => s.id === reviewingStagedId) || stagedList[0];

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

        await onRefreshStaged();
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
      await onRefreshStaged();
      setImportTab('staged');
      setReviewingStagedId(res.staged.id);
      const rec = res.staged.duplicateCheck.recommendation;
      setReviewAction(rec === 'reject' ? 'replace' : rec);
    } catch (err: any) {
      setIsProcessingFile(false);
      setImportError(err.message || 'Error parsing lyrics.');
    }
  };

  const handleApproveStaged = async () => {
    if (!reviewingStaged) return;
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

    const res = await window.pulpitAPI.approveStagedImport(reviewingStaged.id, options);
    if (!res.success || !res.song) {
      setReviewError(res.error || 'Failed to approve staged song.');
      return;
    }

    await onRefreshLibrary();
    await onRefreshStaged();
    onSongPromoted(res.song.id);
    setReviewRightsConfirmed(false);
    setReviewVersionName('');

    const nextStaged = stagedList.filter((s) => s.id !== reviewingStaged.id);
    if (nextStaged.length === 0) {
      onClose();
    } else {
      setReviewingStagedId(nextStaged[0].id);
    }
  };

  const handleRejectStaged = async () => {
    if (!reviewingStaged) return;
    await window.pulpitAPI.rejectStagedImport(reviewingStaged.id, 'Rejected by operator');
    await onRefreshStaged();
    const nextStaged = stagedList.filter((s) => s.id !== reviewingStaged.id);
    if (nextStaged.length === 0) {
      onClose();
    } else {
      setReviewingStagedId(nextStaged[0].id);
    }
  };

  return (
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
            onClick={onClose}
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

                  {reviewingStaged.duplicateCheck.explanation && (
                    <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                      <strong>Detection Engine:</strong> {reviewingStaged.duplicateCheck.explanation}
                    </div>
                  )}

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
  );
};
