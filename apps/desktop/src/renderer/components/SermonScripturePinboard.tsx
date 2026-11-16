import React from 'react';
import { Pin, Trash2, X } from 'lucide-react';
export interface PinnedScripture {
  id: string;
  reference: string;
  translation: string;
  textSnippet: string;
  timestamp: number;
}

interface SermonScripturePinboardProps {
  pinnedScriptures: PinnedScripture[];
  onReProject: (reference: string) => void;
  onClear: () => void;
  onRemovePin?: (id: string) => void;
  freeShowConnected: boolean;
  isLocked: boolean;
}

export const SermonScripturePinboard: React.FC<SermonScripturePinboardProps> = ({
  pinnedScriptures,
  onReProject,
  onClear,
  onRemovePin,
  freeShowConnected,
  isLocked
}) => {
  return (
    <div className="glass-panel rounded-xl px-3 py-2 flex items-center justify-between gap-2 shadow-md">
      <div className="flex items-center space-x-2 min-w-0 flex-1">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-300 flex-shrink-0">
          <Pin className="w-3.5 h-3.5 text-indigo-400 rotate-45" />
          <span className="uppercase tracking-wider text-[10px] hidden sm:inline">
            Pastoral Memory ({pinnedScriptures.length}):
          </span>
        </div>

        {pinnedScriptures.length === 0 ? (
          <span className="text-[11px] text-slate-500 italic truncate">
            No scriptures pinned yet in this service. Approved passages will appear here for 1-click recall.
          </span>
        ) : (
          <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 pr-2 min-w-0 custom-scrollbar">
            {pinnedScriptures.map((item) => (
              <div
                key={item.id}
                className="flex items-center rounded-lg bg-indigo-950/70 border border-indigo-700/60 hover:border-indigo-500 text-xs font-bold text-indigo-200 transition-all shadow-sm flex-shrink-0 group"
              >
                <button
                  type="button"
                  onClick={() => onReProject(item.reference)}
                  disabled={!freeShowConnected || isLocked}
                  title={`1-Click Recall: Project ${item.reference} (${item.translation})\n"${item.textSnippet}"`}
                  className="px-2.5 py-1 text-left hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
                >
                  <span>{item.reference}</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/40">
                    {item.translation}
                  </span>
                </button>
                {onRemovePin && (
                  <button
                    type="button"
                    onClick={() => onRemovePin(item.id)}
                    title="Unpin verse"
                    className="pr-1.5 pl-0.5 text-indigo-400/60 hover:text-rose-400 transition-colors"
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
        {pinnedScriptures.length > 0 && (
          <button
            onClick={onClear}
            title="Clear pinned sermon scriptures"
            className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
