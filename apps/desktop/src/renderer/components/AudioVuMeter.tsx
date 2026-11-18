import React from 'react';
import { useAudioStore } from '../stores/audioStore.js';

interface AudioVuMeterProps {
  isMuted: boolean;
}

const VU_SEGMENTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/**
 * Isolated memoized leaf component for high-frequency (30-60Hz) audio telemetry.
 * Subscribing inside this leaf prevents Header.tsx from re-rendering on every PCM level tick.
 */
export const AudioVuMeter: React.FC<AudioVuMeterProps> = React.memo(({ isMuted }) => {
  const audioLevel = useAudioStore((s) => s.audioLevel);

  const isOff = audioLevel.state === 'disconnected';
  const muted = isMuted || audioLevel.state === 'muted';
  const isSilent =
    !isOff &&
    !muted &&
    (audioLevel.state === 'silent' || audioLevel.isSilent || audioLevel.decibels <= -60);

  let activeSegments = 0;
  if (!isOff && !muted && !isSilent) {
    if (audioLevel.isClipping || audioLevel.decibels >= -2) {
      activeSegments = 10;
    } else if (audioLevel.decibels >= -6) {
      activeSegments = 9;
    } else if (audioLevel.decibels >= -12) {
      activeSegments = 8;
    } else if (audioLevel.decibels >= -18) {
      activeSegments = 7;
    } else if (audioLevel.decibels >= -24) {
      activeSegments = 6;
    } else if (audioLevel.decibels >= -30) {
      activeSegments = 5;
    } else if (audioLevel.decibels >= -36) {
      activeSegments = 4;
    } else if (audioLevel.decibels >= -42) {
      activeSegments = 3;
    } else if (audioLevel.decibels >= -48) {
      activeSegments = 2;
    } else {
      activeSegments = 1;
    }
  }

  return (
    <div className="flex items-center space-x-1.5">
      {/* 10-Segment LED Meter Bar */}
      <div className="flex items-center gap-[2px] h-3 px-1 py-[2px] bg-slate-950 rounded border border-slate-800">
        {VU_SEGMENTS.map((seg) => {
          const isActive = seg <= activeSegments;
          let colorClass = 'bg-slate-800';
          if (isActive) {
            if (seg <= 6) {
              colorClass = 'bg-emerald-500 shadow-[0_0_3px_rgba(16,185,129,0.8)]';
            } else if (seg <= 8) {
              colorClass = 'bg-amber-400 shadow-[0_0_3px_rgba(251,191,36,0.8)]';
            } else {
              colorClass = 'bg-rose-500 shadow-[0_0_3px_rgba(244,63,94,0.9)]';
            }
          }
          return (
            <div
              key={seg}
              className={`w-[3px] h-full rounded-[1px] transition-colors duration-75 ${colorClass}`}
            />
          );
        })}
      </div>

      {/* Decibel Display */}
      <span className="text-[10px] font-mono font-semibold w-7 text-right">
        {isOff ? (
          <span className="text-rose-400 font-bold">OFF</span>
        ) : muted ? (
          <span className="text-amber-400 font-bold">MUT</span>
        ) : isSilent ? (
          <span className="text-slate-500">SIL</span>
        ) : (
          <span
            className={
              audioLevel.decibels >= -6
                ? 'text-rose-400 font-bold'
                : audioLevel.decibels >= -18
                  ? 'text-amber-300 font-bold'
                  : 'text-emerald-400'
            }
          >
            {audioLevel.decibels}
          </span>
        )}
      </span>
    </div>
  );
});

AudioVuMeter.displayName = 'AudioVuMeter';
