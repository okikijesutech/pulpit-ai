import React, { useState } from "react";
import { AllowlistedAction } from "@pulpit-ai/shared-types";
import {
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Sliders,
  BookOpen,
  Megaphone,
  LayoutGrid,
  ArrowRight,
  Snowflake,
  Image as ImageIcon,
  Music,
  ListOrdered
} from "lucide-react";
import { ActiveAnnouncement } from "./QuickAnnouncementModal.js";

interface ManualControlsPanelProps {
  onDispatch: (action: AllowlistedAction, data?: any) => void;
  disabled: boolean;
  onOpenBibleExplorer?: () => void;
  onOpenAnnouncements?: () => void;
  onOpenSlideMatrix?: () => void;
  onOpenStanzaMatrix?: () => void;
  onOpenServiceOrder?: () => void;
  currentCueTitle?: string;
  currentCueNumber?: number;
  totalCues?: number;
  onAdvanceCue?: () => void;
  activeAnnouncement?: ActiveAnnouncement | null;
  onClearAnnouncement?: () => void;
}

export const ManualControlsPanel: React.FC<ManualControlsPanelProps> = ({
  onDispatch,
  disabled,
  onOpenBibleExplorer,
  onOpenAnnouncements,
  onOpenSlideMatrix,
  onOpenStanzaMatrix,
  onOpenServiceOrder,
  currentCueTitle,
  currentCueNumber = 1,
  totalCues = 8,
  onAdvanceCue,
  activeAnnouncement,
  onClearAnnouncement,
}) => {
  const [quickJumpNum, setQuickJumpNum] = useState<string>("");

  const handleDeskJump = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(quickJumpNum.trim(), 10);
    if (!isNaN(parsed)) {
      const zeroBased = parsed > 0 ? parsed - 1 : parsed;
      onDispatch("index_select_slide", { index: zeroBased });
      setQuickJumpNum("");
    }
  };
  return (
    <div className='glass-panel rounded-2xl p-3.5 flex flex-col shadow-xl transition-all'>
      {/* Panel Header */}
      <div className='flex items-center justify-between pb-2.5 border-b border-slate-800/80 mb-2.5'>
        <div className='flex items-center space-x-2'>
          <div className='w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-sm'>
            <Sliders className='w-3.5 h-3.5' />
          </div>
          <div>
            <h2 className='text-xs font-bold tracking-wider uppercase text-slate-200'>
              Manual Controls
            </h2>
          </div>
        </div>

        {onOpenServiceOrder && (
          <button
            type='button'
            onClick={onOpenServiceOrder}
            title='Open Service Order Run-Sheet (Hotkey: O)'
            className='flex items-center space-x-1.5 px-2 py-0.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/50 text-[10px] font-bold text-amber-300 hover:text-white transition-all shadow-sm'
          >
            <ListOrdered className='w-3 h-3 text-amber-400' />
            <span>Run-Sheet</span>
            <kbd className='px-1 py-0.2 rounded bg-amber-950 text-[8px] font-mono text-amber-200'>O</kbd>
          </button>
        )}
      </div>

      <div className='space-y-2'>
        {/* Service Order Liturgy Mini-Pacer Bar */}
        {onOpenServiceOrder && (
          <div className='px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 shadow-inner'>
            <div className='min-w-0 flex-1 flex items-center space-x-1.5'>
              <span className='w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse' />
              <div className='truncate text-[11px] font-medium text-slate-300'>
                <span className='font-mono font-bold text-slate-400 text-[10px] mr-1'>
                  Cue {currentCueNumber}/{totalCues}:
                </span>
                <span className='truncate text-slate-200 font-semibold'>{currentCueTitle || "Welcome"}</span>
              </div>
            </div>

            {onAdvanceCue && (
              <button
                type='button'
                disabled={disabled}
                onClick={onAdvanceCue}
                title='Advance to Next Service Liturgy Cue'
                className='px-2.5 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[10px] font-bold transition-all flex items-center space-x-1 flex-shrink-0 shadow-sm active:scale-95'
              >
                <span>Next Cue</span>
                <ChevronRight className='w-3 h-3' />
              </button>
            )}
          </div>
        )}

        {/* Navigation Grid (Slide Steppers) */}
        <div className='grid grid-cols-2 gap-1.5'>
          <button
            disabled={disabled}
            onClick={() => onDispatch("previous_slide")}
            title='Go to previous slide [Left Arrow]'
            className='flex items-center justify-between p-2 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-200 transition-all shadow-sm active:scale-95 group'
          >
            <div className='flex items-center space-x-1.5 truncate'>
              <ChevronLeft className='w-4 h-4 flex-shrink-0 text-slate-400 group-hover:text-white transition-colors' />
              <span className='truncate'>Previous</span>
            </div>
            <kbd className='hidden sm:inline px-1 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] font-mono text-slate-500 group-hover:text-slate-300'>
              ←
            </kbd>
          </button>

          <button
            disabled={disabled}
            onClick={() => onDispatch("next_slide")}
            title='Advance to next slide [Space / Right Arrow]'
            className='flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 border border-indigo-400/40 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-white transition-all shadow-md shadow-indigo-900/40 active:scale-95 group'
          >
            <div className='flex items-center space-x-1.5 truncate'>
              <span className='truncate'>Next Slide</span>
              <ChevronRight className='w-4 h-4 flex-shrink-0' />
            </div>
            <kbd className='hidden sm:inline px-1 py-0.5 rounded bg-indigo-950/70 border border-indigo-400/40 text-[9px] font-mono text-indigo-200'>
              Space
            </kbd>
          </button>
        </div>

        {/* Clear & Restore Grid */}
        <div className='grid grid-cols-3 gap-1.5'>
          <button
            disabled={disabled}
            onClick={() => onDispatch("clear_slide")}
            title='Clear current slide text [C]'
            className='p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 disabled:opacity-40 text-[11px] text-slate-300 font-semibold transition-all flex flex-col items-center justify-center active:scale-95 group'
          >
            <span className='truncate'>Clear Slide</span>
            <kbd className='text-[8px] font-mono text-slate-500 group-hover:text-slate-400'>
              C
            </kbd>
          </button>

          <button
            disabled={disabled}
            onClick={() => onDispatch("clear_all")}
            title='Blackout screen and clear all output [Esc]'
            className='p-1.5 rounded-xl bg-rose-950/40 border border-rose-800/60 hover:bg-rose-900/50 hover:border-rose-700 disabled:opacity-40 text-[11px] text-rose-300 font-semibold transition-all flex flex-col items-center justify-center active:scale-95 group shadow-sm shadow-rose-950/40'
          >
            <span className='truncate'>Blackout</span>
            <kbd className='text-[8px] font-mono text-rose-400/60 group-hover:text-rose-300'>
              Esc
            </kbd>
          </button>

          <button
            disabled={disabled}
            onClick={() => onDispatch("restore_output")}
            title='Restore last cleared output [R]'
            className='p-1.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 hover:bg-emerald-900/50 hover:border-emerald-700 disabled:opacity-40 text-[11px] text-emerald-300 font-semibold transition-all flex flex-col items-center justify-center active:scale-95 group shadow-sm shadow-emerald-950/40'
          >
            <div className='flex items-center space-x-1 truncate'>
              <RotateCcw className='w-3 h-3 flex-shrink-0' />
              <span className='truncate'>Restore</span>
            </div>
            <kbd className='text-[8px] font-mono text-emerald-400/60 group-hover:text-emerald-300'>
              R
            </kbd>
          </button>
        </div>

        {/* 2x2 Consolidated Presentation Launchers Grid */}
        <div className='grid grid-cols-2 gap-1.5 pt-0.5'>
          {/* Bible Explorer Trigger */}
          {onOpenBibleExplorer && (
            <button
              type='button'
              onClick={onOpenBibleExplorer}
              title='Open Bible Explorer (Hotkey: B)'
              className='p-2 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-700/50 text-xs font-bold text-indigo-300 hover:text-white transition-all flex items-center justify-between shadow-sm active:scale-95 group'
            >
              <div className='flex items-center space-x-1.5 truncate'>
                <BookOpen className='w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform flex-shrink-0' />
                <span className='truncate'>Bible</span>
              </div>
              <kbd className='px-1 py-0.2 rounded bg-indigo-900/60 border border-indigo-600/50 text-[9px] font-mono text-indigo-200'>
                B
              </kbd>
            </button>
          )}

          {/* Worship Stanza Matrix Trigger */}
          {onOpenStanzaMatrix && (
            <button
              type='button'
              onClick={onOpenStanzaMatrix}
              title='Open Worship Stanza Matrix & Hymns (Hotkey: S)'
              className='p-2 rounded-xl bg-violet-950/40 hover:bg-violet-900/50 border border-violet-700/50 text-xs font-bold text-violet-300 hover:text-white transition-all flex items-center justify-between shadow-sm active:scale-95 group'
            >
              <div className='flex items-center space-x-1.5 truncate'>
                <Music className='w-3.5 h-3.5 text-violet-400 group-hover:scale-110 transition-transform flex-shrink-0' />
                <span className='truncate'>Hymns</span>
              </div>
              <kbd className='px-1 py-0.2 rounded bg-violet-900/60 border border-violet-600/50 text-[9px] font-mono text-violet-200'>
                S
              </kbd>
            </button>
          )}

          {/* Slide Matrix & Direct Jump Trigger */}
          {onOpenSlideMatrix && (
            <button
              type='button'
              disabled={disabled}
              onClick={onOpenSlideMatrix}
              title='Open Slide Matrix Navigator (Hotkey: M)'
              className='p-2 rounded-xl bg-slate-900/90 hover:bg-indigo-950/50 border border-slate-800 hover:border-indigo-500/50 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center justify-between shadow-sm active:scale-95 group'
            >
              <div className='flex items-center space-x-1.5 truncate'>
                <LayoutGrid className='w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform flex-shrink-0' />
                <span className='truncate'>Matrix</span>
              </div>
              <kbd className='px-1 py-0.2 rounded bg-slate-950 border border-slate-800 text-[9px] font-mono text-slate-400'>
                M
              </kbd>
            </button>
          )}

          {/* Quick Announcements / Lower-Third Alert Trigger */}
          {onOpenAnnouncements && (
            <button
              type='button'
              onClick={onOpenAnnouncements}
              title='Open Lower-Third Alerts Ticker (Hotkey: A)'
              className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-between shadow-sm active:scale-95 group ${
                activeAnnouncement
                  ? "bg-amber-950/80 hover:bg-amber-900 border-amber-500/80 text-amber-200"
                  : "bg-amber-950/30 hover:bg-amber-900/40 border-amber-700/40 text-amber-300 hover:text-white"
              }`}
            >
              <div className='flex items-center space-x-1.5 truncate'>
                <Megaphone
                  className={`w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform flex-shrink-0 ${activeAnnouncement ? "animate-bounce" : ""}`}
                />
                <span className='truncate'>
                  {activeAnnouncement ? `${activeAnnouncement.remainingSeconds}s` : "Alerts"}
                </span>
              </div>
              <kbd className='px-1 py-0.2 rounded bg-amber-950/80 border border-amber-600/50 text-[9px] font-mono text-amber-200'>
                A
              </kbd>
            </button>
          )}
        </div>

        {/* Quick Numeric Jump Desk Row */}
        <form
          onSubmit={handleDeskJump}
          className='flex items-center space-x-1.5'
        >
          <input
            type='number'
            min='1'
            placeholder='Jump slide #...'
            value={quickJumpNum}
            onChange={(e) => setQuickJumpNum(e.target.value)}
            disabled={disabled}
            className='flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 focus:border-indigo-500 text-xs text-white placeholder-slate-500 font-mono outline-none transition-all disabled:opacity-40'
          />
          <button
            type='submit'
            disabled={disabled || !quickJumpNum.trim()}
            className='px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-white transition-all flex items-center space-x-1 shadow-sm active:scale-95 flex-shrink-0'
          >
            <span>Jump</span>
            <ArrowRight className='w-3 h-3' />
          </button>
        </form>

        {/* Output Freeze & Church Brand Logo Direct Controls */}
        <div className='grid grid-cols-2 gap-1.5'>
          <button
            type='button'
            disabled={disabled}
            onClick={() => onDispatch("freeze_output")}
            title='Freeze current sanctuary presentation output'
            className='p-1.5 rounded-xl bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-800/40 disabled:opacity-40 text-[11px] text-cyan-300 font-semibold transition-all flex items-center justify-center space-x-1.5 active:scale-95 shadow-sm'
          >
            <Snowflake className='w-3.5 h-3.5 text-cyan-400' />
            <span className='truncate'>Freeze Output</span>
          </button>

          <button
            type='button'
            disabled={disabled}
            onClick={() => onDispatch("show_logo")}
            title='Project Sanctuary Church Logo Screen'
            className='p-1.5 rounded-xl bg-indigo-950/30 hover:bg-indigo-900/40 border border-indigo-800/40 disabled:opacity-40 text-[11px] text-indigo-300 font-semibold transition-all flex items-center justify-center space-x-1.5 active:scale-95 shadow-sm'
          >
            <ImageIcon className='w-3.5 h-3.5 text-indigo-400' />
            <span className='truncate'>Church Logo</span>
          </button>
        </div>

        {/* Active Announcement Clear Action */}
        {activeAnnouncement && onClearAnnouncement && (
          <button
            type='button'
            onClick={onClearAnnouncement}
            className='w-full py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[10px] font-bold flex items-center justify-center space-x-1 transition-all'
          >
            <span>Clear Active Ticker Now</span>
          </button>
        )}
      </div>
    </div>
  );
};
