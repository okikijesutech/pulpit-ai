import React, { useState, useEffect, useMemo } from 'react';
import { ActiveSlideContent } from '@pulpit-ai/shared-types';
import { BookOpen, ShieldCheck } from 'lucide-react';

export const NativeProjectorScreen: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState<ActiveSlideContent | null>(null);
  const [isCleared, setIsCleared] = useState(false);
  const [overlay, setOverlay] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    // Listen for live slide render dispatch from Electron Main Process
    if (window.pulpitAPI && typeof (window.pulpitAPI as any).onNativeSlideRender === 'function') {
      const unsubSlide = (window.pulpitAPI as any).onNativeSlideRender((payload: { slide: ActiveSlideContent | null; isCleared: boolean }) => {
        setActiveSlide(payload.slide);
        setIsCleared(payload.isCleared);
      });

      const unsubOverlay = (window.pulpitAPI as any).onNativeOverlayRender((data: Record<string, unknown> | null) => {
        setOverlay(data);
      });

      return () => {
        unsubSlide();
        unsubOverlay();
      };
    }
  }, []);

  // Keyboard shortcut listener inside projector window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'b' || e.key === 'B') {
        setIsCleared((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dynamic Single-Slide Font Auto-Scaling Calculation
  const optimalFontSizeClass = useMemo(() => {
    if (!activeSlide?.primaryBody) return 'text-4xl';
    const len = activeSlide.primaryBody.length;
    if (len < 60) return 'text-5xl sm:text-6xl md:text-7xl leading-tight';
    if (len < 140) return 'text-4xl sm:text-5xl md:text-6xl leading-snug';
    if (len < 260) return 'text-3xl sm:text-4xl md:text-5xl leading-relaxed';
    if (len < 400) return 'text-2xl sm:text-3xl md:text-4xl leading-relaxed';
    return 'text-xl sm:text-2xl md:text-3xl leading-relaxed';
  }, [activeSlide?.primaryBody]);

  if (isCleared || !activeSlide) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center select-none overflow-hidden cursor-none">
        {/* Pitch-black blackout state */}
      </div>
    );
  }

  if (activeSlide.category === 'logo') {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center select-none overflow-hidden p-8 animate-in fade-in duration-300">
        <div className="w-32 h-32 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shadow-2xl mb-6">
          <ShieldCheck className="w-16 h-16 text-indigo-400" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-wider text-slate-100 uppercase">
          {activeSlide.headerTitle || 'Welcome to Worship'}
        </h1>
        <p className="text-lg text-slate-400 mt-2 font-medium">Pulpit AI Sanctuary Presentation</p>
      </div>
    );
  }

  return (
    <div
      className="w-screen h-screen bg-[#070A12] text-white flex flex-col justify-between p-8 sm:p-12 md:p-16 select-none overflow-hidden relative cursor-default"
      style={{
        backgroundColor: activeSlide.theme?.backgroundValue || '#070A12'
      }}
    >
      {/* Top Header Citation Badge */}
      <div className="flex items-center justify-between z-10">
        {activeSlide.headerTitle && (
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/40 shadow-lg">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-bold tracking-wider text-indigo-200 uppercase font-mono">
              {activeSlide.headerTitle}
            </span>
          </div>
        )}

        {activeSlide.citationSubtext && (
          <span className="text-xs font-semibold tracking-widest uppercase text-slate-400 font-mono">
            {activeSlide.citationSubtext}
          </span>
        )}
      </div>

      {/* Center Slide Body with Dynamic Single-Slide Auto-Scaling */}
      <div className="flex-1 flex items-center justify-center my-6 z-10 max-w-6xl mx-auto text-center px-4">
        <p
          className={`font-semibold tracking-normal text-slate-100 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] ${optimalFontSizeClass}`}
          style={{
            color: activeSlide.theme?.textColor || '#F8FAFC'
          }}
        >
          {activeSlide.primaryBody}
        </p>
      </div>

      {/* Bottom Footer or Active Overlay Lower Third */}
      <div className="flex items-center justify-between text-xs text-slate-500 z-10">
        <span>Sanctuary Output</span>
        {overlay && typeof overlay.text === 'string' && (
          <div className="px-6 py-2 rounded-xl bg-amber-950/90 border border-amber-500/60 text-amber-200 text-sm font-bold shadow-2xl animate-in slide-in-from-bottom duration-200">
            {overlay.text}
          </div>
        )}
        <span className="font-mono">Pulpit AI Native</span>
      </div>
    </div>
  );
};
