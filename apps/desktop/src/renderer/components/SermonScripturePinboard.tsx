import React, { useState, useMemo } from 'react';
import { Pin, Trash2, X, Plus, Sparkles, CheckCircle2 } from 'lucide-react';
import { parseBatchScriptureReferences } from '../utils/quickScriptureParser.js';

export interface PinnedScripture {
  id: string;
  reference: string;
  translation: string;
  textSnippet: string;
  timestamp: number;
  isPreset?: boolean;
}

interface SermonScripturePinboardProps {
  pinnedScriptures: PinnedScripture[];
  onReProject: (reference: string, textSnippet?: string) => void;
  onClear: () => void;
  onRemovePin?: (id: string) => void;
  onLoadPresets?: (rawText: string) => Promise<number>;
  freeShowConnected: boolean;
  isLocked: boolean;
}

export const SermonScripturePinboard: React.FC<SermonScripturePinboardProps> = React.memo(({
  pinnedScriptures,
  onReProject,
  onClear,
  onRemovePin,
  onLoadPresets,
  freeShowConnected,
  isLocked: _isLocked
}) => {
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const [presetInput, setPresetInput] = useState('');
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);
  const [presetFeedback, setPresetFeedback] = useState<string | null>(null);

  const parsedPreview = useMemo(() => parseBatchScriptureReferences(presetInput), [presetInput]);

  const handleSavePresets = async () => {
    if (!onLoadPresets || parsedPreview.length === 0) return;
    setIsLoadingPresets(true);
    try {
      const added = await onLoadPresets(presetInput);
      setPresetInput('');
      setIsPresetOpen(false);
      setPresetFeedback(`Loaded ${added} preset passage${added === 1 ? '' : 's'}`);
      setTimeout(() => setPresetFeedback(null), 3000);
    } finally {
      setIsLoadingPresets(false);
    }
  };

  return (
    <div className="glass-panel rounded-xl px-3 py-2 flex flex-col gap-2 shadow-md">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-300 flex-shrink-0">
            <Pin className="w-3.5 h-3.5 text-indigo-400 rotate-45" />
            <span className="uppercase tracking-wider text-[10px] hidden sm:inline">
              Pastoral Memory ({pinnedScriptures.length}):
            </span>
          </div>

          {pinnedScriptures.length === 0 ? (
            <span className="text-[11px] text-slate-500 italic truncate">
              No scriptures pinned yet. Load pastor&apos;s pre-service verses or approve live passages for 1-click recall.
            </span>
          ) : (
            <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 pr-2 min-w-0 custom-scrollbar">
              {pinnedScriptures.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center rounded-lg border text-xs font-bold transition-all shadow-sm flex-shrink-0 group ${
                    item.isPreset
                      ? 'bg-amber-950/50 border-amber-600/60 hover:border-amber-400 text-amber-200'
                      : 'bg-indigo-950/70 border-indigo-700/60 hover:border-indigo-500 text-indigo-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onReProject(item.reference, item.textSnippet)}
                    disabled={!freeShowConnected}
                    title={`1-Click Recall: Project ${item.reference} (${item.translation})${item.textSnippet ? `\n"${item.textSnippet}"` : ''}`}
                    className="px-2.5 py-1 text-left hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
                  >
                    {item.isPreset && (
                      <span className="text-[8px] uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                        Preset
                      </span>
                    )}
                    <span>{item.reference}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded border ${
                        item.isPreset
                          ? 'bg-amber-900/50 text-amber-300 border-amber-700/40'
                          : 'bg-indigo-900/60 text-indigo-300 border-indigo-700/40'
                      }`}
                    >
                      {item.translation}
                    </span>
                  </button>
                  {onRemovePin && (
                    <button
                      type="button"
                      onClick={() => onRemovePin(item.id)}
                      title="Remove pinned passage"
                      className="pr-1.5 pl-0.5 text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0">
          {presetFeedback && (
            <span className="text-[10px] font-semibold text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{presetFeedback}</span>
            </span>
          )}

          {onLoadPresets && (
            <button
              type="button"
              onClick={() => setIsPresetOpen((v) => !v)}
              title="Pre-load Bible passages supplied by the pastor before service for 1-click speed"
              className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all active:scale-95 ${
                isPresetOpen
                  ? 'bg-amber-600 text-slate-950 border-amber-400'
                  : 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-700/50 hover:text-white'
              }`}
            >
              <Plus className="w-3 h-3" />
              <span>Preset Passages</span>
            </button>
          )}

          {pinnedScriptures.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              title="Clear all pinned & preset sermon scriptures"
              className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inline Pre-Service Pastor Scripture Presets Drawer */}
      {isPresetOpen && (
        <div className="pt-2 border-t border-slate-800/80 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-amber-300 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Pre-Service Pastor Scripture Presets (comma or newline separated)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {parsedPreview.length} valid passage{parsedPreview.length === 1 ? '' : 's'} detected
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <textarea
              rows={2}
              value={presetInput}
              onChange={(e) => setPresetInput(e.target.value)}
              placeholder="Paste pastor's verses, e.g. Romans 8:28, Psalm 23:1-6, John 3:16, 1 Cor 13:4-7"
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono outline-none resize-none"
            />
            <div className="flex sm:flex-col justify-end gap-1.5">
              <button
                type="button"
                onClick={handleSavePresets}
                disabled={isLoadingPresets || parsedPreview.length === 0}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-extrabold transition-all shadow-sm active:scale-95 whitespace-nowrap"
              >
                {isLoadingPresets ? 'Loading...' : `Load ${parsedPreview.length || ''} Preset${parsedPreview.length === 1 ? '' : 's'}`}
              </button>
              <button
                type="button"
                onClick={() => setIsPresetOpen(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>

          {parsedPreview.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {parsedPreview.map((p) => (
                <span
                  key={p.referenceString}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-700/50 text-amber-200"
                >
                  ✓ {p.referenceString}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

SermonScripturePinboard.displayName = 'SermonScripturePinboard';
