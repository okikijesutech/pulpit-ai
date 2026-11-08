import React from 'react';
import { Lock, Unlock, AlertOctagon } from 'lucide-react';

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
      className={`px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between transition-colors border-b gap-2 min-w-0 ${
        isLocked
          ? 'bg-rose-950/80 border-rose-600 text-rose-100 shadow-inner'
          : 'bg-slate-900/40 border-slate-800 text-slate-300'
      }`}
    >
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        {isLocked ? (
          <AlertOctagon className="w-5 h-5 text-rose-400 animate-bounce flex-shrink-0" />
        ) : (
          <Unlock className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
        <div className="min-w-0 truncate">
          <span className="text-xs sm:text-sm font-bold tracking-wide whitespace-nowrap">
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
        className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all shadow-md flex-shrink-0 whitespace-nowrap ${
          isLocked
            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50'
            : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/50'
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
