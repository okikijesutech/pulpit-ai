import React from 'react';
import { BookOpen, RotateCcw, Pin, Trash2, X } from 'lucide-react';

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
  onOpenExplorer: () => void;
}

export const SermonScripturePinboard: React.FC<SermonScripturePinboardProps> = ({
  pinnedScriptures,
  onReProject,
  onClear,
  onRemovePin,
  freeShowConnected,
  isLocked,
  onOpenExplorer
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
          <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 pr-2 min-w-0">
            {pinnedScriptures.map((item) => (
              <div
                key={item.id}
                className="flex items-center rounded-lg bg-indigo-950/70 border border-indigo-700/60 hover:border-indigo-500 text-xs font-bold text-indigo-200 transition-all shadow-sm flex-shrink-0 group"
              >
                <button
                  type="button"
                  disabled={!freeShowConnected || isLocked}
                  onClick={() => onReProject(item.reference)}
                  title={`Re-project "${item.reference}" (${item.translation}):\n${item.textSnippet}`}
                  className="flex items-center space-x-1.5 px-2.5 py-1 hover:text-white transition-colors disabled:opacity-40"
                >
                  <BookOpen className="w-3 h-3 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span>{item.reference}</span>
                  <span className="text-[9px] font-mono text-indigo-400 font-normal">({item.translation})</span>
                  <RotateCcw className="w-2.5 h-2.5 text-indigo-400 opacity-60 group-hover:opacity-100" />
                </button>

                {onRemovePin && (
                  <button
                    type="button"
                    onClick={() => onRemovePin(item.id)}
                    title="Remove from pinboard"
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
        <button
          onClick={onOpenExplorer}
          className="px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-[10px] font-bold text-indigo-300 hover:text-white transition-all flex items-center space-x-1 shadow-sm active:scale-95"
        >
          <BookOpen className="w-3 h-3" />
          <span>Bible Explorer</span>
        </button>

        {pinnedScriptures.length > 0 && (
          <button
            onClick={onClear}
            title="Clear pinned sermon scriptures"
            className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
