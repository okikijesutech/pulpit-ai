import React from 'react';
import { Lock, Unlock, AlertOctagon, ShieldCheck } from 'lucide-react';

interface ManualLockBannerProps {
  isLocked: boolean;
  onToggleLock: () => void;
}

export const ManualLockBanner: React.FC<ManualLockBannerProps> = ({
  isLocked,
  onToggleLock
}) => {
  return (
    <div
      className={`px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between transition-all border-b gap-2 min-w-0 z-10 ${
        isLocked
          ? 'bg-gradient-to-r from-rose-950/90 via-rose-900/80 to-rose-950/90 border-rose-600/90 text-rose-100 shadow-[0_2px_15px_rgba(225,29,72,0.25)]'
          : 'bg-gradient-to-r from-slate-950/90 via-slate-900/60 to-slate-950/90 border-slate-800/80 text-slate-300'
      }`}
    >
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border ${
            isLocked
              ? 'bg-rose-900/70 border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
              : 'bg-slate-900 border-slate-700/60'
          }`}
        >
          {isLocked ? (
            <AlertOctagon className="w-4 h-4 text-rose-300 animate-pulse" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          )}
        </div>

        <div className="min-w-0 truncate">
          <span
            className={`text-xs sm:text-sm font-bold tracking-wide whitespace-nowrap ${
              isLocked ? 'text-white' : 'text-slate-100'
            }`}
          >
            {isLocked
              ? 'EMERGENCY MANUAL SAFETY LOCK ACTIVE'
              : 'AUTOMATIC OVERRIDE READY'}
          </span>
          <span className="text-xs ml-2 sm:ml-3 text-slate-400 hidden md:inline">
            {isLocked
              ? 'All AI projection commands are 100% blocked. Operator has sole control.'
              : 'AI is restricted to suggestions. Projection requires operator confirmation.'}
          </span>
        </div>
      </div>

      <button
        onClick={onToggleLock}
        className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all shadow-md flex-shrink-0 whitespace-nowrap active:scale-95 ${
          isLocked
            ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-900/50 border border-rose-400/40'
            : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-amber-900/50 border border-amber-400/30'
        }`}
      >
        {isLocked ? (
          <>
            <Unlock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Release Lock</span>
          </>
        ) : (
          <>
            <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Activate Manual Lock</span>
          </>
        )}
      </button>
    </div>
  );
};
