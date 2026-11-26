import React, { useState, useEffect } from 'react';
import { ActiveSlideContent } from '@pulpit-ai/shared-types';
import { Clock, Radio, AlertCircle } from 'lucide-react';

export const NativeFoldbackScreen: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState<ActiveSlideContent | null>(null);
  const [isCleared, setIsCleared] = useState(false);
  const [stageMessage, setStageMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (window.pulpitAPI && typeof (window.pulpitAPI as any).onNativeSlideRender === 'function') {
      const unsubSlide = (window.pulpitAPI as any).onNativeSlideRender((payload: { slide: ActiveSlideContent | null; isCleared: boolean }) => {
        setActiveSlide(payload.slide);
        setIsCleared(payload.isCleared);
      });

      const unsubOverlay = (window.pulpitAPI as any).onNativeOverlayRender((data: Record<string, unknown> | null) => {
        if (data && typeof data.stageMessage === 'string') {
          setStageMessage(data.stageMessage);
        } else {
          setStageMessage(null);
        }
      });

      return () => {
        unsubSlide();
        unsubOverlay();
      };
    }
  }, []);

  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col justify-between p-6 select-none overflow-hidden font-sans">
      {/* Top Confidence Bar: Clock & Live Telemetry */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 px-3 py-1 rounded bg-red-950 text-red-400 border border-red-800 text-xs font-bold uppercase tracking-wider animate-pulse">
            <Radio className="w-3.5 h-3.5" />
            <span>STAGE CONFIDENCE</span>
          </span>
          {activeSlide?.headerTitle && (
            <span className="text-xl font-bold text-amber-400 font-mono">
              {activeSlide.headerTitle}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-2xl font-bold font-mono text-zinc-300">
            <Clock className="w-5 h-5 text-indigo-400" />
            <span>{currentTime}</span>
          </div>
        </div>
      </div>

      {/* Private Stage Alert Message Banner (if engaged by operator) */}
      {stageMessage && (
        <div className="bg-amber-500 text-slate-950 px-6 py-3 rounded-xl font-extrabold text-2xl flex items-center justify-center space-x-3 shadow-2xl animate-bounce">
          <AlertCircle className="w-8 h-8 text-slate-950" />
          <span>{stageMessage.toUpperCase()}</span>
        </div>
      )}

      {/* Main Reading Canvas: Large High-Contrast Yellow/White Text for Pastor & Choir */}
      <div className="flex-1 flex items-center justify-center my-4 px-6">
        {isCleared || !activeSlide ? (
          <div className="text-zinc-600 text-3xl font-bold uppercase tracking-widest">
            [ Output Blanked / Standby ]
          </div>
        ) : (
          <p className="text-4xl md:text-5xl lg:text-6xl font-bold text-yellow-300 leading-snug text-center max-w-5xl">
            {activeSlide.primaryBody}
          </p>
        )}
      </div>

      {/* Bottom Confidence Tray */}
      <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-sm text-zinc-400 font-mono">
        <span>{activeSlide?.citationSubtext || 'Pulpit AI Stage Foldback'}</span>
        <span className="text-emerald-400 font-bold">Pastor & Choir Foldback Active</span>
      </div>
    </div>
  );
};
