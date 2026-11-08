import React from 'react';
import { AllowlistedAction } from '@pulpit-ai/shared-types';
import {
  ChevronRight,
  ChevronLeft,
  EyeOff,
  RotateCcw,
  Sliders,
  Sparkles
} from 'lucide-react';

interface ManualControlsPanelProps {
  onDispatch: (action: AllowlistedAction, data?: any) => void;
  onAddMockCandidate: () => void;
  disabled: boolean;
}

export const ManualControlsPanel: React.FC<ManualControlsPanelProps> = ({
  onDispatch,
  onAddMockCandidate,
  disabled
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col shadow-lg">
      <div className="flex items-center space-x-2 pb-3 border-b border-slate-800 mb-3 text-slate-300">
        <Sliders className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-200">
          Manual Operator Controls
        </h2>
      </div>

      <div className="space-y-2.5 sm:space-y-3">
        {/* Navigation Grid */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          <button
            disabled={disabled}
            onClick={() => onDispatch('previous_slide')}
            className="flex items-center justify-center space-x-1 sm:space-x-1.5 p-2 sm:p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] sm:text-xs font-bold text-white transition-all shadow-sm truncate"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">Previous Slide</span>
          </button>

          <button
            disabled={disabled}
            onClick={() => onDispatch('next_slide')}
            className="flex items-center justify-center space-x-1 sm:space-x-1.5 p-2 sm:p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] sm:text-xs font-bold text-white transition-all shadow-md shadow-indigo-900/30 truncate"
          >
            <span className="truncate">Next Slide</span>
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          </button>
        </div>

        {/* Clear & Restore Grid */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <button
            disabled={disabled}
            onClick={() => onDispatch('clear_slide')}
            className="p-1.5 sm:p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-[11px] sm:text-xs text-slate-300 font-medium transition-colors truncate text-center"
          >
            Clear Slide
          </button>
          <button
            disabled={disabled}
            onClick={() => onDispatch('clear_all')}
            className="p-1.5 sm:p-2 rounded-lg bg-rose-950/60 border border-rose-800/80 hover:bg-rose-900/60 disabled:opacity-40 text-[11px] sm:text-xs text-rose-200 font-medium transition-colors truncate text-center"
          >
            Clear All
          </button>
          <button
            disabled={disabled}
            onClick={() => onDispatch('restore_output')}
            className="p-1.5 sm:p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/80 hover:bg-emerald-900/60 disabled:opacity-40 text-[11px] sm:text-xs text-emerald-200 font-medium transition-colors flex items-center justify-center space-x-1 truncate text-center"
          >
            <RotateCcw className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">Restore</span>
          </button>
        </div>

        {/* Dev / Test Rig Helper */}
        <div className="pt-2 border-t border-slate-800/60">
          <button
            onClick={onAddMockCandidate}
            className="w-full p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Inject Test Suggestion (Scripture)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
