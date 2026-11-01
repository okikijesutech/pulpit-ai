import React from 'react';
import { FreeShowStateSnapshot } from '@pulpit-ai/shared-types';
import { Monitor, EyeOff, Layers, FileText } from 'lucide-react';

interface LiveOutputPanelProps {
  snapshot: FreeShowStateSnapshot;
}

export const LiveOutputPanel: React.FC<LiveOutputPanelProps> = ({ snapshot }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center space-x-2 text-slate-300">
          <Monitor className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-200">
            Live Presentation Output
          </h2>
        </div>
        {snapshot.isOutputCleared && (
          <span className="flex items-center space-x-1 text-xs px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800">
            <EyeOff className="w-3 h-3" />
            <span>Output Hidden</span>
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between bg-slate-950/80 rounded-lg p-4 border border-slate-800/80">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Show: <strong className="text-slate-200">{snapshot.currentShowId || 'None'}</strong></span>
            </span>
            <span>
              Slide: <strong className="text-indigo-400">{snapshot.currentSlideIndex ?? 0}</strong>
            </span>
          </div>

          <div className="mt-4 p-4 rounded bg-slate-900/90 border border-slate-800 text-center min-h-[120px] flex items-center justify-center">
            {snapshot.connected ? (
              <p className="text-base font-serif text-slate-100 italic leading-relaxed">
                "{snapshot.currentSlideText || 'No active text projecting'}"
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Connect to FreeShow on localhost:5505 to view live screen text.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
          <span>Telemetry Source: FreeShow Socket.io</span>
          <span>Heartbeat: {snapshot.lastHeartbeat ? new Date(snapshot.lastHeartbeat).toLocaleTimeString() : 'N/A'}</span>
        </div>
      </div>
    </div>
  );
};
