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
    <div className="relative glass-panel rounded-2xl p-2.5 flex flex-col gap-2 shadow-xl">
      {/* Header Row: Title, Counter, Presets Feedback, Presets Toggle, Clear */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-700/80 gap-2 flex-shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <Pin className="w-3.5 h-3.5 text-indigo-300 rotate-45 flex-shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#D8E2EC] truncate">
            Pastoral Memory
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-mono font-bold bg-indigo-950 text-indigo-200 border border-indigo-500 flex-shrink-0">
            {pinnedScriptures.length}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 flex-shrink-0">
          {presetFeedback && (
            <span className="text-xs font-semibold text-emerald-300 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{presetFeedback}</span>
            </span>
          )}

          {onLoadPresets && (
            <button
              type="button"
              onClick={() => setIsPresetOpen((v) => !v)}
              aria-expanded={isPresetOpen}
              title="Pre-load Bible passages supplied by the pastor before service for 1-click speed"
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${
                isPresetOpen
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-amber-950 text-amber-200 border-amber-600 hover:bg-amber-900'
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
              aria-label="Clear all pinned scriptures"
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-900 text-[#A3B3C6] hover:text-rose-300 hover:bg-rose-950 border border-slate-500 transition-colors"
              title="Clear all pinned &amp; preset sermon scriptures"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bounded Multi-Row Chip Cloud (3 rows = 108px max, internal vertical scroll when > 3 rows) */}
      {pinnedScriptures.length === 0 ? (
        <p className="text-xs text-[#A3B3C6] italic py-0.5">
          Approved scriptures and pastor presets will pin here for 1-click recall during the sermon.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5 pr-1 overflow-y-auto custom-scrollbar max-h-[108px]">
          {pinnedScriptures.map((item) => (
            <div
              key={item.id}
              className={`flex items-center h-8 rounded-xl border text-xs font-bold transition-all shadow-sm flex-shrink-0 ${
                item.isPreset
                  ? 'bg-amber-950 border-amber-600 text-amber-100 hover:border-amber-400'
                  : 'bg-indigo-950 border-indigo-500 text-indigo-100 hover:border-indigo-400'
              }`}
            >
              <button
                type="button"
                onClick={() => onReProject(item.reference, item.textSnippet)}
                disabled={!freeShowConnected}
                className="h-full px-2 flex items-center space-x-1.5 text-left hover:text-[#D8E2EC] disabled:opacity-50 disabled:cursor-not-allowed"
                title={`1-Click Recall: Project ${item.reference} (${item.translation})${item.textSnippet ? `\n"${item.textSnippet}"` : ''}`}
              >
                {item.isPreset && (
                  <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-amber-900 text-amber-200 border border-amber-600 font-mono font-bold leading-none">
                    Preset
                  </span>
                )}
                <span className="text-xs font-bold tracking-tight whitespace-nowrap">{item.reference}</span>
                <span
                  className={`text-[10px] font-mono px-1 py-0.5 rounded border font-bold leading-none ${
                    item.isPreset
                      ? 'bg-amber-900 text-amber-200 border border-amber-700/60 font-mono font-bold'
                      : 'bg-indigo-900 text-indigo-200 border-indigo-500'
                  }`}
                >
                  {item.translation}
                </span>
              </button>

              {onRemovePin && (
                <button
                  type="button"
                  onClick={() => onRemovePin(item.id)}
                  aria-label={`Remove ${item.reference}`}
                  className="h-full w-6 flex items-center justify-center border-l border-slate-500 text-[#A3B3C6] hover:text-rose-300 hover:bg-rose-950 rounded-r-xl transition-colors"
                  title={`Remove ${item.reference}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upward-Anchored Pre-Service Presets Drawer (zero Pinboard height squeeze, zero clipping) */}
      {isPresetOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-30 p-3 rounded-xl bg-slate-950 border border-amber-500 shadow-2xl flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs gap-2">
            <span className="font-semibold text-amber-300 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
              <span>Pre-Service Pastor Scripture Presets (comma or newline separated)</span>
            </span>
            <span className="text-[11px] text-[#A3B3C6] font-mono flex-shrink-0">
              {parsedPreview.length} valid passage{parsedPreview.length === 1 ? '' : 's'} detected
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <textarea
              rows={2}
              value={presetInput}
              onChange={(e) => setPresetInput(e.target.value)}
              placeholder="Paste pastor's verses, e.g. Romans 8:28, Psalm 23:1-6, John 3:16, 1 Cor 13:4-7"
              className="flex-1 bg-slate-950 border border-slate-500 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-[#A3B3C6] font-mono outline-none resize-none"
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
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-500 text-[11px] font-semibold"
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
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 border border-amber-600 text-amber-200"
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
